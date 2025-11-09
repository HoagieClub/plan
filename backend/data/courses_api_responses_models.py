from typing import List, Optional


class Building:
    location_code: str
    name: str

    def __init__(self, location_code: str, name: str):
        """Create Building object."""
        self.location_code = location_code
        self.name = name


class Meeting:
    meeting_number: str
    start_time: str
    end_time: str
    room: str
    days: List[str]
    building: Building

    def __init__(
        self,
        meeting_number: str,
        start_time: str,
        end_time: str,
        room: Optional[str] = None,
        days: Optional[List[str]] = None,
        building: Optional[dict] = None,
    ):
        """Create Meeting object."""
        self.meeting_number = meeting_number
        self.start_time = start_time
        self.end_time = end_time
        self.room = room if room is not None else "TBD"
        self.days = days if days is not None else []
        if building is None:
            self.building = Building(location_code="", name="Canceled")
        else:
            self.building = Building(**building) if isinstance(building, dict) else building


class Schedule:
    start_date: str
    end_date: str
    meetings: List[Meeting]

    def __init__(self, start_date: str, end_date: str, meetings: List[dict]):
        """Create Schedule object."""
        self.start_date = start_date
        self.end_date = end_date
        self.meetings = []
        for m in meetings:
            if isinstance(m, dict):
                # Only create Meeting if required fields are present
                if "meeting_number" in m and "start_time" in m and "end_time" in m:
                    self.meetings.append(Meeting(**m))
            else:
                self.meetings.append(m)


class ClassSection:
    class_number: str
    section: str
    status: str
    pu_calc_status: str
    seat_status: str
    type_name: str
    capacity: str
    enrollment: str
    schedule: Schedule

    def __init__(
        self,
        class_number: str,
        section: str,
        status: str,
        pu_calc_status: str,
        seat_status: str,
        type_name: str,
        capacity: str,
        enrollment: str,
        schedule: dict,
    ):
        """Create ClassSection object."""
        self.class_number = class_number
        self.section = section
        self.status = status
        self.pu_calc_status = pu_calc_status
        self.seat_status = seat_status
        self.type_name = type_name
        self.capacity = capacity
        self.enrollment = enrollment
        self.schedule = Schedule(**schedule) if isinstance(schedule, dict) else schedule


class Crosslisting:
    subject: str
    catalog_number: str

    def __init__(self, subject: str, catalog_number: str):
        """Create Crosslisting object."""
        self.subject = subject
        self.catalog_number = catalog_number


class Instructor:
    emplid: str
    first_name: str
    last_name: str
    full_name: str

    def __init__(self, emplid: str, first_name: str, last_name: str, full_name: str):
        """Create Instructor object."""
        self.emplid = emplid
        self.first_name = first_name
        self.last_name = last_name
        self.full_name = full_name


class CourseDetail:
    start_date: str
    end_date: str
    track: str
    description: str
    seat_reservations: str

    def __init__(self, start_date: str, end_date: str, track: str, description: str, seat_reservations: str):
        """Create CourseDetail object."""
        self.start_date = start_date
        self.end_date = end_date
        self.track = track
        self.description = description
        self.seat_reservations = seat_reservations


class Course:
    guid: str
    course_id: str
    catalog_number: str
    title: str
    detail: CourseDetail
    instructors: List[Instructor]
    crosslistings: List[Crosslisting]
    classes: List[ClassSection]

    def __init__(
        self,
        guid: str,
        course_id: str,
        catalog_number: str,
        title: str,
        detail: dict,
        instructors: List[dict],
        crosslistings: List[dict],
        classes: List[dict],
    ):
        """Create Course object."""
        self.guid = guid
        self.course_id = course_id
        self.catalog_number = catalog_number
        self.title = title
        self.detail = CourseDetail(**detail) if isinstance(detail, dict) else detail
        self.instructors = [Instructor(**i) if isinstance(i, dict) else i for i in instructors]
        self.crosslistings = [Crosslisting(**c) if isinstance(c, dict) else c for c in crosslistings]
        self.classes = [ClassSection(**c) if isinstance(c, dict) else c for c in classes]


