from collections import defaultdict
from datetime import datetime

from django.http import JsonResponse
from rest_framework.decorators import api_view

from hoagieplan.models import (
    AcademicTerm,
    ClassMeeting,
    Course,
    CourseComment,
    CourseEvalSummary,
    Department,
    GradingInfo,
    Section,
)


def clean_comment(comment):
    """Clean a single comment string."""
    if not (2 <= len(comment) <= 2000):
        return None

    comment = comment.replace('\\"', '"')
    comment = comment.replace("it?s", "it's")
    comment = comment.replace("?s", "'s")
    comment = comment.replace("?r", "'r")

    # Remove surrounding brackets if present
    if comment[0] == "[" and comment[-1] == "]":
        comment = comment[1:-1]

    return comment


def get_course_comments(dept, num, term_code=None):
    """Retrieve and process course comments, optionally filtered by term_code."""
    department = Department.objects.filter(code=dept).first()
    if not department:
        return None

    course_qs = Course.objects.filter(department=department, catalog_number=str(num))
    if term_code:
        course_qs = course_qs.filter(guid__startswith=term_code)
    course = course_qs.first()
    if not course:
        return None

    comments = CourseComment.objects.filter(course=course)

    cleaned_comments = []
    for comment_obj in comments:
        cleaned = clean_comment(comment_obj.comment)
        if cleaned:
            cleaned_comments.append(cleaned)

    cleaned_comments = list(dict.fromkeys(cleaned_comments))

    result = {"reviews": cleaned_comments}

    evaluation = (
        Course.objects.filter(department=department, catalog_number=str(num))
        .filter(quality_of_course__isnull=False)
        .order_by("course_id", "-guid")
        .first()
    )
    if evaluation and evaluation.quality_of_course:
        result["rating"] = evaluation.quality_of_course

    summary = CourseEvalSummary.objects.filter(course=course).first()
    if summary:
        result["summary"] = summary.summary

    return result


def _build_course_setup_from_data(sections, meetings_by_section: dict) -> list:
    """
    Build a course_setup list from a plain list of Section objects
    and a pre-fetched {section_id: [ClassMeeting, ...]} dict.

    Replaces the old _build_course_setup() that issued a fresh ClassMeeting
    query on every call.
    """
    course_setup_dict = {}
    for section in sections:
        class_type = section.class_type
        total_duration = 0
        meeting_count = 0
        for meeting in meetings_by_section.get(section.id, []):
            if meeting.start_time and meeting.end_time:
                start = datetime.combine(datetime.today(), meeting.start_time)
                end = datetime.combine(datetime.today(), meeting.end_time)
                total_duration += int((end - start).total_seconds() / 60)
                meeting_count += 1
        if class_type not in course_setup_dict and total_duration > 0:
            course_setup_dict[class_type] = {"count": meeting_count, "duration": total_duration}

    return [
        {"class_type": ct, "count": info["count"], "duration": info["duration"]}
        for ct, info in course_setup_dict.items()
    ]


def _build_course_setup(sections_qs) -> list:
    """
    Build a course_setup list from a Section queryset for a single term.
    Used by get_course_info() for the latest-term snapshot only.
    """
    section_ids = list(sections_qs.values_list("id", flat=True))
    meetings = ClassMeeting.objects.filter(section_id__in=section_ids).select_related("section")

    meetings_by_section: dict = defaultdict(list)
    for m in meetings:
        meetings_by_section[m.section_id].append(m)

    return _build_course_setup_from_data(list(sections_qs), meetings_by_section)


def _suffix_to_label(suffix: str, term_code: str) -> str:
    """Convert an AcademicTerm suffix (e.g. 'S2026') to a human label ('Spring 2026')."""
    if not suffix:
        return term_code
    if suffix.startswith("S"):
        return f"Spring {suffix[1:]}"
    if suffix.startswith("F"):
        return f"Fall {suffix[1:]}"
    return suffix


def _build_terms_list(crosslistings: str) -> list:
    """
    Return a list of per-term dicts for all historical offerings of a course.

    Previous version issued:
      • 1 Section query per term  (N queries, loop body ignored sections_by_course)
      • 1 ClassMeeting query per term  (N queries, inside _build_course_setup)
      • 1 AcademicTerm query per term  (N queries, inside _term_label)

    This version issues exactly 4 queries total regardless of how many terms exist.
    """
    all_term_courses = (
        Course.objects.filter(crosslistings__icontains=crosslistings).prefetch_related("instructors").order_by("-guid")
    )

    course_ids = list(all_term_courses.values_list("id", flat=True))

    # ── 1 query: all sections for every historical offering ──────────────────
    all_sections = Section.objects.filter(course_id__in=course_ids)
    sections_by_course: dict = defaultdict(list)
    all_section_ids = []
    for s in all_sections:
        sections_by_course[s.course_id].append(s)
        all_section_ids.append(s.id)

    # ── 1 query: all meetings for every section ───────────────────────────────
    all_meetings = ClassMeeting.objects.filter(section_id__in=all_section_ids)
    meetings_by_section: dict = defaultdict(list)
    for m in all_meetings:
        meetings_by_section[m.section_id].append(m)

    # ── 1 query: all term labels at once ─────────────────────────────────────
    term_codes = {c.guid[:4] for c in all_term_courses if c.guid}
    term_suffix_map: dict = dict(
        AcademicTerm.objects.filter(term_code__in=term_codes).values_list("term_code", "suffix")
    )

    # ── Build result list (no DB calls inside the loop) ───────────────────────
    terms = []
    seen_term_codes: set = set()
    for course in all_term_courses:
        if not course.guid:
            continue
        term_code = course.guid[:4]
        if term_code in seen_term_codes:
            continue
        seen_term_codes.add(term_code)

        instructor_names = [i.full_name for i in course.instructors.all() if i.full_name]
        course_sections = sections_by_course[course.id]
        course_setup = _build_course_setup_from_data(course_sections, meetings_by_section)
        label = _suffix_to_label(term_suffix_map.get(term_code, ""), term_code)

        terms.append(
            {
                "term_code": term_code,
                "label": label,
                "instructors": instructor_names,
                "quality_of_course": course.quality_of_course,
                "course_setup": course_setup,
            }
        )

    return terms


