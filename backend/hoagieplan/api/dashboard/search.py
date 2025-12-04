from re import IGNORECASE, compile, split, sub
from datetime import time as dtime

from django.db.models import Q
from django.http import JsonResponse
from rest_framework.decorators import api_view

from hoagieplan.logger import logger
from hoagieplan.models import (
    Course, Section, ClassMeeting
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


def course_fits_time_constraint(course, start_time, end_time, term):
    """ Checks if a course fits within a time constraint
    The course fits iff for every every class_type section it has,
    there is at least one section where all of the class meetings fall
    within the time range"""

    if term:
        sections = Section.objects.filter(course=course,
                                          term__term_code=term).prefetch_related('classmeeting_set')
    else:
        sections = course.section_set.all()

    logger.info(
        f"Checking course: {course.title}, start_time: {start_time}, end_time: {end_time}")
    logger.info(f"  Found {len(sections)} sections for this term")

    if not sections:
        return False

    sections_by_type = {}

    for section in sections:
        class_type = section.class_type or "Unknown"

        if class_type not in sections_by_type:
            sections_by_type[class_type] = []
        sections_by_type[class_type].append(section)

    logger.info(f"  Section types: {list(sections_by_type.keys())}")

    for class_type, type_sections in sections_by_type.items():
        can_fulfill_type = False

        for section in type_sections:

            class_meetings = section.classmeeting_set.all()

            logger.info(
                f"  Section {section.class_section}, type: {class_type}, meetings: {len(class_meetings)}")

            if not class_meetings:
                logger.info(f"    No meetings, skipping section")
                continue

            section_is_valid = True
            for meeting in class_meetings:

                if not meeting.start_time or not meeting.end_time:
                    logger.info(f"    Meeting missing time data")
                    continue
                if meeting.start_time < start_time or meeting.end_time > end_time:
                    logger.info(
                        f"    Meeting outside range [{start_time} - {end_time}")
                    section_is_valid = False
                    break
                logger.info(
                    f"    Meeting okay! [{meeting.start_time} - {meeting.end_time}")

            if section_is_valid:
                logger.info(f"    Section {section.class_section} is VALID!")
                can_fulfill_type = True
                break

        if not can_fulfill_type:
            logger.info(
                f"  Type {class_type} cannot be fulfilled, course rejected")

            return False
        logger.info(f"  All class types can be fulfilled, course ACCEPTED")
    return True


@api_view(["GET"])
def search_courses(request):
    """Handle search queries for courses."""
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    query = request.GET.get("course", None)
    term = request.GET.get("term", None)
    distribution = request.GET.get("distribution", None)
    levels = request.GET.get("level")
    grading_options = request.GET.get("grading")
    start_time_str = request.GET.get("start", None)
    end_time_str = request.GET.get("end", None)

    if not query:
        return JsonResponse({"courses": []})

    return search_courses_helper(query, term, distribution, levels, grading_options, start_time_str, end_time_str)


def search_courses_helper(query, term=None, distribution=None, levels=None, grading_options=None, start_time_str=None, end_time_str=None):

    logger.info(
        f"  start: {start_time_str} end:{end_time_str} ")
    # Parse start_time and end_time
    try:
        start_time = dtime.fromisoformat(start_time_str)
    except Exception:
        start_time = dtime(8, 30)

    try:
        end_time = dtime.fromisoformat(end_time_str)
    except Exception:
        end_time = dtime(23, 0)

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
        distributions = distribution.split(",")
        distribution_query = Q()
        for distribution in distributions:
            distribution_query |= Q(
                distribution_area_short__icontains=distribution)
        query_conditions &= distribution_query

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

        # Get courses with ratings (most recent offering with non-null rating)
        exact_match_with_rating = (
            Course.objects.select_related("department")
            .prefetch_related('section_set__classmeeting_set')
            .filter(filtered_query)
            .filter(quality_of_course__isnull=False)
            .order_by("course_id", "-guid")
            .distinct("course_id")
        )

        # Get course_ids that have ratings
        course_ids_with_ratings = set(
            exact_match_with_rating.values_list("course_id", flat=True))

        # Get courses without any rated offerings (most recent offering regardless of rating)
        exact_match_without_rating = (
            Course.objects.select_related("department")
            .prefetch_related('section_set__classmeeting_set')
            .filter(filtered_query)
            .exclude(course_id__in=course_ids_with_ratings)
            .order_by("course_id", "-guid")
            .distinct("course_id")
        )

        # Combine both querysets
        exact_match_course = list(
            exact_match_with_rating) + list(exact_match_without_rating)

        if start_time_str or end_time_str:
            exact_match_course = [course for course in exact_match_course if course_fits_time_constraint(
                course, start_time, end_time, term)]

        if exact_match_course:
            # If an exact match is found, return only that course
            serialized_course = CourseSerializer(exact_match_course, many=True)
            return JsonResponse({"courses": serialized_course.data})

        filtered_query = query_conditions
        if len(search_key) > 3:
            filtered_query &= Q(crosslistings__icontains=search_key) | Q(
                title__icontains=query)
        else:
            filtered_query &= Q(crosslistings__icontains=search_key)

        # Get courses with ratings (most recent offering with non-null rating)
        courses_with_rating = (
            Course.objects.select_related("department")
            .prefetch_related('section_set__classmeeting_set')
            .filter(filtered_query)
            .filter(quality_of_course__isnull=False)
            .order_by("course_id", "-guid")
            .distinct("course_id")
        )

        # Get course_ids that have ratings
        course_ids_with_ratings = set(
            courses_with_rating.values_list("course_id", flat=True))

        # Get courses without any rated offerings (most recent offering regardless of rating)
        courses_without_rating = (
            Course.objects.select_related("department")
            .prefetch_related('section_set__classmeeting_set')
            .filter(filtered_query)
            .exclude(course_id__in=course_ids_with_ratings)
            .order_by("course_id", "-guid")
            .distinct("course_id")
        )

        # Combine both querysets
        courses = list(courses_with_rating) + list(courses_without_rating)

        # Apply time filtering
        if start_time_str or end_time_str:
            courses = [
                course for course in courses
                if course_fits_time_constraint(course, start_time, end_time, term)
            ]

        if courses:
            serialized_courses = CourseSerializer(courses, many=True)
            sorted_data = sorted(serialized_courses.data,
                                 key=make_sort_key(dept))
            return JsonResponse({"courses": sorted_data})
        return JsonResponse({"courses": []})
    except Exception as e:
        logger.error(f"An error occurred while searching for courses: {e}")
        return JsonResponse({"error": "Internal Server Error"}, status=500)
