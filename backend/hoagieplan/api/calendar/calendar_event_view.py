import re
from enum import Enum
from typing import Dict, List, Set

from django.db import transaction
from django.db.models.query import Prefetch
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from hoagieplan.api.model_getters import (
    get_calendar,
    get_course,
    get_term,
)
from hoagieplan.models import CalendarEvent, ClassMeeting, CustomUser, Section
from hoagieplan.serializers import CalendarEventSerializer
from hoagieplan.utils import get_term_and_course_id

DAYS_TO_START_COLUMN_INDEX = {
    "M": 1,  # Monday
    "T": 2,  # Tuesday
    "W": 3,  # Wednesday
    "Th": 4,  # Thursday
    "F": 5,  # Friday
}

EXCEPTIONS_FOR_NEEDS_CHOICE = ["Seminar", "Lecture"]


class CalendarEventPostAction(Enum):
    AddAllCalendarEventsForCourse = "ADD_ALL_CALENDAR_EVENTS_FOR_COURSE"
    BulkAddCalendarEvents = "BULK_ADD_CALENDAR_EVENTS"


class CalendarEventView(APIView):
    def get(self, request, calendar_name: str, term: int) -> Response:
        """Fetch all calendar events associated with a calendar."""
        user_inst: CustomUser = request.user
        try:
            term_id = get_term(term).id
            calendar = get_calendar(user_inst, calendar_name, term_id)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)

        queryset = (
            CalendarEvent.objects.filter(calendar_configuration=calendar)
            .select_related(
                "calendar_configuration",
                "course__department",
                "section__instructor",
            )
            .prefetch_related(
                "course__section_set__classmeeting_set",
                "course__section_set__instructor",
                "section__classmeeting_set",
            )
        )

        serializer = CalendarEventSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request, calendar_name: str, term: int) -> Response:
        """Handle post operations for calendar events for the user."""
        user_inst: CustomUser = request.user
        action: str = request.query_params.get("action")
        if action == CalendarEventPostAction.AddAllCalendarEventsForCourse.value:
            return self._add_all_calendar_events_for_course(request, user_inst, calendar_name, term)
        elif action == CalendarEventPostAction.BulkAddCalendarEvents.value:
            return self._bulk_add_calendar_events(request, user_inst, calendar_name, term)
        else:
            return Response({"error": f"Unknown operation: {action}"}, status=status.HTTP_400_BAD_REQUEST)

    def _add_all_calendar_events_for_course(
        self, request, user_inst: CustomUser, calendar_name: str, term: int
    ) -> Response:
        """Add all calendar events for a course identified by guid."""
        guid: str = request.data.get("guid")

        try:
            term_id: int = get_term(term).id
            calendar_configuration = get_calendar(user_inst, calendar_name, term_id)
            course = get_course(guid)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)

        course_term, course_id = get_term_and_course_id(guid)
        sections = self._get_unique_class_meetings(course_term, course_id)
        if not sections:
            return Response({"error": "No sections found"}, status=status.HTTP_404_NOT_FOUND)

        # Group sections by instructor
        sections_by_instructor: Dict[str, List[Section]] = {}
        for section in sections:
            instructor_name = section.instructor.full_name
            if instructor_name not in sections_by_instructor:
                sections_by_instructor[instructor_name] = []
            sections_by_instructor[instructor_name].append(section)

        # Select the set corresponding to one of the instructors
        selected_instructor = next(iter(sections_by_instructor.keys()))
        selected_sections_data = sections_by_instructor[selected_instructor]

        unique_sections: Set[Section] = set(section.class_section for section in selected_sections_data)
        unique_count = len(unique_sections)

        # Identifying lectures
        lecture_sections = [
            section
            for section in selected_sections_data
            if section.class_type == "Lecture" and re.match(r"^L0\d+", section.class_section)
        ]

        # Computing the number of unique lectures
        unique_lecture_numbers = set()
        for section in lecture_sections:
            match = re.match(r"^L0(\d+)", section.class_section)
            if match:
                unique_lecture_numbers.add(match.group(1))

        # Identifying seminars
        seminar_sections = [
            section
            for section in selected_sections_data
            if section.class_type == "Seminar" and re.match(r"^S0\d+", section.class_section)
        ]

        # Computing the number of unique seminars
        unique_seminar_numbers = set()
        for section in seminar_sections:
            match = re.match(r"^S0(\d+)", section.class_section)
            if match:
                unique_seminar_numbers.add(match.group(1))

        # Creating the CalendarEvent objects
        calendar_events_to_create: List[CalendarEvent] = []
        for section in selected_sections_data:
            for class_meeting in section.unique_class_meetings:
                start_column_indices = self._get_start_column_index_for_days(class_meeting.days)
                for start_column_index in start_column_indices:
                    calendar_events_to_create.append(
                        CalendarEvent(
                            calendar_configuration=calendar_configuration,
                            course=course,
                            section=section,
                            start_time=class_meeting.start_time,
                            end_time=class_meeting.end_time,
                            start_column_index=start_column_index,
                            is_active=True,
                            needs_choice=(
                                (section.class_type not in EXCEPTIONS_FOR_NEEDS_CHOICE and unique_count > 1)
                                or (len(unique_lecture_numbers) > 1 and section.class_type == "Lecture")
                                or (len(unique_seminar_numbers) > 1 and section.class_type == "Seminar")
                            ),
                            is_chosen=False,
                        )
                    )

        CalendarEvent.objects.bulk_create(calendar_events_to_create)

        serializer = CalendarEventSerializer(calendar_events_to_create, many=True)
        return Response(serializer.data)

    def _bulk_add_calendar_events(self, request, user_inst: CustomUser, calendar_name: str, term: int) -> Response:
        """Add multiple calendar events at once."""
        events_data: list = request.data.get("events", [])
        if not events_data:
            return Response({"error": "No events provided"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            term_id: int = get_term(term).id
            calendar_configuration = get_calendar(user_inst, calendar_name, term_id)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)

        calendar_events_to_create: List[CalendarEvent] = []
        for item in events_data:
            try:
                course = get_course(item["guid"])
            except Exception as e:
                return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)

            calendar_events_to_create.append(
                CalendarEvent(
                    calendar_configuration=calendar_configuration,
                    course=course,
                    section_id=item["section_id"],
                    start_time=item["start_time"],
                    end_time=item["end_time"],
                    start_column_index=item["start_column_index"],
                    is_active=item.get("is_active", True),
                    needs_choice=item.get("needs_choice", False),
                    is_chosen=item.get("is_chosen", False),
                )
            )

        CalendarEvent.objects.bulk_create(calendar_events_to_create)

        serializer = CalendarEventSerializer(calendar_events_to_create, many=True)
        return Response(serializer.data)

    def delete(self, request, calendar_name: str, term: int) -> Response:
        """Delete all calendar events associated with a given guid."""
        guid: str = request.data.get("guid")
        user_inst = request.user

        try:
            term_id = get_term(term).id
            calendar_configuration = get_calendar(user_inst, calendar_name, term_id)
            course = get_course(guid)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)

        try:
            events_to_delete = CalendarEvent.objects.filter(
                calendar_configuration=calendar_configuration,
                course=course,
            )
            deleted_count, _ = events_to_delete.delete()
            if deleted_count == 0:
                return Response({"detail": "No events to delete."}, status=status.HTTP_404_NOT_FOUND)
            return Response({"detail": f"Deleted {deleted_count} events."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, calendar_name: str, term: int) -> Response:
        """Inverts a calendar event (Activates an inactive event or deactivates an active event)."""
        guid: str = request.data.get("guid")

        # class_section are L01, C01, P01, etc.
        class_section: str = request.data.get("classSection")
        user_inst = request.user

        try:
            term_id = get_term(term).id
            calendar_configuration = get_calendar(user_inst, calendar_name, term_id)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)

        # Fetch all events for this course in one query, avoiding separate Course and Section lookups
        events_for_course = list(
            CalendarEvent.objects.filter(
                calendar_configuration=calendar_configuration,
                course__guid=guid,
            ).select_related("course", "section")
        )
        if not events_for_course:
            return Response({"detail": "CalendarEvent not found"}, status=status.HTTP_404_NOT_FOUND)

        clicked_event = next(
            (event for event in events_for_course if event.section.class_section == class_section),
            None,
        )
        if not clicked_event:
            return Response({"detail": "No CalendarEvents found for the section"}, status=status.HTTP_404_NOT_FOUND)

        # Change status of is_chosen and is_active
        matched_sections = [
            section
            for section in events_for_course
            if (section.course.guid == clicked_event.course.guid and section.section.id == clicked_event.section.id)
        ]
        sections_per_grouping = len(matched_sections)

        active_sections = [
            section
            for section in events_for_course
            if (
                section.course.guid == clicked_event.course.guid
                and section.is_active
                and section.section.class_type == clicked_event.section.class_type
            )
        ]
        is_active_single = len(active_sections) <= sections_per_grouping

        events_to_update: List[CalendarEvent] = []
        with transaction.atomic():
            for section in events_for_course:
                # Section that was clicked
                if section.section.id == clicked_event.section.id and section.course.guid == clicked_event.course.guid:
                    section.is_chosen = not section.is_chosen
                    events_to_update.append(section)

                # Completely different course, do nothing
                elif section.course.guid != clicked_event.course.guid:
                    continue

                # Only has one section that is visible, which is the one that is clicked
                elif is_active_single and clicked_event.is_active:
                    if section.section.class_type == clicked_event.section.class_type:
                        section.is_active = True
                        section.is_chosen = False
                        events_to_update.append(section)
                elif section.section.class_type == clicked_event.section.class_type:
                    section.is_active = section.get_key() == clicked_event.get_key()
                    section.is_chosen = section.get_key() == clicked_event.get_key()
                    events_to_update.append(section)

            if events_to_update:
                CalendarEvent.objects.bulk_update(events_to_update, ["is_active", "is_chosen"])

        return Response({"detail": "Updated events."}, status=status.HTTP_200_OK)

    def _get_unique_class_meetings(self, term: str, course_id: str) -> list[Section]:
        sections = Section.objects.filter(term__term_code=term, course__course_id=course_id)

        unique_sections = sections.select_related("course", "instructor").prefetch_related(
            Prefetch(
                "classmeeting_set",
                queryset=ClassMeeting.objects.order_by("id"),
                to_attr="unique_class_meetings",
            )
        )
        return unique_sections

    def _get_start_column_index_for_days(self, days_string: str) -> list[int]:
        days_array = days_string.split(",")
        return [DAYS_TO_START_COLUMN_INDEX.get(day.strip(), 0) for day in days_array]
