from re import IGNORECASE, compile, split, sub

from django.db.models import Q
from rest_framework import serializers
from rest_framework.decorators import api_view
from rest_framework.response import Response

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


class CourseWithTermsSerializer(CourseSerializer):
	terms = serializers.ListField(child=serializers.CharField())


class SearchResultSerializer(serializers.Serializer):
	courses = CourseWithTermsSerializer(many=True)


def make_sort_key(dept):
	def sort_key(course):
		crosslistings = course["crosslistings"]
		if len(dept) >= 3:
			start_index = crosslistings.lower().find(dept.lower())
			if start_index != -1:
				return crosslistings[start_index:]
		return crosslistings

	return sort_key


def attach_terms(serialized_courses, course_objects):
	"""Bulk-fetch all term codes for the given courses and inject them into the serialized dicts."""
	course_ids = [c.course_id for c in course_objects]
	rows = Course.objects.filter(course_id__in=course_ids).values_list("course_id", "guid").order_by("-guid")
	terms_map: dict[int, list[str]] = {}
	for course_id, guid in rows:
		if guid:
			terms_map.setdefault(course_id, []).append(guid[:4])
	result = []
	for item in serialized_courses:
		item = dict(item)
		item["terms"] = terms_map.get(item["course_id"], [])
		result.append(item)
	return result


@api_view(["GET"])
def search_courses(request):
	"""Handle search queries for courses."""
	if request.method != "GET":
		return Response({"error": "Method not allowed"}, status=405)

	query = request.GET.get("course", None)
	term = request.GET.get("term", None)
	distribution = request.GET.get("distribution", None)
	levels = request.GET.get("level")
	grading_options = request.GET.get("grading")

	if not query:
		return _empty_courses_response()

	return search_courses_helper(query, term, distribution, levels, grading_options)


def search_courses_helper(query, term=None, distribution=None, levels=None, grading_options=None):
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
		return _empty_courses_response()

	query_conditions = Q()

	if term:
		query_conditions &= Q(guid__startswith=term)

	if distribution:
		distributions = distribution.split(",")
		distribution_query = Q()
		for distribution in distributions:
			distribution_query |= Q(distribution_area_short__icontains=distribution)
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
			.prefetch_related("instructors")
			.filter(filtered_query)
			.filter(quality_of_course__isnull=False)
			.order_by("course_id", "-guid")
			.distinct("course_id")
		)

		# Get course_ids that have ratings
		course_ids_with_ratings = set(exact_match_with_rating.values_list("course_id", flat=True))

		# Get courses without any rated offerings (most recent offering regardless of rating)
		exact_match_without_rating = (
			Course.objects.select_related("department")
			.prefetch_related("instructors")
			.filter(filtered_query)
			.exclude(course_id__in=course_ids_with_ratings)
			.order_by("course_id", "-guid")
			.distinct("course_id")
		)

		# Combine both querysets
		exact_match_course = list(exact_match_with_rating) + list(exact_match_without_rating)

		if exact_match_course:
			# If an exact match is found, return only that course
			serialized_course = CourseSerializer(exact_match_course, many=True)
			return _courses_response(attach_terms(serialized_course.data, exact_match_course))

		filtered_query = query_conditions
		if len(search_key) > 3:
			filtered_query &= Q(crosslistings__icontains=search_key) | Q(title__icontains=query)
		else:
			filtered_query &= Q(crosslistings__icontains=search_key)

		# Get courses with ratings (most recent offering with non-null rating)
		courses_with_rating = (
			Course.objects.select_related("department")
			.prefetch_related("instructors")
			.filter(filtered_query)
			.filter(quality_of_course__isnull=False)
			.order_by("course_id", "-guid")
			.distinct("course_id")
		)

		# Get course_ids that have ratings
		course_ids_with_ratings = set(courses_with_rating.values_list("course_id", flat=True))

		# Get courses without any rated offerings (most recent offering regardless of rating)
		courses_without_rating = (
			Course.objects.select_related("department")
			.prefetch_related("instructors")
			.filter(filtered_query)
			.exclude(course_id__in=course_ids_with_ratings)
			.order_by("course_id", "-guid")
			.distinct("course_id")
		)

		# Combine both querysets
		courses = list(courses_with_rating) + list(courses_without_rating)

		if courses:
			serialized_courses = CourseSerializer(courses, many=True)
			with_terms = attach_terms(serialized_courses.data, courses)
			sorted_data = sorted(with_terms, key=make_sort_key(dept))
			return _courses_response(sorted_data)
		return _empty_courses_response()
	except Exception as e:
		logger.error(f"An error occurred while searching for courses: {e}")
		return Response({"error": "Internal Server Error"}, status=500)


def _courses_response(courses_list):
	return Response(SearchResultSerializer({"courses": courses_list}).data)


def _empty_courses_response():
	return _courses_response([])