def get_course_info(crosslistings):
    """Retrieve detailed course information."""
    try:
        course = (
            Course.objects.select_related("department")
            .prefetch_related("instructors")
            .filter(crosslistings__icontains=crosslistings)
            .latest("guid")
        )
    except Course.DoesNotExist:
        return None

    course_dict = {}

    title = getattr(course, "title", None)
    if title:
        course_dict["Title"] = title

    instructors = course.instructors.all()
    instructor_names = [i.full_name for i in instructors if i.full_name]
    if instructor_names:
        course_dict["Instructors"] = ", ".join(instructor_names)

    all_sections = Section.objects.filter(course=course).select_related("term")

    field_mapping = {
        "description": "Description",
        "distribution_area_short": "Distribution Area",
        "grading_basis": "Grading Basis",
    }
    for field, display_name in field_mapping.items():
        if value := getattr(course, field):
            course_dict[display_name] = value

    if course.guid:
        course_id = course.guid[4:]
        term = course.guid[:4]
        course_dict["Registrar"] = (
            f"https://registrar.princeton.edu/course-offerings/course-details?term={term}&courseid={course_id}"
        )

    GRADING_LABELS = {
        "grading_final_exam": "Final Exam",
        "grading_mid_exam": "Midterm Exam",
        "grading_home_final_exam": "Home Final Exam",
        "grading_home_mid_exam": "Home Midterm Exam",
        "grading_paper_final_exam": "Paper in lieu of final",
        "grading_paper_mid_exam": "Paper in lieu of midterm",
        "grading_other_exam": "Other Exam",
        "grading_oral_pres": "Oral Presentation",
        "grading_quizzes": "Quizzes",
        "grading_lab_reports": "Lab Reports",
        "grading_papers": "Papers",
        "grading_prob_sets": "Problem Sets",
        "grading_prog_assign": "Programming Assignments",
        "grading_precept_part": "Class/precept participation",
        "grading_term_papers": "Term Papers",
        "grading_design_projects": "Design Projects",
        "grading_other": "Other",
    }
    try:
        grading_info = course.grading_info
        grading_breakdown = [
            {"label": label, "percent": getattr(grading_info, field)}
            for field, label in GRADING_LABELS.items()
            if getattr(grading_info, field, 0)
        ]
        if grading_breakdown:
            course_dict["Grading"] = grading_breakdown
    except GradingInfo.DoesNotExist:
        pass

    if course.reading_list:
        course_dict["Reading List"] = course.reading_list.replace("//", ", by ").replace(";", "; ")

    if course.reading_writing_assignment:
        course_dict["Reading / Writing Assignments"] = course.reading_writing_assignment

    # Semester availability
    all_guids = Course.objects.filter(crosslistings__icontains=crosslistings).values_list("guid", flat=True)
    has_fall = False
    has_spring = False
    for guid in all_guids:
        if guid and len(guid) >= 4:
            term_suffix = guid[3]
            if term_suffix == "2":
                has_fall = True
            if term_suffix == "4":
                has_spring = True
    if has_fall and has_spring:
        course_dict["Semester Availability"] = "Both"
    elif has_fall:
        course_dict["Semester Availability"] = "Fall"
    elif has_spring:
        course_dict["Semester Availability"] = "Spring"

    # Latest-term course_setup (one extra query pair, but only for the single latest term)
    latest_term_section = all_sections.order_by("-term__term_code").first()
    if latest_term_section:
        if latest_term_section.term:
            course_dict["Term"] = latest_term_section.term.suffix
        latest_term_sections = all_sections.filter(term=latest_term_section.term)
        course_setup = _build_course_setup(latest_term_sections)
        if course_setup:
            course_dict["course_setup"] = course_setup

    # Per-term history (now uses bulk queries)
    course_dict["terms"] = _build_terms_list(crosslistings)

    return course_dict


@api_view(["GET"])
def course_details(request):
    """API endpoint for course details."""
    crosslistings = request.GET.get("crosslistings")
    if not crosslistings:
        return JsonResponse({"error": "Missing crosslistings parameter"}, status=400)

    course_info = get_course_info(crosslistings)
    if course_info is None:
        return JsonResponse({"error": "Course not found"}, status=404)

    return JsonResponse(course_info)


@api_view(["GET"])
def course_comments_view(request):
    """API endpoint for course comments."""
    dept = request.GET.get("dept")
    num = request.GET.get("coursenum")
    term_code = request.GET.get("term_code")

    if not (dept and num):
        return JsonResponse({"error": "Missing department or course number"}, status=400)

    comments = get_course_comments(dept, num, term_code)
    if comments is None:
        return JsonResponse({"error": "Course not found"}, status=404)

    return JsonResponse(comments)
