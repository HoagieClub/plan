import re
from typing import Dict, List, Set

from django.db.models.query import Prefetch
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from hoagieplan.api.model_getters import (
    get_calendar,
    get_calendar_event,
    get_calendar_events,
    get_course,
    get_section,
    get_term,
    get_user,
)
from hoagieplan.models import CalendarEvent, ClassMeeting, Course, Section
from hoagieplan.serializers import CalendarEventSerializer
from hoagieplan.utils import get_term_and_course_id


class CalendarEventView(APIView):
    DAYS_TO_START_COLUMN_INDEX = {
        "M": 1,  # Monday
        "T": 2,  # Tuesday
        "W": 3,  # Wednesday
        "Th": 4,  # Thursday
        "F": 5,  # Friday
    }

    EXCEPTIONS_FOR_NEEDS_CHOICE = ["Seminar", "Lecture"]

    def get(self, request, net_id: str, calendar_name: str, term: int) -> Response:
        """Fetch all calendar events associated with a calendar."""
        print(f"Method: {request.method}, Path: {request.path}, Params: {request.query_params}")

        try:
            term_id = get_term(term).id
            user_inst = get_user(net_id)
            calendar = get_calendar(user_inst, calendar_name, term_id)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)

        queryset = CalendarEvent.objects.filter(calendar_configuration=calendar)

        serializer = CalendarEventSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request, net_id: str, calendar_name: str, term: int) -> Response:
        """Create calendar events for the given course guid for the user."""
        action: str = request.query_params.get("action")
        if action == 'ADD_COURSE':
            return self._create_calendar_event(request, net_id, calendar_name, term)
        else:
            return Response(
                {"error": f"Unknown operation: {action}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    def _create_calendar_event(self, request, net_id: str, calendar_name: str, term: int)-> Response:
        print(f"Method: {request.method}, Path: {request.path}, Params: {request.query_params}")
        guid: str = request.data.get("guid")

        try:
            term_id = get_term(term).id
            user_inst = get_user(net_id)
            calendar_configuration = get_calendar(user_inst, calendar_name, term_id)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)

        course_term, course_id = get_term_and_course_id(guid)
        course = Course.objects.get(guid=guid)

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

        # Creating the CalendarEvent objects
        calendar_events: List[CalendarEvent] = []
        for section in selected_sections_data:
            for class_meeting in section.classmeeting_set.all():
                start_column_indices = self._get_start_column_index_for_days(class_meeting.days)
                for start_column_index in start_column_indices:
                    calendar_event = CalendarEvent.objects.create(
                        calendar_configuration=calendar_configuration,
                        course=course,
                        section_id=section.id,
                        start_time=class_meeting.start_time,
                        end_time=class_meeting.end_time,
                        start_column_index=start_column_index,
                        is_active=True,
                        needs_choice=(
                            (section.class_type not in self.EXCEPTIONS_FOR_NEEDS_CHOICE and unique_count > 1)
                            or (len(unique_lecture_numbers) > 1 and section.class_type == "Lecture")
                        ),
                        is_chosen=False,
                    )

                    calendar_events.append(calendar_event)

        serializer = CalendarEventSerializer(calendar_events, many=True)
        return Response(serializer.data)

    def delete(self, request, net_id: str, calendar_name: str, term: int) -> Response:
        """Delete all calendar events associated with a given guid."""
        print(f"Method: {request.method}, Path: {request.path}, Params: {request.query_params}")
        guid: str = request.data.get("guid")

        try:
            term_id = get_term(term).id
            user_inst = get_user(net_id)
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

    def put(self, request, net_id: str, calendar_name: str, term: int) -> Response:
        """Update a calendar event."""
        print(f"Method: {request.method}, Path: {request.path}, Params: {request.query_params}")

        guid: str = request.data.get("guid")

        # class_section are L01, C01, P01, etc.
        class_section: str = request.data.get("classSection")

        try:
            term_id = get_term(term).id
            user_inst = get_user(net_id)
            calendar_configuration = get_calendar(user_inst, calendar_name, term_id)
            course = get_course(guid)
            clicked_sections = get_section(course, class_section)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)

        # Retrieving the event that was clicked
        clicked_events: List[CalendarEvent] = []
        for section in clicked_sections:
            try:
                clicked_event = get_calendar_event(calendar_configuration, course, section)
                clicked_events.append(clicked_event)
            except Exception:
                continue
        if not clicked_events:
            return Response({"detail": "No CalendarEvents found for the section"}, status=status.HTTP_404_NOT_FOUND)
        clicked_event = clicked_events[0]

        # If the clicked section is an exception, do nothing and return
        is_exception = (
            clicked_event.section.class_type == "Seminar" and "Independent Work" not in clicked_event.course.title
        )
        if is_exception:
            return Response({"detail": "No updates"}, status=status.HTTP_200_OK)

        # Change status of is_chosen and is_active
        events_for_course = get_calendar_events(calendar_configuration, course)
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

        for section in events_for_course:
            # Section that was clicked
            if section.section.id == clicked_event.section.id and section.course.guid == clicked_event.course.guid:
                section.is_chosen = not section.is_chosen
                section.save()

            # Completely different course, do nothing
            elif section.course.guid != clicked_event.course.guid:
                continue

            # Only has one section that is visible, which is the one that is clicked
            elif is_active_single and clicked_event.is_active:
                if section.section.class_type == clicked_event.section.class_type:
                    section.is_active = True
                    section.is_chosen = False
                    section.save()
            elif section.section.class_type == clicked_event.section.class_type:
                section.is_active = section.get_key() == clicked_event.get_key()
                section.is_chosen = section.get_key() == clicked_event.get_key()
                section.save()

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
        return [self.DAYS_TO_START_COLUMN_INDEX.get(day.strip(), 0) for day in days_array]

    def _serialize_section(self, section):
        class_meetings_data = [
            self._serialize_class_meeting(meeting) for meeting in getattr(section, "unique_class_meetings", [])
        ]

        section_data = {
            "id": section.id,
            "class_section": section.class_section,
            "class_type": section.class_type,
            "enrollment": section.enrollment,
            "capacity": section.capacity,
            "course": {
                "course_id": section.course.course_id,
                "title": section.course.title,
            },
            "instructor": {
                "name": str(section.instructor),
            },
            "class_meetings": class_meetings_data,
        }
        return section_data

    def _serialize_class_meeting(self, meeting):
        class_meeting_data = {
            "id": meeting.id,
            "days": meeting.days,
            "start_time": meeting.start_time.strftime("%H:%M"),
            "end_time": meeting.end_time.strftime("%H:%M"),
            "building_name": meeting.building_name,
            "room": meeting.room,
        }
        return class_meeting_data
