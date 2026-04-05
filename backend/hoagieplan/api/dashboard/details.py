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


def get_course_comments(dept, num):
    """Retrieve and process course comments."""
    # Get department or return None
    department = Department.objects.filter(code=dept).first()
    if not department:
        return None

    # Get course or return None
    course = Course.objects.filter(department=department, catalog_number=str(num)).first()
    if not course:
        return None

    # Get comments
    comments = CourseComment.objects.filter(course=course)

    # Process comments
    cleaned_comments = []
    for comment_obj in comments:
        cleaned = clean_comment(comment_obj.comment)
        if cleaned:
            cleaned_comments.append(cleaned)

    # Remove duplicates while preserving order
    cleaned_comments = list(dict.fromkeys(cleaned_comments))

    # Build result dictionary
    result = {"reviews": cleaned_comments}

    # Try to get course evaluation
    evaluation = (
        Course.objects.filter(department=department, catalog_number=str(num))
        .filter(quality_of_course__isnull=False)  # Extract only courses with non-null rating
        .order_by("course_id", "-guid")
        .first()
    )

    if evaluation and evaluation.quality_of_course:
        result["rating"] = evaluation.quality_of_course
    
    summary = CourseEvalSummary.objects.filter(course=course).first()
    if summary:
        result["summary"] = summary.summary

    return result


def _term_label(term_code: str) -> str:
    """Convert a 4-digit term code (e.g. '1264') to a human label ('Spring 2026')."""
    suffix = AcademicTerm.objects.filter(term_code=term_code).values_list("suffix", flat=True).first()
    if not suffix:
        return term_code
    if suffix.startswith("S"):
        season = "Spring"
    elif suffix.startswith("F"):
        season = "Fall"
    else:
        season = suffix[:1]
    year = suffix[1:]
    return f"{season} {year}"


def _build_course_setup(sections_qs) -> list:
    """Build a course_setup list from a Section queryset for a single term."""
    section_ids = list(sections_qs.values_list("id", flat=True))
    meetings = ClassMeeting.objects.filter(section_id__in=section_ids).select_related("section")

    # Group meetings by section
    meetings_by_section = defaultdict(list)
    for m in meetings:
        meetings_by_section[m.section_id].append(m)

    course_setup_dict = {}
    for section in sections_qs:
        class_type = section.class_type
        total_duration = 0
        meeting_count = 0
        for meeting in meetings_by_section[section.id]:
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


def _build_terms_list(crosslistings: str) -> list:
    """Return a list of per-term dicts for all historical offerings of a course."""
    all_term_courses = (
        Course.objects.filter(crosslistings__icontains=crosslistings)
        .prefetch_related("instructors")
        .order_by("-guid")
    )

    # Bulk-fetch all sections for these courses
    course_ids = list(all_term_courses.values_list("id", flat=True))
    all_sections = (
        Section.objects.filter(course_id__in=course_ids)
        .select_related("term")
    )
    sections_by_course = defaultdict(list)
    for s in all_sections:
        sections_by_course[s.course_id].append(s)

    terms = []
    seen_term_codes = set()
    for course in all_term_courses:
        if not course.guid:
            continue
        term_code = course.guid[:4]
        if term_code in seen_term_codes:
            continue
        seen_term_codes.add(term_code)

        instructor_names = [i.full_name for i in course.instructors.all() if i.full_name]

        from django.db.models.query import QuerySet
        course_sections = sections_by_course[course.id]
        # Wrap in a queryset-like iterable for _build_course_setup; pass list directly
        # _build_course_setup expects a queryset (needs .values_list), so query fresh but cheaply
        term_sections_qs = Section.objects.filter(course=course)
        course_setup = _build_course_setup(term_sections_qs)

        terms.append({
            "term_code": term_code,
            "label": _term_label(term_code),
            "instructors": instructor_names,
            "quality_of_course": course.quality_of_course,
            "course_setup": course_setup,
        })

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

    # Add title of course
    title = getattr(course, "title", None)
    if title:
        course_dict["Title"] = title

    # Add instructors from Course M2M
    instructors = course.instructors.all()
    instructor_names = [i.full_name for i in instructors if i.full_name]
    if instructor_names:
        course_dict["Instructors"] = ", ".join(instructor_names)

    # Get all sections for this course
    all_sections = Section.objects.filter(course=course).select_related("term")

    # Map fields to their display names
    field_mapping = {
        "description": "Description",
        "distribution_area_short": "Distribution Area",
        "grading_basis": "Grading Basis",
    }

    # Add basic fields if they exist
    for field, display_name in field_mapping.items():
        if value := getattr(course, field):
            course_dict[display_name] = value

    # Add registrar link
    if course.guid:
        course_id = course.guid[4:]
        term = course.guid[:4]
        registrar_link = (
            f"https://registrar.princeton.edu/course-offerings/course-details?term={term}&courseid={course_id}"
        )
        course_dict["Registrar"] = registrar_link

    # Handle reading list specially due to cleaning requirements
    if course.reading_list:
        reading_list = course.reading_list.replace("//", ", by ").replace(";", "; ")
        course_dict["Reading List"] = reading_list

    # Add reading/writing assignments if they exist
    if course.reading_writing_assignment:
        course_dict["Reading / Writing Assignments"] = course.reading_writing_assignment

    # === Semester Availability ===
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

    # === Course Setup (latest term, kept for backward compat) ===
    latest_term_section = all_sections.order_by("-term__term_code").first()
    if latest_term_section:
        if latest_term_section.term:
            course_dict["Term"] = latest_term_section.term.suffix
        latest_term_sections = all_sections.filter(term=latest_term_section.term)
        course_setup = _build_course_setup(latest_term_sections)
        if course_setup:
            course_dict["course_setup"] = course_setup

    # === Per-term history ===
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

    if not (dept and num):
        return JsonResponse({"error": "Missing department or course number"}, status=400)

    comments = get_course_comments(dept, num)
    if comments is None:
        return JsonResponse({"error": "Course not found"}, status=404)

    return JsonResponse(comments)


@api_view(["GET"])
def course_terms(request):
    """API endpoint for course terms."""
    course_id = request.GET.get("course_id", "")
    if not course_id:
        return JsonResponse({"error": "Missing course_id parameter"}, status=400)
    guids = (
        Course.objects.filter(course_id=course_id)
        .values_list("guid", flat=True)
        .order_by("-guid")
    )
    terms = [guid[:4] for guid in guids if guid] 
    return JsonResponse({"terms": terms})


