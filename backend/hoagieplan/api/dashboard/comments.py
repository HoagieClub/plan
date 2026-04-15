from django.http import JsonResponse
from rest_framework.decorators import api_view

from hoagieplan.models import Course, CourseComment, CourseEvalSummary, Department


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
