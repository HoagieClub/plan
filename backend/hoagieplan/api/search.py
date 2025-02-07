import time
from re import IGNORECASE, compile, split, sub

from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from hoagieplan.logger import logger
from hoagieplan.models import (
    Course,
)
from hoagieplan.serializers import (
    CourseSerializer,
)

DEPT_NUM_SUFFIX_REGEX = compile(r"^[a-zA-Z]{3}\d{3}[a-zA-Z]$", IGNORECASE)
DEPT_NUM_REGEX = compile(r"^[a-zA-Z]{3}\d{1,4}$", IGNORECASE)
DEPT_ONLY_REGEX = compile(r"^[a-zA-Z]{1,3}$", IGNORECASE)
NUM_SUFFIX_ONLY_REGEX = compile(r"^\d{3}[a-zA-Z]$", IGNORECASE)
NUM_ONLY_REGEX = compile(r"^\d{1,4}$", IGNORECASE)
GRADING_OPTIONS = {
    "A-F": ["FUL", "GRD", "NAU", "NPD"],
    "P/D/F": ["PDF", "FUL", "NAU"],
    "Audit": ["FUL", "PDF", "ARC", "NGR", "NOT", "NPD", "YR"],
}


def make_sort_key(dept):
    def sort_key(course):
        crosslistings = course["crosslistings"]
        if len(dept) >= 3:
            start_index = crosslistings.lower().find(dept.lower())
            if start_index != -1:
                return crosslistings[start_index:]
        return crosslistings

    return sort_key


@require_GET
def search_courses(request):
    """Handle search queries for courses."""
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    query = request.GET.get("course", None)
    term = request.GET.get("term", None)
    distribution = request.GET.get("distribution", None)
    levels = request.GET.get("level")
    grading_options = request.GET.get("grading")

    if not query:
        return JsonResponse({"courses": []})

    init_time = time.time()
    # process queries
    trimmed_query = sub(r"\s", "", query)
    if DEPT_NUM_SUFFIX_REGEX.match(trimmed_query):
        result = split(r"(\d+[a-zA-Z])", string=trimmed_query, maxsplit=1)
        dept = result[0]
        num = result[1]
        search_key = dept + " " + num
    elif DEPT_NUM_REGEX.match(trimmed_query):
        result = split(r"(\d+)", string=trimmed_query, maxsplit=1)
        dept = result[0]
        num = result[1]
        search_key = dept + " " + num
    elif NUM_ONLY_REGEX.match(trimmed_query) or NUM_SUFFIX_ONLY_REGEX.match(trimmed_query):
        dept = ""
        num = trimmed_query
        search_key = num
    elif len(trimmed_query) > 0:
        dept = trimmed_query
        num = ""
        search_key = dept
    else:
        return JsonResponse({"courses": []})

    query_conditions = Q()

    if term:
        query_conditions &= Q(guid__startswith=term)

    if distribution:
        query_conditions &= Q(distribution_area_short__icontains=distribution)

    if levels:
        levels = levels.split(",")
        level_query = Q()
        for level in levels:
            level_query |= Q(catalog_number__startswith=level)
        query_conditions &= level_query

    if grading_options:
        grading_options = grading_options.split(",")
        grading_filters = []
        for grading in grading_options:
            grading_filters += GRADING_OPTIONS[grading]
        grading_query = Q()
        for grading in grading_filters:
            grading_query |= Q(grading_basis__iexact=grading)
        query_conditions &= grading_query

    try:
        filtered_query = query_conditions
        filtered_query &= Q(department__code__iexact=dept)
        filtered_query &= Q(catalog_number__iexact=num)
        exact_match_course = (
            Course.objects.select_related("department")
            .filter(filtered_query)
            .order_by("course_id", "-guid")
            .distinct("course_id")
        )
        if exact_match_course:
            # If an exact match is found, return only that course
            serialized_course = CourseSerializer(exact_match_course, many=True)
            return JsonResponse({"courses": serialized_course.data})

        filtered_query = query_conditions
        if len(search_key) > 3:
            filtered_query &= Q(crosslistings__icontains=search_key) | Q(title__icontains=query)
        else:
            filtered_query &= Q(crosslistings__icontains=search_key)
        courses = (
            Course.objects.select_related("department")
            .filter(filtered_query)
            .order_by("course_id", "-guid")
            .distinct("course_id")
        )
        if courses:
            serialized_courses = CourseSerializer(courses, many=True)
            sorted_data = sorted(serialized_courses.data, key=make_sort_key(dept))
            print(f"Search time: {time.time() - init_time}")
            return JsonResponse({"courses": sorted_data})
        return JsonResponse({"courses": []})
    except Exception as e:
        logger.error(f"An error occurred while searching for courses: {e}")
        return JsonResponse({"error": "Internal Server Error"}, status=500)
