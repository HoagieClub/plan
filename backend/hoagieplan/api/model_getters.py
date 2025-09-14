from hoagieplan.models import AcademicTerm, CalendarConfiguration, Course, CustomUser, Section


def get_user(net_id: str) -> CustomUser:
    """Retrieve CustomUser."""
    try:
        return CustomUser.objects.get(net_id=net_id)
    except CustomUser.DoesNotExist as error:
        raise Exception("User not found") from error


def get_course(guid: str) -> Course:
    """Retrieve Course."""
    try:
        return Course.objects.get(guid=guid)
    except Course.DoesNotExist as error:
        raise Exception("Course not found") from error


def get_section(course: Course) -> Course:
    """Retrieve Section."""
    try:
        return Section.objects.get(course=course)
    except Course.DoesNotExist as error:
        raise Exception("Course not found") from error


def get_term(term_code: str) -> AcademicTerm:
    """Retrieve CustomUser."""
    try:
        return AcademicTerm.objects.get(term_code=term_code)
    except AcademicTerm.DoesNotExist as error:
        raise Exception("AcademicTerm not found") from error


def get_calendar(user_inst: CustomUser, calendar_name: str, term_id: str) -> CalendarConfiguration:
    """Retrieve CalendarConfiguration."""
    try:
        return CalendarConfiguration.objects.get(user=user_inst, name=calendar_name, term_id=term_id)
    except CalendarConfiguration.DoesNotExist as error:
        raise Exception("Calendar not found") from error
