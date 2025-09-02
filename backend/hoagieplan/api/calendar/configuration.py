from django.db.models.query import Prefetch
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from hoagieplan.models import (
    AcademicTerm,
    CalendarConfiguration,
    ClassMeeting,
    CustomUser,
    Section,
    UserCalendarSection,
)
from hoagieplan.serializers import (
    CalendarConfigurationSerializer,
    UserCalendarSectionSerializer,
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
        # print("term", term)
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

        # for section_data in selected_sections_data:
        #     print(f"ID: {section_data['id']}")
        #     print(f"Class Section: {section_data['class_section']}")
        #     print(f"Class Type: {section_data['class_type']}")
        #     print(f"Course ID: {section_data['course']['course_id']}")
        #     print(f"Course Title: {section_data['course']['title']}")
        #     print(f"Instructor: {section_data['instructor']['name']}")
        #     print(f"Capacity: {section_data['capacity']}")
        #     print(f"Enrollment: {section_data['enrollment']}")
        #     for meeting in section_data["class_meetings"]:
        #         print(f"  Meeting ID: {meeting['id']}")
        #         print(f"  Days: {meeting['days']}")
        #         print(f"  Start Time: {meeting['start_time']}")
        #         print(f"  End Time: {meeting['end_time']}")
        #         print(f"  Building Name: {meeting['building_name']}")
        #         print(f"  Room: {meeting['room']}")

        return Response(selected_sections_data, status=status.HTTP_200_OK)

    def get_unique_class_meetings(self, term, course_id):
        # print(term)
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
    DEFAULT_CALENDAR_NAME = "My Calendar"

    def get(self, request):
        """Fetch all calendar configurations for the user, or for a specific term if provided."""
        net_id = request.headers.get("X-NetId")

        term = request.data.get("term")
        if not term:
            return Response({"detail": "Term is required."}, status=status.HTTP_400_BAD_REQUEST)
        term_id = AcademicTerm.objects.get(term_code=term).id

        print(f"Method: {request.method}, Path: {request.path}, Params: {request.query_params}")

        try:
            user_inst = CustomUser.objects.get(net_id=net_id)
        except CustomUser.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        print("Request body:", request.data)

        if term:
            queryset = CalendarConfiguration.objects.filter(user=user_inst, term_id=term_id)
        else:
            queryset = CalendarConfiguration.objects.filter(user=user_inst)

        serializer = CalendarConfigurationSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Create a new calendar configuration for the user."""
        net_id = request.headers.get("X-NetId")

        term = request.data.get("term")
        if not term:
            return Response({"detail": "Term is required."}, status=status.HTTP_400_BAD_REQUEST)
        term_id = AcademicTerm.objects.get(term_code=term).id

        calendar_name = request.data.get("calendar_name", self.DEFAULT_CALENDAR_NAME)
        if not calendar_name:
            return Response({"detail": "Calendar name is required."}, status=status.HTTP_400_BAD_REQUEST)

        print(f"Method: {request.method}, Path: {request.path}, Params: {request.query_params}")

        try:
            user_inst = CustomUser.objects.get(net_id=net_id)
        except CustomUser.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        print("Request body:", request.data)

        try:
            calendar_config, created = CalendarConfiguration.objects.get_or_create(
                user=user_inst, name=calendar_name, term_id=term_id
            )

            if not created:
                return Response(
                    {"detail": "Calendar with this name already exists."}, status=status.HTTP_400_BAD_REQUEST
                )

            serializer = CalendarConfigurationSerializer(calendar_config)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception:
            return Response({"detail": "Failed to create calendar."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get_calendar(self, calendar_name, net_id, term_id):
        """Helper function to retrieve calendar."""
        try:
            print(calendar_name, net_id, term_id)
            user_inst = CustomUser.objects.get(net_id=net_id)
            print(user_inst.id)
            calendar = CalendarConfiguration.objects.get(user=user_inst, name=calendar_name, term_id=term_id)
            return calendar, user_inst
        except CustomUser.DoesNotExist:
            print("User not found")
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        except CalendarConfiguration.DoesNotExist:
            print("Calendar not found")
            return Response({"detail": "Calendar not found."}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request):
        """Update an existing calendar configuration."""
        net_id = request.headers.get("X-NetId")
        calendar_name = request.data.get("calendar_name")
        term = request.data.get("term")
        if not term:
            return Response({"detail": "Term is required."}, status=status.HTTP_400_BAD_REQUEST)
        term_id = AcademicTerm.objects.get(term_code=term).id

        print(f"Method: {request.method}, Path: {request.path}, Params: {request.query_params}")

        try:
            calendar, user_inst = self.get_calendar(calendar_name, net_id, term_id)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)

        new_calendar_name = request.data.get("new_calendar_name")

        try:
            # Check if there exists another calendar with the new calendar name
            existing = (
                CalendarConfiguration.objects.filter(user=user_inst, name=new_calendar_name)
                .exclude(name=calendar_name)
                .exists()
            )

            if existing:
                return Response(
                    {"detail": "Calendar with this name already exists."}, status=status.HTTP_400_BAD_REQUEST
                )

            # If not, update the calendar name
            calendar.name = new_calendar_name
            calendar.save()
            serializer = CalendarConfigurationSerializer(calendar)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception:
            return Response({"detail": "Failed to update calendar."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request):
        """Delete an existing calendar configuration."""
        net_id = request.headers.get("X-NetId")
        calendar_name = request.data.get("calendar_name")

        term = request.data.get("term")
        if not term:
            return Response({"detail": "Term is required."}, status=status.HTTP_400_BAD_REQUEST)
        term_id = AcademicTerm.objects.get(term_code=term).id

        print(f"Method: {request.method}, Path: {request.path}, Params: {request.query_params}")

        try:
            calendar, user_inst = self.get_calendar(calendar_name, net_id, term_id)
            print(user_inst.id)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)

        try:
            calendar_name = calendar.name
            calendar.delete()

            return Response({"detail": f"Calendar '{calendar_name}' deleted successfully."}, status=status.HTTP_200_OK)

        except Exception:
            return Response({"detail": "Failed to delete calendar."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserCalendarSectionView(APIView):
    def get_object(self, request, configuration_id, term_code, index):
        try:
            return UserCalendarSection.objects.get(
                semester_configuration__calendar_configuration_id=configuration_id,
                semester_configuration__calendar_configuration__user=request.user,
                semester_configuration__term__term_code=term_code,
                index=index,
            )
        except UserCalendarSection.DoesNotExist:
            return None

    def put(self, request, configuration_id, term_code, index):
        schedule_selection = self.get_object(request, configuration_id, term_code, index)
        if schedule_selection:
            serializer = UserCalendarSectionSerializer(schedule_selection, data=request.data, partial=True)
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
