import csv
from req_lib import ReqLib


# TODO: Not sure what this file is for anymore. Can probably be deleted.
def fetch_data(subject, term):
    term_info = req_lib.getJSON(
        req_lib.configs.COURSES_COURSES, fmt="json", term=term, subject=subject
    )
    course_ids = []
    term_subjects = term_info.get("term", [])
    for subjects in term_subjects:
        subject = subjects.get("subjects", [])
        for courses in subject:
            course = courses.get("courses", "")
            for course_id in course:
                course_ids.append(course_id.get("course_id", ""))

    # print(f"course_ids here: {course_ids}")
    # print(f"course_ids: {course_ids}")
    course_ids_str = ",".join(course_ids)
    print(f"course_id: {course_ids_str}")
    # print(f"course_ids_str: {course_ids_str}")
    seat_info = req_lib.getJSON(
        req_lib.configs.COURSES_RESSEATS,
        fmt="json",
        term=term,
        course_ids=course_ids_str,
    )
    print(f"seat_info_fetchdata: {seat_info}")
    return term_info, seat_info


def process_courses(term_info, seat_info, writer):
    # print(f"seat_info: {seat_info}")
    seat_mapping = {seat["course_id"]: seat for seat in seat_info.get("courses", [])}
    # print(f"seat_info.get: {seat_info.get('courses', [])}")
    # print(f"seat_mapping_process: {seat_mapping}")
    for term in term_info.get("term", []):
        for subject in term.get("subjects", []):
            for course in subject.get("courses", []):
                process_course(term, subject, course, seat_mapping, writer)


def process_course(term, subject, course, seat_mapping, writer):
    common_data = extract_common_data(term, subject, course)
    for instructor in course.get("instructors", []):
        instructor_data = extract_instructor_data(instructor)
        crosslisting_data = extract_crosslisting_data(course.get("crosslistings", []))
        for course_class in course.get("classes", []):
            class_data = extract_class_data(course_class, seat_mapping, course)
            # print(f"class_data: {class_data}")
            for meeting in course_class.get("schedule", {}).get("meetings", []):
                meeting_data = extract_meeting_data(meeting)
                row_data = {
                    **common_data,
                    **instructor_data,
                    **crosslisting_data,
                    **class_data,
                    **meeting_data,
                }
                writer.writerow(row_data)


def extract_common_data(term, subject, course):
    return {
        "Term Code": term.get("code", ""),
        "Term Name": term.get("suffix", ""),
        "Term Start Date": term.get("start_date", ""),
        "Term End Date": term.get("end_date", ""),
        "Subject Code": subject.get("code", ""),
        "Subject Name": subject.get("name", ""),
        "Course ID": course.get("course_id", ""),
        "Catalog Number": course.get("catalog_number", ""),
        "Course Title": course.get("title", ""),
        "Course Start Date": course.get("detail", {}).get("start_date", ""),
        "Course End Date": course.get("detail", {}).get("end_date", ""),
        "Course Track": course.get("detail", {}).get("track", ""),
        "Course Description": course.get("detail", {})
        .get("description", "")
        .replace("\n", ""),
        "Seat Reservations": course.get("detail", {}).get("seat_reservations", ""),
    }


def extract_instructor_data(instructor):
    return {
        "Instructor EmplID": instructor.get("emplid", ""),
        "Instructor First Name": instructor.get("first_name", ""),
        "Instructor Last Name": instructor.get("last_name", ""),
        "Instructor Full Name": instructor.get("full_name", ""),
    }


def extract_crosslisting_data(crosslistings):
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


def extract_class_data(course_class, seat_mapping, course):
    course_id = course.get("course_id", "")
    # print(f"course_class: {course_class}")
    # print(f"course_id: {course_id}")
    # print(f"seat_mapping: {seat_mapping}")
    if course_id in seat_mapping:
        specific_seat_info = seat_mapping[course_id]
        class_year_enrollments = specific_seat_info.get("classes", [])[0].get(
            "class_year_enrollments", []
        )
        class_year_enrollments_str = ",".join(
            [
                f"{enroll.get('class_year', '')}|{enroll.get('enrl_seats', '')}"
                for enroll in class_year_enrollments
            ]
        )
    else:
        class_year_enrollments_str = "N/A"
    return {
        "Class Number": course_class.get("class_number", ""),
        "Class Section": course_class.get("section", ""),
        "Class Status": course_class.get("status", ""),
        "Class Type": course_class.get("type_name", ""),
        "Class Capacity": course_class.get("capacity", ""),
        "Class Enrollment": course_class.get("enrollment", ""),
        "Class Year Enrollments": class_year_enrollments_str,
    }


def extract_meeting_data(meeting):
    days = ",".join(meeting.get("days", []))
    return {
        "Meeting Number": meeting.get("meeting_number", ""),
        "Meeting Start Time": meeting.get("start_time", ""),
        "Meeting End Time": meeting.get("end_time", ""),
        "Meeting Days": days,
        "Building Name": meeting.get("building", {}).get("name", ""),
        "Meeting Room": meeting.get("room", ""),
    }


if __name__ == "__main__":
    req_lib = ReqLib()
    query = {
        "f2023": "1242",
        "f2022": "1232",
        "f2021": "1222",
        "f2020": "1212",
        "f2019": "1202",
        "f2018": "1192",
        "f2017": "1182",
        "f2016": "1172",
        "f2015": "1162",
        "f2014": "1152",
        "f2013": "1142",
        "s2023": "1244",
        "s2022": "1234",
        "s2021": "1224",
        "s2020": "1214",
        "s2019": "1204",
        "s2018": "1194",
        "s2017": "1184",
        "s2016": "1174",
        "s2015": "1164",
        "s2014": "1154",
        "s2013": "1144",
    }

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
        "COM",
        "COS",
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

    semester = "f2023"
    csv_file = f"{semester}_courses.csv"
    with open(csv_file, "w", newline="") as csvfile:
        fieldnames = [
            "Term Code",
            "Term Name",
            "Term Start Date",
            "Term End Date",
            "Subject Code",
            "Subject Name",
            "Course ID",
            "Catalog Number",
            "Course Title",
            "Course Start Date",
            "Course End Date",
            "Course Track",
            "Course Description",
            "Seat Reservations",
            "Instructor EmplID",
            "Instructor First Name",
            "Instructor Last Name",
            "Instructor Full Name",
            "Crosslisting Subjects",
            "Crosslisting Catalog Numbers",
            "Class Number",
            "Class Section",
            "Class Status",
            "Class Type",
            "Class Capacity",
            "Class Enrollment",
            "Class Year Enrollments",
            "Meeting Number",
            "Meeting Start Time",
            "Meeting End Time",
            "Meeting Days",
            "Building Name",
            "Meeting Room",
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()

        for subj in subjects:
            term_info, seat_info = fetch_data(subj, int(query[semester]))
            print(f"subj: {subj}")
            print(f"query: {int(query[semester])}")
            print(f"term_info: {term_info}")
            print(f"seat_info csv: {seat_info}")
            process_courses(term_info, seat_info, writer)
