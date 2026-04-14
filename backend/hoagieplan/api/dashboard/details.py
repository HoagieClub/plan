from django.http import JsonResponse
from rest_framework.decorators import api_view
from datetime import datetime

from hoagieplan.models import (
    Course,
    CourseComment,
    Department,
    GradingInfo,
    Section,
    ClassMeeting,
    CourseEvalSummary,
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
    
    # Add grading info if available
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

    # Handle reading list specially due to cleaning requirements
    if course.reading_list:
        reading_list = course.reading_list.replace("//", ", by ").replace(";", "; ")
        course_dict["Reading List"] = reading_list

    # Add reading/writing assignments if they exist
    if course.reading_writing_assignment:
        course_dict["Reading / Writing Assignments"] = course.reading_writing_assignment

    # === Semester Availability ===
    all_courses = (
        Course.objects.filter(crosslistings__icontains=crosslistings)
        .values_list("guid", flat=True)
    )
    has_fall = False
    has_spring = False
    for guid in all_courses:
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

    # === NEW: Add Course Setup ===
    # Get the most recent term's sections
    latest_term_section = all_sections.order_by('-term__term_code').first()
    
    if latest_term_section:
        latest_term_sections = all_sections.filter(term=latest_term_section.term)
        
        course_setup_dict = {}

        for section in latest_term_sections:
            class_type = section.class_type
            
            if class_type in course_setup_dict:
                continue
            
            meetings = ClassMeeting.objects.filter(section=section)
            duration = None
            
            for meeting in meetings:
                if meeting.start_time and meeting.end_time:
                    start = datetime.combine(datetime.today(), meeting.start_time)
                    end = datetime.combine(datetime.today(), meeting.end_time)
                    duration = int((end - start).total_seconds() / 60)
                    count = len(meeting.days.split(',')) if meeting.days else 1
                    break

            if duration is not None:
                course_setup_dict[class_type] = {
                    'count': count,
                    'duration': duration
                }

        course_setup = [
            {
                'class_type': class_type,
                'count': info['count'],
                'duration': info['duration']
            }
            for class_type, info in course_setup_dict.items()
        ]

        if course_setup:
            course_dict["course_setup"] = course_setup
        
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
