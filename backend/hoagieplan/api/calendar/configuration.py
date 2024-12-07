from hoagieplan.logger import logger
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models.query import Prefetch
from django.db import IntegrityError
from rest_framework import status
from hoagieplan.models import (
    ClassMeeting,
    Section,
    CalendarConfiguration,
    SemesterConfiguration,
    ScheduleSelection,
)
from hoagieplan.serializers import (
    CalendarConfigurationSerializer,
    SemesterConfigurationSerializer,
    ScheduleSelectionSerializer,
)

class FetchCalendarClasses(APIView):
    """A function to retrieve unique class meetings based on the provided term and course ID.

    Parameters
    ----------
        request: The request object.
        term: The term to search for.
        course_id: The course ID to search for.

    Returns
    -------
        Response: A response object with the unique class meetings serialized.

    """

    def get(self, request, term, course_id):
        sections = self.get_unique_class_meetings(term, course_id)
        print("term", term)
        if not sections:
            return Response({"error": "No sections found"}, status=status.HTTP_404_NOT_FOUND)

        sections_data = [self.serialize_section(section) for section in sections]

        # Group sections by instructor
        sections_by_instructor = {}
        for section_data in sections_data:
            instructor_name = section_data["instructor"]["name"]
            if instructor_name not in sections_by_instructor:
                sections_by_instructor[instructor_name] = []
            sections_by_instructor[instructor_name].append(section_data)

        # Select the set corresponding to one of the instructors
        selected_instructor = next(iter(sections_by_instructor.keys()))
        selected_sections_data = sections_by_instructor[selected_instructor]

        for section_data in selected_sections_data:
            print(f"ID: {section_data['id']}")
            print(f"Class Section: {section_data['class_section']}")
            print(f"Class Type: {section_data['class_type']}")
            print(f"Course ID: {section_data['course']['course_id']}")
            print(f"Course Title: {section_data['course']['title']}")
            print(f"Instructor: {section_data['instructor']['name']}")
            print(f"Capacity: {section_data['capacity']}")
            print(f"Enrollment: {section_data['enrollment']}")
            for meeting in section_data["class_meetings"]:
                print(f"  Meeting ID: {meeting['id']}")
                print(f"  Days: {meeting['days']}")
                print(f"  Start Time: {meeting['start_time']}")
                print(f"  End Time: {meeting['end_time']}")
                print(f"  Building Name: {meeting['building_name']}")
                print(f"  Room: {meeting['room']}")

        return Response(selected_sections_data, status=status.HTTP_200_OK)

    def get_unique_class_meetings(self, term, course_id):
        print(term)
        sections = Section.objects.filter(term__term_code=term, course__course_id=course_id)

        unique_sections = sections.select_related("course", "instructor").prefetch_related(
            Prefetch(
                "classmeeting_set",
                queryset=ClassMeeting.objects.order_by("id"),
                to_attr="unique_class_meetings",
            )
        )
        return unique_sections

    def serialize_section(self, section):
        class_meetings_data = [
            self.serialize_class_meeting(meeting) for meeting in getattr(section, "unique_class_meetings", [])
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

    def serialize_class_meeting(self, meeting):
        class_meeting_data = {
            "id": meeting.id,
            "days": meeting.days,
            "start_time": meeting.start_time.strftime("%H:%M"),
            "end_time": meeting.end_time.strftime("%H:%M"),
            "building_name": meeting.building_name,
            "room": meeting.room,
        }
        return class_meeting_data


class CalendarConfigurationsView(APIView):
    def get(self, request):
        term_code = request.query_params.get("term_code")
        user = request.user

        if term_code:
            queryset = CalendarConfiguration.objects.filter(
                user=user, semester_configurations__term__term_code=term_code
            )
        else:
            queryset = CalendarConfiguration.objects.filter(user=user)

        serializer = CalendarConfigurationSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        user = request.user
        name = request.data.get("name", "Default Schedule")

        try:
            calendar_config, created = CalendarConfiguration.objects.get_or_create(
                user=user, name=name, defaults={"user": user, "name": name}
            )
            serializer = CalendarConfigurationSerializer(calendar_config)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except IntegrityError:
            return Response(
                {"detail": "Calendar configuration with this name already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error("An error occurred: %s", str(e))
            return Response({"detail": "An internal error has occurred."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CalendarConfigurationView(APIView):
    def get(self, request, term_code):
        user = request.user
        try:
            calendar_config = CalendarConfiguration.objects.get(
                user=user,
                semester_configurations__term__term_code=term_code,
            )
            serializer = CalendarConfigurationSerializer(calendar_config)
            return Response(serializer.data)
        except CalendarConfiguration.DoesNotExist:
            return Response(
                {"detail": "Calendar configuration not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            logger.error("An error occurred: %s", str(e))
            return Response({"detail": "An internal error has occurred."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        user = request.user
        name = request.data.get("name", "Default Schedule")

        try:
            calendar_config, _ = CalendarConfiguration.objects.get_or_create(
                user=user, name=name, defaults={"user": user, "name": name}
            )
            serializer = CalendarConfigurationSerializer(calendar_config)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except IntegrityError:
            return Response(
                {"detail": "Calendar configuration with this name already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error("An error occurred: %s", str(e))
            return Response({"detail": "An internal error has occurred."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SemesterConfigurationView(APIView):
    def get_object(self, request, configuration_id, term_code):
        try:
            return SemesterConfiguration.objects.get(
                calendar_configuration_id=configuration_id,
                calendar_configuration__user=request.user,
                term__term_code=term_code,
            )
        except SemesterConfiguration.DoesNotExist:
            return None

    def get(self, request, configuration_id, term_code):
        semester_configuration = self.get_object(request, configuration_id, term_code)
        if semester_configuration:
            serializer = SemesterConfigurationSerializer(semester_configuration)
            return Response(serializer.data)
        else:
            return Response(
                {"detail": "Semester configuration not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

    def put(self, request, configuration_id, term_code):
        semester_configuration = self.get_object(request, configuration_id, term_code)
        if semester_configuration:
            serializer = SemesterConfigurationSerializer(semester_configuration, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response(
                {"detail": "Semester configuration not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

    def delete(self, request, configuration_id, term_code):
        semester_configuration = self.get_object(request, configuration_id, term_code)
        if semester_configuration:
            semester_configuration.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        else:
            return Response(
                {"detail": "Semester configuration not found."},
                status=status.HTTP_404_NOT_FOUND,
            )


class ScheduleSelectionView(APIView):
    def get_object(self, request, configuration_id, term_code, index):
        try:
            return ScheduleSelection.objects.get(
                semester_configuration__calendar_configuration_id=configuration_id,
                semester_configuration__calendar_configuration__user=request.user,
                semester_configuration__term__term_code=term_code,
                index=index,
            )
        except ScheduleSelection.DoesNotExist:
            return None

    def put(self, request, configuration_id, term_code, index):
        schedule_selection = self.get_object(request, configuration_id, term_code, index)
        if schedule_selection:
            serializer = ScheduleSelectionSerializer(schedule_selection, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response(
                {"detail": "Schedule selection not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
