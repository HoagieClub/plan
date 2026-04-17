from enum import Enum

from django.db import transaction
from django.db.models import Prefetch
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from hoagieplan.models import AcademicTerm, CalendarConfiguration, CalendarEvent, CustomUser
from hoagieplan.serializers import (
    CalendarConfigurationSerializer,
)


class CalendarConfigurationPostAction(Enum):
    UpdateCalendar = "UPDATE_CALENDAR"
    DuplicateCalendar = "DUPLICATE_CALENDAR"


class CalendarConfigurationView(APIView):
    DEFAULT_CALENDAR_NAME = "My Calendar"

    def get(self, request, term: int) -> Response:
        """Fetch all calendar configurations for the user, or for a specific term if provided."""
        user_inst: CustomUser = request.user

        prefetched_events = Prefetch(
            "calendar_events",
            queryset=CalendarEvent.objects.select_related(
                "course__department",
            ).prefetch_related(
                "course__instructors",
                "course__section_set__classmeeting_set",
            ),
        )

        if term:
            queryset = CalendarConfiguration.objects.filter(
                user=user_inst, term__term_code=str(term)
            ).prefetch_related(prefetched_events)
        else:
            queryset = CalendarConfiguration.objects.filter(user=user_inst).prefetch_related(prefetched_events)

        serializer = CalendarConfigurationSerializer(queryset, many=True)
        return Response(serializer.data)

    def put(self, request, term: int) -> Response:
        """Create a new calendar configuration for the user."""
        try:
            term_id = AcademicTerm.objects.get(term_code=str(term)).id
        except AcademicTerm.DoesNotExist:
            return Response({"detail": "Term not found."}, status=status.HTTP_404_NOT_FOUND)

        calendar_name = request.data.get("calendar_name", self.DEFAULT_CALENDAR_NAME)
        if not calendar_name:
            return Response({"detail": "Calendar name is required."}, status=status.HTTP_400_BAD_REQUEST)

        user_inst: CustomUser = request.user

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

    def post(self, request, term: int) -> Response:
        """Handle post operations for calendar configurations for the user.
        The default is to update the calendar
        """
        action: str = request.data.get("action")
        if action == CalendarConfigurationPostAction.DuplicateCalendar.value:
            return self._duplicate_calendar(request, term)
        else:
            return self._update_calendar(request, term)

    def _update_calendar(self, request, term: int) -> Response:
        """Update an existing calendar configuration."""
        calendar_name = request.data.get("calendar_name")
        if not calendar_name:
            return Response({"detail": "Calendar name is required."}, status=status.HTTP_400_BAD_REQUEST)

        user_inst: CustomUser = request.user
        try:
            calendar = CalendarConfiguration.objects.get(
                user=user_inst, name=calendar_name, term__term_code=str(term)
            )
        except CalendarConfiguration.DoesNotExist:
            return Response({"detail": "Calendar not found."}, status=status.HTTP_404_NOT_FOUND)

        new_calendar_name = request.data.get("new_calendar_name")
        try:
            # Check if there exists another calendar with the new calendar name
            existing = (
                CalendarConfiguration.objects.filter(user=user_inst, name=new_calendar_name, term_id=calendar.term_id)
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

    def delete(self, request, term: int) -> Response:
        """Delete an existing calendar configuration."""
        calendar_name = request.data.get("calendar_name")
        if not calendar_name:
            return Response({"detail": "Calendar name is required."}, status=status.HTTP_400_BAD_REQUEST)

        user_inst: CustomUser = request.user
        try:
            calendar = CalendarConfiguration.objects.get(
                user=user_inst, name=calendar_name, term__term_code=str(term)
            )
        except CalendarConfiguration.DoesNotExist:
            return Response({"detail": "Calendar not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            calendar_name = calendar.name
            calendar.delete()

            return Response({"detail": f"Calendar '{calendar_name}' deleted successfully."}, status=status.HTTP_200_OK)

        except Exception:
            return Response({"detail": "Failed to delete calendar."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _duplicate_calendar(self, request, term: int) -> Response:
        calendar_name = request.data.get("calendar_name")
        if not calendar_name:
            return Response({"detail": "Calendar name is required."}, status=status.HTTP_400_BAD_REQUEST)

        user_inst: CustomUser = request.user
        try:
            term_id = AcademicTerm.objects.get(term_code=str(term)).id
        except AcademicTerm.DoesNotExist:
            return Response({"detail": "Term not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            calendar = CalendarConfiguration.objects.get(user=user_inst, name=calendar_name, term_id=term_id)
        except CalendarConfiguration.DoesNotExist:
            return Response({"detail": "Calendar not found."}, status=status.HTTP_404_NOT_FOUND)

        new_calendar_name = request.data.get("new_calendar_name", f"{calendar.name} (Copy)")

        try:
            with transaction.atomic():
                queryset = CalendarEvent.objects.filter(calendar_configuration=calendar)
                calendar_config, created = CalendarConfiguration.objects.get_or_create(
                    user=user_inst, name=new_calendar_name, term_id=calendar.term_id
                )

                if not created:
                    return Response(
                        {"detail": "Calendar with this name already exists."}, status=status.HTTP_400_BAD_REQUEST
                    )

                CalendarEvent.objects.bulk_create(
                    [
                        CalendarEvent(
                            calendar_configuration=calendar_config,
                            course_id=event.course_id,
                            section_id=event.section_id,
                            start_time=event.start_time,
                            end_time=event.end_time,
                            start_column_index=event.start_column_index,
                            is_active=event.is_active,
                            needs_choice=event.needs_choice,
                            is_chosen=event.is_chosen,
                        )
                        for event in queryset
                    ]
                )

                prefetched_events = Prefetch(
                    "calendar_events",
                    queryset=CalendarEvent.objects.select_related(
                        "course__department",
                    ).prefetch_related("course__instructors", "course__section_set__classmeeting_set"),
                )
                calendar_config = CalendarConfiguration.objects.prefetch_related(prefetched_events).get(
                    pk=calendar_config.pk
                )
                serializer = CalendarConfigurationSerializer(calendar_config)
                return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception:
            return Response({"detail": "Failed to create calendar."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
