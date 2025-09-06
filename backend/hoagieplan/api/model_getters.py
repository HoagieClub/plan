from hoagieplan.models import CalendarConfiguration, CustomUser


def get_user(net_id: str) -> CustomUser:
    """Retrieve CustomUser configuration."""
    try:
        return CustomUser.objects.get(net_id=net_id)
    except CustomUser.DoesNotExist as error:
        raise Exception("User not found") from error


def get_calendar(user_inst: CustomUser, calendar_name: str, term_id: str) -> CalendarConfiguration:
    """Retrieve calendar configuration."""
    try:
        calendar = CalendarConfiguration.objects.get(user=user_inst, name=calendar_name, term_id=term_id)
        return calendar, user_inst
    except CustomUser.DoesNotExist as error:
        print("User not found")
        raise Exception("User not found") from error
    except CalendarConfiguration.DoesNotExist as error:
        print("Calendar not found")
        raise Exception("Calendar not found") from error
