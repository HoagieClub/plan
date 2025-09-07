from hoagieplan.models import AcademicTerm, CalendarConfiguration, CustomUser


def get_user(net_id: str) -> CustomUser:
    """Retrieve CustomUser configuration."""
    try:
        return CustomUser.objects.get(net_id=net_id)
    except CustomUser.DoesNotExist as error:
        raise Exception("User not found") from error


def get_term(term_code: str) -> AcademicTerm:
    """Retrieve CustomUser configuration."""
    try:
        return AcademicTerm.objects.get(term_code=term_code)
    except AcademicTerm.DoesNotExist as error:
        raise Exception("AcademicTerm not found") from error


def get_calendar(user_inst: CustomUser, calendar_name: str, term_id: str) -> CalendarConfiguration:
    """Retrieve calendar configuration."""
    try:
        return CalendarConfiguration.objects.get(user=user_inst, name=calendar_name, term_id=term_id)
    except CalendarConfiguration.DoesNotExist as error:
        raise Exception("Calendar not found") from error
