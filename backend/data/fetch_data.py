import argparse
import csv
import os
import time
from req_lib import ReqLib
from concurrent.futures import ThreadPoolExecutor

# Note to future developers: This script can be made much faster if made asynchronous.

# -------------------------------------------------------------------------------------#


def fetch_course_detail(course_id, term, req_lib):
    """Fetches course details for a given course_id and term.
    """
    # if course_id == '010855':
    #     return course_id, {}
    return course_id, req_lib.getJSON(
        req_lib.configs.COURSES_DETAILS, fmt="json", term=term, course_id=course_id
    )


def fetch_data(subject, term, req_lib):
    """Fetches course and seat information for a given subject and term.
    """
    # if subject in ['EEB', 'GHP', 'SPI']:
    #     print(f'Skipping department {subject} for now.')
    #     return {}, {}, {}

    # Fetch all offered courses from a department
    courses = req_lib.getJSON(
        req_lib.configs.COURSES_COURSES, fmt="json", term=term, subject=subject
    )

    # Extract the course IDs
    course_ids = [
        course_id.get("course_id", "")
        for subjects in courses.get("term", [])
        for courses in subjects.get("subjects", [])
        for course_id in courses.get("courses", [])
    ]

    print(f"Fetched {len(course_ids)} course IDs from {subject}.")

    # Parallel fetching of course details
    with ThreadPoolExecutor(max_workers=16) as executor:
        futures = [
            executor.submit(fetch_course_detail, course_id, term, req_lib)
            for course_id in course_ids
        ]
        course_details = {
            course_id: detail
            for course_id, detail in (future.result() for future in futures)
        }

    # Reserved seats endpoint requires the course IDs to be a comma separated list
    course_ids = ",".join(course_ids)
    seat_info = req_lib.getJSON(
        req_lib.configs.COURSES_RESSEATS, fmt="json", term=term, course_ids=course_ids
    )

    if not seat_info.get("course"):
        print(f"No reserved seating info found for course_ids: {course_ids}")

    return courses, seat_info, course_details


# --------------------------------------------------------------------------------------


def process_course(term, subject, course, seat_mapping, course_details, writer):
    """Extracts information from each course from the courses/courses endpoint,
    and course details from the courses/details endpoint. Handles courses with multiple instructors gracefully.
    """
    common_data = extract_common_data(term, subject, course)
    course_details_data = extract_course_details(course_details)
    crosslisting_data = extract_crosslisting_data(course.get("crosslistings", []))

    # Pre-process class and meeting data since it's not instructor-dependent
    classes_data = []
    for course_class in course.get("classes", []):
        class_data = extract_class_data(course_class, seat_mapping)

        for meeting in course_class.get("schedule", {}).get("meetings", []):
            meeting_data = extract_meeting_data(meeting)
            # Combine class data with each of its meeting data
            classes_data.append({**class_data, **meeting_data})

    # Process instructor-dependent data
    for instructor in course.get("instructors", []):
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


def process_courses(courses, seat_info, course_details, writer):
    """Processes all courses from the courses/courses endpoint.
    """
    seat_mapping = {seat["course_id"]: seat for seat in seat_info.get("course", [])}
    for term in courses.get("term", []):  # Loop through each term
        for subject in term.get("subjects", []):  # Loop through each subject
            for course in subject.get("courses", []):  # Loop through each course
                if not course_details:
                    print("No course details provided Possible issue with the server.")
                    continue
                # Fetch the course details and process each course
                course_id = course.get("course_id", "")
                course_dict = course_details.get(course_id)
                if course_dict is None:
                    print(
                        f"Data for course ID {course_id} not found. Possible issue with the server."
                    )
                    continue
                course_detail = course_dict.get("course_details", {})
                process_course(
                    term, subject, course, seat_mapping, course_detail, writer
                )


# --------------------------------------------------------------------------------------


