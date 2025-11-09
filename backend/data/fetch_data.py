import argparse
import csv
import os
import time
from concurrent.futures import ThreadPoolExecutor
from typing import List, Tuple

from constants import DEPTS, SEMESTER_TO_TERM_CODE
from data.courses_api_responses_models import Course, Courses_Courses_Response, Term
from data.req_lib import ReqLib

# Note to future developers: This script can be made much faster if made asynchronous.

# -------------------------------------------------------------------------------------#

TERM_FIELDS = ["Term Code", "Term Name"]

SUBJECT_FIELDS = ["Subject Code", "Subject Name"]

COURSE_FIELDS = [
    "Course ID",
    "Course GUID",
    "Catalog Number",
    "Course Title",
    "Course Start Date",
    "Course End Date",
    "Course Track",
    "Course Description",
    "Has Seat Reservations",
]

INSTRUCTOR_FIELDS = [
    "Instructor EmplID",
    "Instructor First Name",
    "Instructor Last Name",
    "Instructor Full Name",
]

CROSSLISTING_FIELDS = ["Crosslisting Subjects", "Crosslisting Catalog Numbers"]

CLASS_FIELDS = [
    "Class Number",
    "Class Section",
    "Class Status",
    "Class Type",
    "Class Capacity",
    "Class Enrollment",
    "Class Year Enrollments",
]

MEETING_FIELDS = [
    "Meeting Number",
    "Meeting Start Time",
    "Meeting End Time",
    "Meeting Days",
    "Building Name",
    "Meeting Room",
]

COURSE_DETAILS_FIELDS = [
    "Drop Consent",
    "Grading Oral Presentation",
    "Other Information",
    "Subject",
    "Catnum",
    "Seat Reservations",
    "Reading Writing Assignment",
    "Grading Quizzes",
    "Distribution Area Long",
    "Grading Home Mid Exam",
    "Transcript Title",
    "Add Consent",
    "Web Address",
    "Grading Other Exam",
    "Topic Title",
    "Grading Lab Reports",
    "Other Requirements",
    "Other Restrictions",
    "Grading Paper Final Exam",
    "Grading Paper Midterm Exam",
    "Crosslistings",
    "Grading Papers",
    "Grading Mid Exam",
    "Grading Prog Assign",
    "Grading Basis",
    "Grading Final Exam",
    "Grading Design Projects",
    "Grading Other",
    "Long Title",
    "Grading Home Final Exam",
    "Grading Problem Sets",
    "Distribution Area Short",
    "Grading Precept Part",
    "Grading Term Papers",
]
READING_LIST_FIELDS = [f"Reading List Title {i}" for i in range(1, 7)] + [
    f"Reading List Author {i}" for i in range(1, 7)
]

FIELDS = [
    TERM_FIELDS,
    SUBJECT_FIELDS,
    COURSE_FIELDS,
    INSTRUCTOR_FIELDS,
    CROSSLISTING_FIELDS,
    CLASS_FIELDS,
    MEETING_FIELDS,
    COURSE_DETAILS_FIELDS,
    READING_LIST_FIELDS,
]

FIELD_NAMES = sum(FIELDS, [])


def fetch_list_of_courses(subject, term, req_lib) -> Courses_Courses_Response:
    # Fetch all offered courses from a department
    courses = req_lib.getJSON(req_lib.configs.COURSES_COURSES, fmt="json", term=term, subject=subject)
    courses_response = Courses_Courses_Response(courses["term"])
    return courses_response


def fetch_course_detail(course_id, term, req_lib):
    """Fetch course details for a given course_id and term."""
    return course_id, req_lib.getJSON(req_lib.configs.COURSES_DETAILS, fmt="json", term=term, course_id=course_id)


