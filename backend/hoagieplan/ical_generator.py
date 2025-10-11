import json
from datetime import date, datetime, timedelta
from typing import Dict, List

import icalendar
import pytz
from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_POST
from icalendar import Event

# Maps from day abbreviations to days used in ical rrule
DAY_DICT = {"M": "MO", "T": "TU", "W": "WE", "Th": "TH", "F": "FR"}

# Offset for first class of the semester
DAYS_OFFSET = {
    "M": timedelta(days=0),
    "T": timedelta(days=1),
    "W": timedelta(days=2),
    "Th": timedelta(days=3),
    "F": timedelta(days=4),
}

# Start date for each semester
START_DATE = {
    "1242": date(2023, 9, 5),
    "1244": date(2024, 1, 30),
    "1252": date(2024, 9, 3),
    "1254": date(2025, 1, 27),
    "1262": date(2025, 9, 2),
    "1264": date(2026, 1, 26),
}

# End date for each semester
END_DATE = {
    "1242": date(2023, 12, 7),
    "1244": date(2024, 4, 29),
    "1252": date(2024, 12, 5),
    "1254": date(2025, 4, 26),
    "1262": date(2025, 12, 4),
    "1264": date(2026, 4, 24),
}


@require_POST
def export_calendar_view(request):
    """Export calendar as iCal file."""
    try:
        data = json.loads(request.body)
        term = data.get("term")
        class_sections = data.get("class_sections", [])

        if not term:
            return JsonResponse({"error": "Missing term"}, status=400)

        if not class_sections:
            return JsonResponse({"error": "No sections provided"}, status=400)

        ical_content = generate_full_schedule_ical(class_sections, term)

        response = HttpResponse(ical_content, content_type="text/calendar")
        response["Content-Disposition"] = f'attachment; filename="{term}_schedule.ics"'
        return response

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


def generate_class_ical(cal: icalendar.Calendar, calendar_event: Dict, semester_code: str) -> icalendar.Calendar:
    """Add calendar_event in semester_code to cal."""
    # Create event
    event = Event()

    # Required fields
    section = calendar_event.get("section")
    course = calendar_event.get("course")
    course_name = course.get("department_code") + course.get("catalog_number")
    section_number = section.get("class_section")

    start_time_str = calendar_event.get("startTime") or section.get("class_meetings", [{}])[0].get("start_time")
    end_time_str = calendar_event.get("endTime") or section.get("class_meetings", [{}])[0].get("end_time")
    start_time = datetime.strptime(start_time_str, "%H:%M").time()
    end_time = datetime.strptime(end_time_str, "%H:%M").time()

    instructor = section.get("instructor").get("name")

    # Extract start and end dates from constants
    days_of_week = section.get("class_meetings")[0].get("days")
    first_day = days_of_week.split(",")[0]
    start_date = START_DATE[semester_code] + DAYS_OFFSET[first_day]
    end_date = END_DATE[semester_code]

    # Extract description
    course_name = course.get("crosslistings")

    # Validate required fields
    if not all([course_name, section_number, start_time, end_time, days_of_week, start_date, end_date]):
        print(f"Skipping incomplete section: {course_name}")
        return cal

    # Combine start date, time with EST timezone
    est_tz = pytz.timezone("US/Eastern")

    start_datetime = est_tz.localize(datetime.combine(start_date, start_time))
    end_datetime = est_tz.localize(datetime.combine(start_date, end_time))

    # Set event details
    event.add("summary", f"{course_name} - {section_number}")
    event.add("dtstart", start_datetime)
    event.add("dtend", end_datetime)

    # Add course description
    description = course_name + "\nInstructor: " + instructor
    if description:
        event.add("description", description)
    else:
        print("No description")

    # Add location
    location = section.get("class_meetings")[0].get("building_name")
    room = section.get("class_meetings")[0].get("room")
    full_location = location + " " + room
    if full_location:
        event.add("location", full_location)
    else:
        print("No location")

    if instructor:
        event.add("organizer", instructor)
    else:
        print("No instructor")

    # Add recurrence rule
    event.add(
        "rrule",
        {
            "freq": "WEEKLY",
            "byday": days_of_week_list(days_of_week),
            "until": est_tz.localize(datetime.combine(end_date, end_time)),
        },
    )

    # Add event to calendar
    cal.add_component(event)

    return cal


def generate_full_schedule_ical(class_sections: List[Dict], semester_code: str):
    """Generate an iCalendar file for multiple class sections."""
    # Create a new calendar
    cal = icalendar.Calendar()

    # Set calendar properties
    cal.add("prodid", "-//Princeton University Class Schedule//EN")
    cal.add("version", "2.0")

    # Process each class section
    for section in class_sections:
        cal = generate_class_ical(cal, section, semester_code)

    # Return the calendar as a string
    return cal.to_ical().decode("utf-8")