def extract_common_data(term, subject, course):
    """Extracts data from the /courses/courses endpoint
    given a subject and its corresponding course.
    """
    course_detail = course.get("detail", {})

    data = {
        "Term Code": term.get("code", ""),
        "Term Name": term.get("suffix", ""),
        "Subject Code": subject.get("code", ""),
        "Subject Name": subject.get("name", ""),
        "Course ID": course.get("course_id", ""),
        "Course GUID": course.get("guid", ""),
        "Catalog Number": course.get("catalog_number", ""),
        "Course Title": course.get("title", ""),
        "Course Start Date": course_detail.get("start_date", ""),
        "Course End Date": course_detail.get("end_date", ""),
        "Course Track": course_detail.get("track", ""),
        "Course Description": course_detail.get("description", ""),
        "Has Seat Reservations": course_detail.get("seat_reservations", ""),
    }

    # Handle newline characters
    for key, value in data.items():
        if isinstance(value, str):
            data[key] = value.replace("\n", "")

    return data


# --------------------------------------------------------------------------------------


def extract_instructor_data(instructor):
    """CPU-bound function.
    """
    return {
        "Instructor EmplID": instructor.get("emplid", ""),
        "Instructor First Name": instructor.get("first_name", ""),
        "Instructor Last Name": instructor.get("last_name", ""),
        "Instructor Full Name": instructor.get("full_name", ""),
    }


# --------------------------------------------------------------------------------------


def extract_crosslisting_data(crosslistings):
    """CPU-bound function.
    """
    crosslisting_subjects = [
        crosslisting.get("subject", "") for crosslisting in crosslistings
    ]
    crosslisting_catalog_numbers = [
        crosslisting.get("catalog_number", "") for crosslisting in crosslistings
    ]
    return {
        "Crosslisting Subjects": ",".join(crosslisting_subjects),
        "Crosslisting Catalog Numbers": ",".join(crosslisting_catalog_numbers),
    }


# --------------------------------------------------------------------------------------


def extract_class_data(course_class, seat_mapping):
    class_number = course_class.get("class_number", "")
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
            f"Year {enrollment['class_year']}: {enrollment['enrl_seats']} students"
            for enrollment in enrollments
        ]
    else:
        class_year_enrollments = []

    class_year_enrollments_str = (
        ", ".join(class_year_enrollments) or "Class year demographics unavailable"
    )

    return {
        "Class Number": class_number,
        "Class Section": course_class.get("section", ""),
        "Class Status": course_class.get("status", ""),
        "Class Type": course_class.get("type_name", ""),
        "Class Capacity": course_class.get("capacity", ""),
        "Class Enrollment": course_class.get("enrollment", ""),
        "Class Year Enrollments": class_year_enrollments_str,
    }


# --------------------------------------------------------------------------------------


def extract_course_details(course_details):
    """CPU-bound function.
    """
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
        "Reading Writing Assignment": (
            course_detail.get("reading_writing_assignment") or ""
        ),
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
    """CPU-bound function.
    """
    days = ",".join(meeting.get("days", []))
    return {
        "Meeting Number": meeting.get("meeting_number", ""),
        "Meeting Start Time": meeting.get("start_time", ""),
        "Meeting End Time": meeting.get("end_time", ""),
        "Meeting Days": days,
        "Building Name": meeting.get("building", {}).get("name", "Canceled"),
        "Meeting Room": meeting.get("room", "TBD"),
    }


# --------------------------------------------------------------------------------------


def get_semesters_from_args():
    parser = argparse.ArgumentParser(
        description="Fetch academic course data for specified semesters."
    )
    parser.add_argument(
        "semesters", nargs="*", help="Semesters to generate CSVs for, e.g. f2019 s2022."
    )
    args = parser.parse_args()

    if not args.semesters:
        print(
            "No semesters provided as arguments. Please enter the semesters separated by spaces:"
        )
        args.semesters = input().split()

    return args.semesters


# --------------------------------------------------------------------------------------