def fetch_data(subject, term: int, req_lib) -> Tuple[Courses_Courses_Response, dict, dict]:
    """Fetch course and seat information for a given subject and term."""
    # Fetch all offered courses from a department
    courses = fetch_list_of_courses(subject, term, req_lib)

    # Extract the course IDs
    course_ids = [
        course_id.course_id
        for subjects in courses.term
        for courses in subjects.subjects
        for course_id in courses.courses
    ]

    print(f"Fetched {len(course_ids)} course IDs from {subject}.")
    print(f"Course IDs: {course_ids}")

    # Parallel fetching of course details
    with ThreadPoolExecutor(max_workers=16) as executor:
        futures = [executor.submit(fetch_course_detail, course_id, term, req_lib) for course_id in course_ids]
        course_details = {course_id: detail for course_id, detail in (future.result() for future in futures)}

    # Reserved seats endpoint requires the course IDs to be a comma separated list
    course_ids = ",".join(course_ids)
    seat_info = req_lib.getJSON(req_lib.configs.COURSES_RESSEATS, fmt="json", term=term, course_ids=course_ids)

    if not seat_info.get("course"):
        print(f"No reserved seating info found for course_ids: {course_ids}")

    return courses, seat_info, course_details


# --------------------------------------------------------------------------------------


def process_course(term: Term, subject, course: Course, seat_mapping, course_details, writer):
    """Extract information from each course from the courses/courses endpoint, and course details from the courses/details endpoint.

    Handles courses with multiple instructors gracefully.
    """
    common_data = extract_common_data(term, subject, course)
    course_details_data = extract_course_details(course_details)
    crosslisting_data = extract_crosslisting_data(course.crosslistings)

    # Pre-process class and meeting data since it's not instructor-dependent
    classes_data = []
    for course_class in course.classes:
        class_data = extract_class_data(course_class, seat_mapping)

        for meeting in course_class.schedule.meetings:
            meeting_data = extract_meeting_data(meeting)
            # Combine class data with each of its meeting data
            classes_data.append({**class_data, **meeting_data})

    # Process instructor-dependent data
    for instructor in course.instructors:
        instructor_data = extract_instructor_data(instructor)

        # For each class and meeting combination, add instructor data and write row
        for class_meeting_data in classes_data:
            row_data = {
                **common_data,
                **instructor_data,
                **crosslisting_data,
                **class_meeting_data,  # This now includes both class and meeting data
                **course_details_data,
            }
            writer.writerow(row_data)


# --------------------------------------------------------------------------------------


def process_courses(courses: Courses_Courses_Response, seat_info, course_details, writer):
    """Process all courses from the courses/courses endpoint."""
    seat_mapping = {seat["course_id"]: seat for seat in seat_info.get("course", [])}
    for term in courses.term:  # Loop through each term
        for subject in term.subjects:  # Loop through each subject
            for course in subject.courses:  # Loop through each course
                if not course_details:
                    print("No course details provided Possible issue with the server.")
                    continue
                # Fetch the course details and process each course
                course_id = course.course_id
                course_dict = course_details.get(course_id)
                if course_dict is None:
                    print(f"Data for course ID {course_id} not found. Possible issue with the server.")
                    continue
                course_detail = course_dict.get("course_details", {})
                process_course(term, subject, course, seat_mapping, course_detail, writer)


# --------------------------------------------------------------------------------------


def extract_common_data(term, subject, course: Course):
    """Extract data from the /courses/courses endpoint given a subject and its corresponding course."""
    course_detail = course.detail

    data = {
        "Term Code": term.code,
        "Term Name": term.suffix,
        "Subject Code": subject.code,
        "Subject Name": subject.name,
        "Course ID": course.course_id,
        "Course GUID": course.guid,
        "Catalog Number": course.catalog_number,
        "Course Title": course.title,
        "Course Start Date": course_detail.start_date,
        "Course End Date": course_detail.end_date,
        "Course Track": course_detail.track,
        "Course Description": course_detail.description,
        "Has Seat Reservations": course_detail.seat_reservations,
    }

    # Handle newline characters
    for key, value in data.items():
        if isinstance(value, str):
            data[key] = value.replace("\n", "")

    return data


# --------------------------------------------------------------------------------------


def extract_instructor_data(instructor):
    """CPU-bound function."""
    return {
        "Instructor EmplID": instructor.emplid,
        "Instructor First Name": instructor.first_name,
        "Instructor Last Name": instructor.last_name,
        "Instructor Full Name": instructor.full_name,
    }


# --------------------------------------------------------------------------------------


