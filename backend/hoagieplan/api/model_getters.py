from typing import List

from hoagieplan.models import AcademicTerm, CalendarConfiguration, CalendarEvent, Course, CustomUser, Section


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


def get_section(course: Course, class_section: str) -> List[Section]:
    """Retrieve Section."""
    try:
        return list(Section.objects.filter(course=course, class_section=class_section))
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


def get_calendar_event(
    calendar_configuration: CalendarConfiguration, course: Course, section: Section
) -> CalendarEvent:
    """Retrieve CalendarEvent."""
    event = CalendarEvent.objects.filter(
        calendar_configuration=calendar_configuration, course=course, section=section
    ).first()
    if event is None:
        raise Exception("CalendarEvent not found")

    return event


def get_calendar_events(calendar_configuration: CalendarConfiguration, course: Course):
    events = CalendarEvent.objects.filter(
        calendar_configuration=calendar_configuration,
        course=course,
    )
    if not events.exists():
        raise Exception("CalendarEvent not found")
    return events
