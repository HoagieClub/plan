from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from hoagieplan.api.model_getters import get_calendar, get_user
from hoagieplan.models import (
    AcademicTerm,
    CalendarConfiguration,
    CustomUser,
)
from hoagieplan.serializers import (
    CalendarConfigurationSerializer,
)


class CalendarConfigurationView(APIView):
    DEFAULT_CALENDAR_NAME = "My Calendar"

    def get(self, request, net_id: str, term: int) -> Response:
        """Fetch all calendar configurations for the user, or for a specific term if provided."""
        print(f"Method: {request.method}, Path: {request.path}, Params: {request.query_params}")

        try:
            user_inst = CustomUser.objects.get(net_id=net_id)
        except CustomUser.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if term:
            try:
                term_id = AcademicTerm.objects.get(term_code=term).id
                queryset = CalendarConfiguration.objects.filter(user=user_inst, term_id=term_id)
            except AcademicTerm.DoesNotExist:
                return Response({"detail": "Term not found."}, status=status.HTTP_404_NOT_FOUND)
        else:
            queryset = CalendarConfiguration.objects.filter(user=user_inst)

        serializer = CalendarConfigurationSerializer(queryset, many=True)
        return Response(serializer.data)

    def put(self, request, net_id: str, term: int) -> Response:
        """Create a new calendar configuration for the user."""
        print(f"Method: {request.method}, Path: {request.path}, Params: {request.query_params}")
        term_id = AcademicTerm.objects.get(term_code=term).id

        calendar_name = request.data.get("calendar_name", self.DEFAULT_CALENDAR_NAME)
        if not calendar_name:
            return Response({"detail": "Calendar name is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_inst = get_user(net_id)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)

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

    def post(self, request, net_id: str, term: int) -> Response:
        """Update an existing calendar configuration."""
        print(f"Method: {request.method}, Path: {request.path}, Params: {request.query_params}")
        term_id = AcademicTerm.objects.get(term_code=term).id

        calendar_name = request.data.get("calendar_name")
        if not calendar_name:
            return Response({"detail": "Calendar name is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_inst = get_user(net_id)
            calendar = get_calendar(user_inst, calendar_name, term_id)
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

    def delete(self, request, net_id: str, term: int) -> Response:
        """Delete an existing calendar configuration."""
        print(f"Method: {request.method}, Path: {request.path}, Params: {request.query_params}")
        term_id = AcademicTerm.objects.get(term_code=term).id

        calendar_name = request.data.get("calendar_name")
        if not calendar_name:
            return Response({"detail": "Calendar name is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_inst = get_user(net_id)
            calendar = get_calendar(user_inst, calendar_name, term_id)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)

        try:
            calendar_name = calendar.name
            calendar.delete()

            return Response({"detail": f"Calendar '{calendar_name}' deleted successfully."}, status=status.HTTP_200_OK)

        except Exception:
            return Response({"detail": "Failed to delete calendar."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