def extract_crosslisting_data(crosslistings):
    """CPU-bound function."""
    crosslisting_subjects = [crosslisting.subject for crosslisting in crosslistings]
    crosslisting_catalog_numbers = [crosslisting.catalog_number for crosslisting in crosslistings]
    return {
        "Crosslisting Subjects": ",".join(crosslisting_subjects),
        "Crosslisting Catalog Numbers": ",".join(crosslisting_catalog_numbers),
    }


# --------------------------------------------------------------------------------------


def extract_class_data(course_class, seat_mapping):
    class_number = course_class.class_number
    seat_mapping_data = next(iter(seat_mapping.values()), {}) if seat_mapping else {}

    # Find the class information based on class_number
    class_info_found = next(
        (
            class_info
            for class_info in seat_mapping_data.get("classes", [])
            if class_info["class_number"] == class_number
        ),
        None,
    )

    if class_info_found:
        # Handle both cases: single dictionary and list of dictionaries
        enrollments = class_info_found.get("class_year_enrollments", [])
        if isinstance(enrollments, dict):
            # If it's a dictionary, convert it to a list of one dictionary
            enrollments = [enrollments]

        # Extract and format class year enrollments
        class_year_enrollments = [
            f"Year {enrollment['class_year']}: {enrollment['enrl_seats']} students" for enrollment in enrollments
        ]
    else:
        class_year_enrollments = []

    class_year_enrollments_str = ", ".join(class_year_enrollments) or "Class year demographics unavailable"

    return {
        "Class Number": class_number,
        "Class Section": course_class.section,
        "Class Status": course_class.status,
        "Class Type": course_class.type_name,
        "Class Capacity": course_class.capacity,
        "Class Enrollment": course_class.enrollment,
        "Class Year Enrollments": class_year_enrollments_str,
    }


# --------------------------------------------------------------------------------------


def extract_course_details(course_details):
    """CPU-bound function."""
    if not course_details:
        print("No course details provided. Possible issue with the server. Skipping...")
        return {}

    course_detail = course_details.get("course_detail", {})
    seat_reservations = course_detail.get("seat_reservations", {}) or {}
    seat_reservation = seat_reservations.get("seat_reservation", [])
    if isinstance(seat_reservation, dict):
        seat_reservation = [seat_reservation]

    seat_reservations_formatted = "; ".join(
        f"Section: {reservation['class_section']}, Description: {reservation['description']}, Capacity: {reservation['enrl_cap']}"
        for reservation in seat_reservation
        if isinstance(reservation, dict)
    )
    data = {
        "Drop Consent": course_detail.get("drop_consent", ""),
        "Grading Oral Presentation": course_detail.get("grading_oral_pres", ""),
        "Other Information": course_detail.get("other_information", ""),
        "Subject": course_detail.get("subject", ""),
        "Seat Reservations": seat_reservations_formatted,
        "Catnum": course_detail.get("catnum", ""),
        "Reading Writing Assignment": (course_detail.get("reading_writing_assignment") or ""),
        "Grading Quizzes": course_detail.get("grading_quizzes", ""),
        "Distribution Area Long": course_detail.get("distribution_area_long", ""),
        "Grading Home Mid Exam": course_detail.get("grading_home_mid_exam", ""),
        "Transcript Title": course_detail.get("transcript_title", ""),
        "Add Consent": course_detail.get("add_consent", ""),
        "Web Address": course_detail.get("web_address", ""),
        "Grading Other Exam": course_detail.get("grading_other_exam", ""),
        "Topic Title": course_detail.get("topic_title", ""),
        "Grading Lab Reports": course_detail.get("grading_lab_reports", ""),
        "Other Requirements": course_detail.get("other_requirements", ""),
        "Other Restrictions": course_detail.get("other_restrictions", ""),
        "Grading Paper Final Exam": course_detail.get("grading_paper_final_exam", ""),
        "Grading Paper Midterm Exam": course_detail.get("grading_paper_mid_exam", ""),
        "Crosslistings": course_detail.get("crosslistings", ""),
        "Grading Papers": course_detail.get("grading_papers", ""),
        "Grading Mid Exam": course_detail.get("grading_mid_exam", ""),
        "Grading Prog Assign": course_detail.get("grading_prog_assign", ""),
        "Grading Basis": course_detail.get("grading_basis", ""),
        "Grading Final Exam": course_detail.get("grading_final_exam", ""),
        "Grading Design Projects": course_detail.get("grading_design_projects", ""),
        "Grading Other": course_detail.get("grading_other", ""),
        "Long Title": course_detail.get("long_title", ""),
        "Grading Home Final Exam": course_detail.get("grading_home_final_exam", ""),
        "Grading Problem Sets": course_detail.get("grading_prob_sets", ""),
        "Distribution Area Short": course_detail.get("distribution_area_short", ""),
        "Grading Precept Part": course_detail.get("grading_precept_part", ""),
        "Grading Term Papers": course_detail.get("grading_term_papers", ""),
    }

    # Handle potential variability in reading list titles
    max_reading_lists = 6
    for i in range(1, max_reading_lists + 1):
        title_key = f"Reading List Title {i}"
        author_key = f"Reading List Author {i}"
        data[title_key] = course_detail.get(f"reading_list_title_{i}", "")
        data[author_key] = course_detail.get(f"reading_list_author_{i}", "")

    # Handle newline characters
    for key, value in data.items():
        if isinstance(value, str):
            data[key] = value.replace("\n", "")

    return data


