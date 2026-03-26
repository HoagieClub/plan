from django.http import JsonResponse
from rest_framework.decorators import api_view
from datetime import datetime

from hoagieplan.models import (
    Course,
    CourseComment,
    Department,
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
    
    # Add instructors from Course M2M
    instructors = course.instructors.all()
    instructor_names = [i.full_name for i in instructors if i.full_name]
    if instructor_names:
        course_dict["Instructors"] = ", ".join(instructor_names)

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

    # === NEW: Add Course Setup ===
    # Get the most recent term's sections
    latest_term_section = all_sections.order_by('-term__term_code').first()
    
    if latest_term_section:
        latest_term_sections = all_sections.filter(term=latest_term_section.term)
        
        # Calculate course setup based on meeting times
        course_setup_dict = {}
        
        for section in latest_term_sections:
            class_type = section.class_type
            
            # Get all meetings for this section
            meetings = ClassMeeting.objects.filter(section=section)
            
            # Calculate total weekly duration for this section
            total_duration = 0
            meeting_count = 0
            for meeting in meetings:
                if meeting.start_time and meeting.end_time:
                    start = datetime.combine(datetime.today(), meeting.start_time)
                    end = datetime.combine(datetime.today(), meeting.end_time)
                    duration = int((end - start).total_seconds() / 60)
                    total_duration += duration
                    meeting_count += 1
            
            # If we haven't seen this class type yet, or if this is the first section
            # we're examining, store its total duration
            if class_type not in course_setup_dict and total_duration > 0:
                course_setup_dict[class_type] = {
                    'count': meeting_count,  # Number of meetings per week
                    'duration': total_duration
                }
        
        # Build course setup array
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
