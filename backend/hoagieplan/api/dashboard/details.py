from collections import defaultdict
from datetime import datetime
from enum import Enum

from django.http import JsonResponse
from rest_framework import serializers
from rest_framework.decorators import api_view
from rest_framework.response import Response

from hoagieplan.models import (
	AcademicTerm,
	ClassMeeting,
	Course,
	GradingInfo,
	Section,
)
from hoagieplan.utils import get_term, get_term_and_course_id, is_fall_course, is_spring_course, suffix_to_label


class SemesterOffered(str, Enum):
	FALL = "Fall"
	SPRING = "Spring"
	BOTH = "Both"


REGISTRAR_URL = "https://registrar.princeton.edu/course-offerings/course-details"

COURSE_FIELD_LABELS = {
	"title": "title",
	"description": "description",
	"distribution_area_short": "distribution_area",
	"grading_basis": "grading_basis",
	"reading_writing_assignment": "reading_writing_assignments",
}

GRADING_FIELD_LABELS = {
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


class GradingComponentSerializer(serializers.Serializer):
	label = serializers.CharField()
	percent = serializers.IntegerField()


class CourseSetupSerializer(serializers.Serializer):
	class_type = serializers.CharField()
	count = serializers.IntegerField()
	duration = serializers.IntegerField()


class TermSerializer(serializers.Serializer):
	term_code = serializers.CharField()
	label = serializers.CharField()
	instructors = serializers.ListField(child=serializers.CharField())
	quality_of_course = serializers.FloatField(allow_null=True)
	course_setup = CourseSetupSerializer(many=True)


class CourseDetailSerializer(serializers.Serializer):
	title = serializers.CharField(required=False)
	description = serializers.CharField(required=False)
	distribution_area = serializers.CharField(required=False)
	grading_basis = serializers.CharField(required=False)
	reading_writing_assignments = serializers.CharField(required=False)
	reading_list = serializers.CharField(required=False)
	instructors = serializers.ListField(child=serializers.CharField(), required=False)
	registrar = serializers.CharField(required=False)
	grading = GradingComponentSerializer(many=True, required=False)
	semester_availability = serializers.CharField(required=False)
	term = serializers.CharField(required=False)
	course_setup = CourseSetupSerializer(many=True, required=False)
	terms = TermSerializer(many=True)


@api_view(["GET"])
def course_details(request):
	"""Return course detail JSON for a ``crosslistings`` query param."""
	crosslistings = request.GET.get("crosslistings")
	if not crosslistings:
		return JsonResponse({"error": "Missing crosslistings parameter"}, status=400)

	course_info = get_course_info(crosslistings)
	if course_info is None:
		return JsonResponse({"error": "Course not found"}, status=404)

	serializer = CourseDetailSerializer(course_info)
	return Response(serializer.data)


def get_course_info(crosslistings):
	"""Assemble the detail payload for a course's latest offering.

	Collects title, instructors, description, distribution area, grading
	basis, registrar link, grading breakdown, reading list, semester
	availability, latest-term course setup, and per-term history.

	Args:
	    crosslistings: Crosslistings string used to locate the course.

	Returns:
	    Dict of course detail fields, or ``None`` if no course matches.

	"""
	try:
		course = (
			Course.objects.select_related("department")
			.prefetch_related("instructors")
			.filter(crosslistings__icontains=crosslistings)
			.latest("guid")
		)
	except Course.DoesNotExist:
		return None

	# Dictionary to be returned
	course_dict = {}

	# Add fields that are on the Course model
	for field, display_name in COURSE_FIELD_LABELS.items():
		value = getattr(course, field, None)
		if value:
			course_dict[display_name] = value

	# Add course reading list with cleaned formatting
	if course.reading_list:
		course_dict["reading_list"] = course.reading_list.replace("//", ", by ").replace(";", "; ")

	# Add instructors as a comma-separated string
	instructors = course.instructors.all()
	instructor_names = [instructor.full_name for instructor in instructors if instructor.full_name]
	if instructor_names:
		course_dict["instructors"] = instructor_names

	# Add registrar url
	registrar_url = _build_registrar_url(course.guid)
	if registrar_url:
		course_dict["registrar"] = registrar_url

	# Add grading breakdown
	grading_breakdown = _build_grading_breakdown(course)
	if grading_breakdown:
		course_dict["grading"] = grading_breakdown

	# Add semester offered (Both, Fall, Spring)
	semester_offered = _get_semester_offered(crosslistings)
	if semester_offered:
		course_dict["semester_availability"] = semester_offered

	# Latest-term course_setup
	all_sections = Section.objects.filter(course=course).select_related("term")
	latest_term_section = all_sections.order_by("-term__term_code").first()
	if latest_term_section:
		if latest_term_section.term:
			course_dict["term"] = latest_term_section.term.suffix
		latest_term_sections = all_sections.filter(term=latest_term_section.term)
		course_setup = _build_course_setup(latest_term_sections)
		if course_setup:
			course_dict["course_setup"] = course_setup

	# Per-term history
	course_dict["terms"] = _build_terms_list(crosslistings)

	return course_dict


def _build_registrar_url(guid: str | None) -> str | None:
	"""Return the registrar course-details URL for a given course guid, or None."""
	if not guid:
		return None
	term, course_id = get_term_and_course_id(guid)
	return f"{REGISTRAR_URL}?term={term}&courseid={course_id}"


def _build_grading_breakdown(course) -> list:
	"""Return a list of grading components for a course, or an empty list if none exist."""
	try:
		grading_info = course.grading_info
	except GradingInfo.DoesNotExist:
		return []

	breakdown = []
	for field, label in GRADING_FIELD_LABELS.items():
		percent = getattr(grading_info, field, 0)
		if percent:
			breakdown.append({"label": label, "percent": percent})
	return breakdown


def _get_semester_offered(crosslistings: str) -> SemesterOffered | None:
	"""Return a SemesterOffered value based on historical offerings, or None if unknown."""
	all_guids = Course.objects.filter(crosslistings__icontains=crosslistings).values_list("guid", flat=True)
	valid_guids = [guid for guid in all_guids if guid and len(guid) >= 4]
	has_fall = any(is_fall_course(guid) for guid in valid_guids)
	has_spring = any(is_spring_course(guid) for guid in valid_guids)
	if has_fall and has_spring:
		return SemesterOffered.BOTH
	if has_fall:
		return SemesterOffered.FALL
	if has_spring:
		return SemesterOffered.SPRING
	return None


def _build_course_setup(sections_queryset) -> list:
	"""Build a course_setup list from a Section queryset for one term.

	Fetches ClassMeeting rows for the given sections, then delegates to
	:func:`_build_course_setup_from_data`.

	Args:
	    sections_queryset: Section queryset scoped to a single term.

	Returns:
	    List of dicts with ``class_type``, ``count``, and ``duration``
	    (minutes).

	"""
	section_ids = list(sections_queryset.values_list("id", flat=True))
	meetings = ClassMeeting.objects.filter(section_id__in=section_ids).select_related("section")

	meetings_by_section: dict = defaultdict(list)
	for meeting in meetings:
		meetings_by_section[meeting.section_id].append(meeting)

	return _build_course_setup_from_data(list(sections_queryset), meetings_by_section)


def _build_terms_list(crosslistings: str) -> list:
	"""Return per-term dicts for every historical offering of a course.

	Uses four bulk queries (courses, sections, meetings, term labels) so
	the total cost is independent of the number of historical terms.

	Args:
	    crosslistings: Crosslistings string used to match course offerings.

	Returns:
	    List of dicts with ``term_code``, ``label``, ``instructors``,
	    ``quality_of_course``, and ``course_setup``, ordered newest first.

	"""
	all_term_courses = (
		Course.objects.filter(crosslistings__icontains=crosslistings).prefetch_related("instructors").order_by("-guid")
	)

	course_ids = list(all_term_courses.values_list("id", flat=True))

	# Get all sections for every historical offering
	all_sections = Section.objects.filter(course_id__in=course_ids)
	sections_by_course: dict = defaultdict(list)
	all_section_ids = []
	for section in all_sections:
		sections_by_course[section.course_id].append(section)
		all_section_ids.append(section.id)

	# Get all meetings for every section
	all_meetings = ClassMeeting.objects.filter(section_id__in=all_section_ids)
	meetings_by_section: dict = defaultdict(list)
	for meeting in all_meetings:
		meetings_by_section[meeting.section_id].append(meeting)

	# Get all term labels at once
	term_codes = {get_term(course.guid) for course in all_term_courses if course.guid}
	term_suffix_map: dict = dict(
		AcademicTerm.objects.filter(term_code__in=term_codes).values_list("term_code", "suffix")
	)

	# Build result list
	terms = []
	seen_term_codes: set = set()
	for course in all_term_courses:
		if not course.guid:
			continue
		term_code = get_term(course.guid)
		if term_code in seen_term_codes:
			continue
		seen_term_codes.add(term_code)

		instructor_names = [instructor.full_name for instructor in course.instructors.all() if instructor.full_name]
		course_sections = sections_by_course[course.id]
		course_setup = _build_course_setup_from_data(course_sections, meetings_by_section)
		label = suffix_to_label(term_suffix_map.get(term_code, ""), term_code)

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


def _build_course_setup_from_data(sections, meetings_by_section: dict) -> list:
	"""Summarize meeting count and total duration per class type.

	Args:
	    sections: Section objects for a single course offering.
	    meetings_by_section: Map of section id to its ClassMeeting objects.

	Returns:
	    List of dicts with ``class_type``, ``count``, and ``duration`` (minutes).

	"""
	course_setup_dict = {}
	for section in sections:
		class_type = section.class_type
		if class_type in course_setup_dict:
			continue
		total_duration = 0
		meeting_count = 0
		for meeting in meetings_by_section.get(section.id, []):
			if meeting.start_time and meeting.end_time:
				start = datetime.combine(datetime.today(), meeting.start_time)
				end = datetime.combine(datetime.today(), meeting.end_time)
				total_duration += int((end - start).total_seconds() / 60)
				meeting_count += len(meeting.days.split(",")) if meeting.days else 0
		if total_duration > 0:
			course_setup_dict[class_type] = {"count": meeting_count, "duration": total_duration}

	return [
		{"class_type": class_type, "count": info["count"], "duration": info["duration"]}
		for class_type, info in course_setup_dict.items()
	]