# --------------------------------------------------------------------------------------


def extract_meeting_data(meeting):
    """CPU-bound function."""
    days = ",".join(meeting.days)
    return {
        "Meeting Number": meeting.meeting_number,
        "Meeting Start Time": meeting.start_time,
        "Meeting End Time": meeting.end_time,
        "Meeting Days": days,
        "Building Name": meeting.building.name if meeting.building else "Canceled",
        "Meeting Room": meeting.room if meeting.room else "TBD",
    }


# --------------------------------------------------------------------------------------


def get_semesters_and_depts_from_args() -> Tuple[List[str], List[str]]:
    parser = argparse.ArgumentParser(description="Fetch academic course data for specified semesters.")
    parser.add_argument(
        "-s", "--semesters", nargs="+", metavar="SEM", help="Semesters to generate CSVs for, e.g. f2019 s2022"
    )
    parser.add_argument(
        "-d", "--departments", nargs="+", metavar="DEPT", help="Departments to generate CSVs for, e.g. COS MAT"
    )
    args = parser.parse_args()

    if not args.semesters:
        print("No semesters provided as arguments. Please enter the semesters separated by spaces:")
        args.semesters = input().split()
    if not args.departments:
        print("No departments provided as arguments. Using all departments by default.")
        args.departments = list(DEPTS.keys())

    return args.semesters, args.departments


# --------------------------------------------------------------------------------------


def generate_csv(semester: str, subject: str, req_lib: ReqLib):
    os.makedirs(semester, exist_ok=True)

    copy_n = 0
    csv_file = f"{semester}/{subject}.csv"

    # Check if file already exists
    while os.path.exists(csv_file):
        copy_n += 1
        csv_file = f"{semester}/{subject}_{copy_n}.csv"

    with open(csv_file, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=FIELD_NAMES)
        writer.writeheader()

        term_info, seat_info, course_details = fetch_data(subject, SEMESTER_TO_TERM_CODE[semester], req_lib)
        process_courses(term_info, seat_info, course_details, writer)


# --------------------------------------------------------------------------------------


# Usage: python fetch_data.py -s s2026 -d COS MAT
# Usage: python fetch_data.py -s s2026 -d
# A list of departments can be specified. If none are given, all departments will be used.
def main():
    req_lib = ReqLib()

    semesters, departments = get_semesters_and_depts_from_args()

    for semester in semesters:
        for department in departments:
            if semester in SEMESTER_TO_TERM_CODE.keys() and department in DEPTS.keys():
                generate_csv(semester, department, req_lib)
            else:
                print(f"Warning: Semester '{semester}' not found in available semesters. Skipping.")


if __name__ == "__main__":
    print("Fetching course data...")
    start_time = time.time()
    main()
    end_time = time.time()
    print(f"Execution time: {(end_time - start_time):.2f} seconds")