class Subject:
    code: str
    name: str
    courses: List[Course]

    def __init__(self, code: str, name: str, courses: List[dict]):
        """Create Subject object."""
        self.code = code
        self.name = name
        self.courses = [Course(**c) if isinstance(c, dict) else c for c in courses]


class Term:
    code: str
    suffix: str
    name: str
    cal_name: str
    reg_name: str
    start_date: str
    end_date: str
    subjects: List[Subject]

    def __init__(
        self,
        code: str,
        suffix: str,
        name: str,
        cal_name: str,
        reg_name: str,
        start_date: str,
        end_date: str,
        subjects: List[dict],
    ):
        """Create Term object."""
        self.code = code
        self.suffix = suffix
        self.name = name
        self.cal_name = cal_name
        self.reg_name = reg_name
        self.start_date = start_date
        self.end_date = end_date
        self.subjects = [Subject(**s) if isinstance(s, dict) else s for s in subjects]


class Courses_Courses_Response:
    term: List[Term]

    def __init__(self, term: List[dict]):
        """Create Courses_Courses_Response object."""
        self.term = [Term(**t) if isinstance(t, dict) else t for t in term]

    def __str__(self):
        """Return string representation of Courses_Courses_Response."""
        term_summaries = []
        for t in self.term:
            total_subjects = len(t.subjects)
            total_courses = sum(len(s.courses) for s in t.subjects)
            term_summaries.append(
                f"Term {t.name} ({t.code}): {total_subjects} subjects, {total_courses} courses"
            )

        return "Courses_Courses_Response(\n  " + "\n  ".join(term_summaries) + "\n)"


if __name__ == "__main__":
    # Example JSON data
    sample_data = {
        "term": [
            {
                "code": "1202",
                "suffix": "F2019",
                "name": "F19-20",
                "cal_name": "Fall 2019",
                "reg_name": "19-20 Fall",
                "start_date": "2019-09-10",
                "end_date": "2020-02-02",
                "subjects": [
                    {
                        "code": "COS",
                        "name": "Computer Science",
                        "courses": [
                            {
                                "guid": "1192002046",
                                "course_id": "002046",
                                "catalog_number": "109",
                                "title": "Computers in Our World",
                                "detail": {
                                    "start_date": "2018-09-12",
                                    "end_date": "2019-01-15",
                                    "track": "UGRD",
                                    "description": "How computers affect the world we live in",
                                    "seat_reservations": "N",
                                },
                                "instructors": [
                                    {
                                        "emplid": "010043181",
                                        "first_name": "Brian",
                                        "last_name": "Kernighan",
                                        "full_name": "Brian W. Kernighan",
                                    }
                                ],
                                "crosslistings": [{"subject": "EGR", "catalog_number": "109"}],
                                "classes": [
                                    {
                                        "class_number": "21276",
                                        "section": "L01",
                                        "status": "Open",
                                        "type_name": "Lecture",
                                        "capacity": "50",
                                        "enrollment": "41",
                                        "schedule": {
                                            "start_date": "2018-09-12",
                                            "end_date": "2019-01-15",
                                            "meetings": [
                                                {
                                                    "meeting_number": "1",
                                                    "start_time": "01:30 PM",
                                                    "end_time": "02:50 PM",
                                                    "room": "138",
                                                    "days": ["M", "W"],
                                                    "building": {"location_code": "0630", "name": "Lewis Library"},
                                                }
                                            ],
                                        },
                                    }
                                ],
                            }
                        ],
                    }
                ],
            }
        ]
    }

    response = Courses_Courses_Response(**sample_data)

    # Access the data
    print(f"Term: {response.term[0].name}")
    print(f"Course: {response.term[0].subjects[0].courses[0].title}")
    print(f"Instructor: {response.term[0].subjects[0].courses[0].instructors[0].full_name}")
