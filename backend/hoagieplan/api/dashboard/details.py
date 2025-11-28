from django.http import JsonResponse
from rest_framework.decorators import api_view

from hoagieplan.models import (
    Course,
    CourseComments,
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

    # Extract course GUID suffix
    course_guid_suffix = course.guid[4:]

    # Get comments
    comments = CourseComments.objects.filter(course_guid__endswith=course_guid_suffix)

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
        Course.objects
        .filter(department=department, catalog_number=str(num))
        .filter(quality_of_course__isnull=False) # Extract only courses with non-null rating
        .order_by("course_id", "-guid").first()
    )

    if evaluation and evaluation.quality_of_course:
        result["rating"] = evaluation.quality_of_course

    return result


def get_course_info(crosslistings):
    """Retrieve detailed course information."""
    try:
        course = (
            Course.objects.select_related("department").filter(crosslistings__icontains=crosslistings).latest("guid")
        )
    except Course.DoesNotExist:
        return None

    course_dict = {}

    # Add title of course
    title = getattr(course, "title", None)
    if title:
        course_dict["Title"] = title
    
    # Add instructors with Section model
    sections = Section.objects.filter(course=course).select_related("instructor")
    instructor_names = [
        section.instructor.full_name
        for section in sections
        ]
    # Check for duplicates of instructors and remove when necessary
    hasSeen = set()
    instructor_hasSeen = []
    for name in instructor_names:
        if name not in hasSeen:
            hasSeen.add(name)
            instructor_hasSeen.append(name)

    if instructor_hasSeen:
        course_dict["Instructors"] = ", ".join(instructor_hasSeen)

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
    course_id = course.guid[4:]
    term = course.guid[:4]
    registrar_link = f"https://registrar.princeton.edu/course-offerings/course-details?term={term}&courseid={course_id}"

    course_dict["Registrar"] = registrar_link

    # Handle reading list specially due to cleaning requirements
    if course.reading_list:
        reading_list = course.reading_list.replace("//", ", by ").replace(";", "; ")
        course_dict["Reading List"] = reading_list

    # Add reading/writing assignments if they exist
    if course.reading_writing_assignment:
        course_dict["Reading / Writing Assignments"] = course.reading_writing_assignment

    
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