def generate_csv(semester, subjects, query, fieldnames, req_lib):
    copy_n = 0
    csv_file = f"{semester}.csv"

    # Check if file already exists
    while os.path.exists(csv_file):
        copy_n += 1
        csv_file = f"{semester}_{copy_n}.csv"

    with open(csv_file, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()

        for subject in subjects:
            term_info, seat_info, course_details = fetch_data(
                subject, int(query[semester]), req_lib
            )
            process_courses(term_info, seat_info, course_details, writer)


# --------------------------------------------------------------------------------------


def main():
    req_lib = ReqLib()
    query = {
        "f2024": "1252",
        "f2023": "1242",
        "f2022": "1232",
        "f2021": "1222",
        "f2020": "1212",
        "s2025": "1254",
        "s2024": "1244",
        "s2023": "1234",
        "s2022": "1224",
        "s2021": "1214",
    }

    # TODO: Standardize this with backend/constants.py
    subjects = [
        "AAS",
        "AFS",
        "AMS",
        "ANT",
        "AOS",
        "APC",
        "ARA",
        "ARC",
        "ART",
        "ASA",
        "ASL",
        "AST",
        "ATL",
        "BCS",
        "BNG",
        "CBE",
        "CDH",
        "CEE",
        "CGS",
        "CHI",
        "CHM",
        "CHV",
        "CLA",
        "CLG",
        "COM",
        "COS",
        "CSE",
        "CWR",
        "CZE",
        "DAN",
        "EAS",
        "ECE",
        "ECO",
        "ECS",
        "EEB",
        "EGR",
        "ENE",
        "ENG",
        "ENT",
        "ENV",
        "EPS",
        "FIN",
        "FRE",
        "FRS",
        "GEO",
        "GER",
        "GEZ",
        "GHP",
        "GSS",
        "HEB",
        "HIN",
        "HIS",
        "HLS",
        "HOS",
        "HUM",
        "ISC",
        "ITA",
        "JDS",
        "JPN",
        "JRN",
        "KOR",
        "LAO",
        "LAS",
        "LAT",
        "LCA",
        "LIN",
        "MAE",
        "MAT",
        "MED",
        "MOD",
        "MOG",
        "MOL",
        "MPP",
        "MSE",
        "MTD",
        "MUS",
        "NES",
        "NEU",
        "ORF",
        "PAW",
        "PER",
        "PHI",
        "PHY",
        "PLS",
        "POL",
        "POP",
        "POR",
        "PSY",
        "QCB",
        "REL",
        "RES",
        "RUS",
        "SAN",
        "SLA",
        "SML",
        "SOC",
        "SPA",
        "SPI",
        "STC",
        "SWA",
        "THR",
        "TPP",
        "TRA",
        "TUR",
        "TWI",
        "UKR",
        "URB",
        "URD",
        "VIS",
        "WRI",
    ]

    term_fields = ["Term Code", "Term Name"]

    subject_fields = ["Subject Code", "Subject Name"]

    course_fields = [
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

    instructor_fields = [
        "Instructor EmplID",
        "Instructor First Name",
        "Instructor Last Name",
        "Instructor Full Name",
    ]

    crosslisting_fields = ["Crosslisting Subjects", "Crosslisting Catalog Numbers"]

    class_fields = [
        "Class Number",
        "Class Section",
        "Class Status",
        "Class Type",
        "Class Capacity",
        "Class Enrollment",
        "Class Year Enrollments",
    ]

    meeting_fields = [
        "Meeting Number",
        "Meeting Start Time",
        "Meeting End Time",
        "Meeting Days",
        "Building Name",
        "Meeting Room",
    ]

    course_details_fields = [
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

    reading_list_fields = [f"Reading List Title {i}" for i in range(1, 7)] + [
        f"Reading List Author {i}" for i in range(1, 7)
    ]

    fields = [
        term_fields,
        subject_fields,
        course_fields,
        instructor_fields,
        crosslisting_fields,
        class_fields,
        meeting_fields,
        course_details_fields,
        reading_list_fields,
    ]

    fieldnames = sum(fields, [])
    semesters = get_semesters_from_args()
    available_semesters = query.keys()

    for semester in semesters:
        if semester in available_semesters:
            generate_csv(semester, subjects, query, fieldnames, req_lib)
        else:
            print(
                f"Warning: Semester '{semester}' not found in available semesters. Skipping."
            )


if __name__ == "__main__":
    print("Fetching course data...")
    start_time = time.time()
    main()
    end_time = time.time()
    print(f"Execution time: {(end_time - start_time):.2f} seconds")