def days_of_week_list(days_of_week):
    days_of_week_list = days_of_week.split(",")
    new_days_of_week_list = []

    for day in days_of_week_list:
        day = day.strip()
        new_days_of_week_list.append(DAY_DICT[day])

    return new_days_of_week_list


# Example usage
def main():
    # List of class sections
    class_sections = [
        {
            "course": {
                "add_consent": "N",
                "catalog_number": "418",
                "course_id": "013749",
                "crosslistings": "COS 418",
                "department_code": "COS",
                "description": """This course covers the design and implementation of
                distributed systems. Students will gain an understanding of the principles and
                techniques behind the design of modern, reliable, and high-performance distributed
                systems. Topics include server design, network programming, naming, concurrency and
                locking, consistency models and techniques, and fault tolerance.  Modern techniques
                and systems employed at some of the largest Internet sites (e.g., Google,  Amazon)
                will also be covered.  Through programming assignments, students will gain practical
                experience designing, implementing, and debugging real distributed systems.""",
                "distribution_area_long": "",
                "distribution_area_short": "",
                "drop_consent": "N",
                "grading_basis": "NAU",
                "guid": "1254013749",
                "long_title": "Distributed Systems",
                "reading_list": """The Go Programming Language//Alan A.Donovan and Brian Kernighan;
                Distributed Systems: Principles and Paradigms//Andrew S. Tanenbaum and Maaten Van Steen;
                Guide to Reliable Distributed Systems//Kenneth P. Birman""",
                "reading_writing_assignment": """5 programming assignments. Prior knowledge of Go or other
                system programming experience would be useful, but not required.""",
                "title": "Distributed Systems",
                "transcript_title": "Distributed Systems",
                "web_address": "www.cs.princeton.edu/courses/archive/spring24/cos418",
            },
            "endRowIndex": 19,
            "endTime": "10:50",
            "isActive": True,
            "isChosen": False,
            "key": "guid: 1254013749, section id: 87114, class meeting id: 63680, column: 1",
            "needsChoice": False,
            "section": {
                "capacity": 150,
                "class_meetings": [
                    {
                        "building_name": "ComSciBldg 104",
                        "days": "M,W",
                        "end_time": "10:50",
                        "id": 63680,
                        "room": "TBD",
                        "start_time": "10:00",
                    }
                ],
                "class_section": "L01",
                "class_type": "Lecture",
                "course": {"course_id": "013749", "title": "Distributed Systems"},
                "enrollment": 81,
                "id": 87114,
                "instructor": {"name": "Michael J. Freedman"},
                "startColumnIndex": 1,
                "startRowIndex": 14,
                "startTime": "10:00",
            },
        },
        {
            "course": {
                "add_consent": "N",
                "catalog_number": "307",
                "course_id": "007998",
                "crosslistings": "ORF 307 / EGR 307",
                "department_code": "ORF",
                "description": """This course focuses on analytical and computational tools for
                optimization. We will introduce least-squares optimization with multiple objectives
                and constraints. We will also discuss linear optimization modeling, duality, the
                simplex method, degeneracy, interior point methods and network flow optimization.
                Finally, we will cover integer programming and branch-and-bound algorithms. A broad
                spectrum of real-world applications in engineering, finance and statistics is
                presented.""",
                "distribution_area_long": "",
                "distribution_area_short": "",
                "drop_consent": "N",
                "grading_basis": "NAU",
                "guid": "1254007998",
                "long_title": "Optimization",
                "reading_list": """Introduction to Linear Optimization//D. Bertsimas, J. Tsitsiklis;
                Linear Programming: Foundations & Extensions, 5th edition//Robert Vanderbei""",
                "reading_writing_assignment": "Weekly problem sets.",
                "title": "Optimization",
                "transcript_title": "Optimization",
                "web_address": "stellato.io/teaching/orf307",
            },
            "endRowIndex": 28,
            "endTime": "12:20",
            "isActive": True,
            "isChosen": False,
            "key": "guid: 1254007998, section id: 85784, class meeting id: 61373, column: 2",
            "needsChoice": False,
            "section": {
                "capacity": 114,
                "class_meetings": [
                    {
                        "building_name": "Sherrerd Hall 104",
                        "days": "T, Th",
                        "end_time": "12:20",
                        "id": 61373,
                        "room": "TBD",
                        "start_time": "11:00",
                    }
                ],
                "class_section": "L01",
                "class_type": "Lecture",
                "course": {"course_id": "007998", "title": "Optimization"},
                "enrollment": 109,
                "id": 85784,
                "instructor": {"name": "Bartolomeo Stellato"},
                "startColumnIndex": 2,
                "startRowIndex": 20,
                "startTime": "11:00",
            },
        },
    ]

    # Generate iCal
    ical_content = generate_full_schedule_ical(class_sections, "1254")

    # Write to file
    with open("class_schedule.ics", "w") as f:
        f.write(ical_content)

    print("iCalendar file generated successfully!")


if __name__ == "__main__":
    main()
