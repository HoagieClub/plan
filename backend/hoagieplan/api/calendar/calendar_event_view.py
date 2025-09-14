import re
from typing import Dict, List, Set

from django.db.models.query import Prefetch
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from hoagieplan.api.model_getters import get_calendar, get_term, get_user
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
            print("Error:", str(e))
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)

        queryset = CalendarEvent.objects.filter(calendar_configuration=calendar)

        serializer = CalendarEventSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request, net_id: str, calendar_name: str, term: int) -> Response:
        """Create calendar events for the given course guid for the user."""
        print(f"Method: {request.method}, Path: {request.path}, Params: {request.query_params}")
        guid = request.data.get("guid")

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

        # -------------------------------------------------------------
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
        """Delete a calendar event."""
        # Retreived from the body of the request
        guid = request.data.get("guid")
        pass

    def put(self, request, net_id: str, calendar_name: str, term: int) -> Response:
        """Update a calendar event."""
        # Retreived from the body of the request
        guid = request.data.get("guid")
        # Change is_chosen and other booleans status
        pass

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

    # def post(self, request):
    #     return
    #     """Create a new calendar event for the user."""
    #     net_id = request.headers.get("X-NetId")

    #     calendar_name = request.data.get("calendar_name", self.DEFAULT_CALENDAR_NAME)
    #     if not calendar_name:
    #         return Response({"detail": "Calendar name is required."}, status=status.HTTP_400_BAD_REQUEST)

    #     calendar_name = request.data.get("calendar_name", self.DEFAULT_CALENDAR_NAME)
    #     if not calendar_name:
    #         return Response({"detail": "Calendar name is required."}, status=status.HTTP_400_BAD_REQUEST)

    #     print(f"Method: {request.method}, Path: {request.path}, Params: {request.query_params}")

    #     try:
    #         user_inst = CustomUser.objects.get(net_id=net_id)
    #     except CustomUser.DoesNotExist:
    #         return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    #     print("Request body:", request.data)

    #     try:
    #         calendar_config, created = CalendarConfiguration.objects.get_or_create(
    #             user=user_inst, name=calendar_name, term_id=term_id
    #         )

    #         if not created:
    #             return Response(
    #                 {"detail": "Calendar with this name already exists."}, status=status.HTTP_400_BAD_REQUEST
    #             )

    #         serializer = CalendarConfigurationSerializer(calendar_config)
    #         return Response(serializer.data, status=status.HTTP_201_CREATED)

    #     except Exception:
    #         return Response({"detail": "Failed to create calendar."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
