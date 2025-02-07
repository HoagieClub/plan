import argparse
import csv
import os
import sys
import re
from hoagieplan.logger import logger
from datetime import datetime
from pathlib import Path
from tqdm import tqdm

sys.path.append(str(Path("../").resolve()))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()
from django.db import transaction
from hoagieplan.models import (
    Department,
    AcademicTerm,
    Course,
    Section,
    ClassMeeting,
    ClassYearEnrollment,
    Instructor,
)


# -------------------------------------------------------------------------------------#

CLASS_YEAR_ENROLLMENT_PATTERN = re.compile(r"Year (\d+): (\d+) students")


def _parse_class_year_enrollments(str, pattern):
    if str == "Class year demographics unavailable":
        return []
    return pattern.findall(str)


def _format_duration(start_time, end_time):
    elapsed_time = end_time - start_time
    seconds = elapsed_time.total_seconds()

    hours, remainder = divmod(seconds, 3600)
    minutes, seconds = divmod(remainder, 60)

    # Building a formatted string
    formatted_duration = []
    if hours:
        formatted_duration.append(f"{int(hours)} hours")
    if minutes:
        formatted_duration.append(f"{int(minutes)} minutes")
    if seconds or not formatted_duration:
        # Rounds seconds to the nearest thousandth
        formatted_duration.append(f"{seconds:.3f} seconds")

    return ", ".join(formatted_duration)


def _parse_time(time_str):
    try:
        return datetime.strptime(time_str, "%I:%M %p").strftime("%H:%M")
    except ValueError:
        return None


# -------------------------------------------------------------------------------------#


def insert_departments(rows):
    logger.info("Starting Department insertions and updates...")

    # Create a set of unique departments from the input rows
    unique_departments = {(row["Subject Code"], row["Subject Name"]) for row in rows}

    # Fetch existing departments into a dictionary for quick access
    existing_departments_dict = {
        dept.code: dept
        for dept in Department.objects.filter(
            code__in=[code for code, _ in unique_departments]
        )
    }

    departments_to_create = []
    departments_to_update = []

    for code, name in unique_departments:
        if code in existing_departments_dict:
            # Access the existing department from the dictionary
            department = existing_departments_dict[code]
            if department.name != name:
                department.name = name
                departments_to_update.append(department)
        else:
            # Prepare a new Department instance for bulk creation
            departments_to_create.append(Department(code=code, name=name))

    try:
        with transaction.atomic():
            if departments_to_create:
                Department.objects.bulk_create(departments_to_create)
            if departments_to_update:
                Department.objects.bulk_update(departments_to_update, ["name"])
    except Exception as e:
        logger.error(f"Error in inserting departments: {e}")

    logger.info(
        f"Inserted {len(departments_to_create)} new departments and updated {len(departments_to_update)} departments."
    )
    logger.info("Department insertions and updates completed!")


# -------------------------------------------------------------------------------------#


def insert_academic_terms(rows):
    logger.info("Starting AcademicTerm insertions and updates...")

    def parse_date(date_str):
        """Parse a date string into a date object, return None if empty."""
        return datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else None

    first_row = rows[0]

    # Prepare new term details
    term_code = first_row["Term Code"].strip()
    new_details = (
        first_row["Term Name"],
        parse_date(first_row.get("Course Start Date")),
        parse_date(first_row.get("Course End Date")),
    )

    try:
        with transaction.atomic():
            term, created = AcademicTerm.objects.get_or_create(
                term_code=term_code,
                defaults=dict(zip(("suffix", "start_date", "end_date"), new_details, strict=False)),
            )

            if created:
                logger.info("Inserted 1 new academic term.")
            else:
                # Extract existing term details
                existing_details = (term.suffix, term.start_date, term.end_date)

                if new_details != existing_details:
                    # Update term if there are differences
                    AcademicTerm.objects.filter(term_code=term_code).update(
                        suffix=new_details[0],
                        start_date=new_details[1],
                        end_date=new_details[2],
                    )
                    logger.info("Updated 1 academic term.")
                else:
                    logger.info("No changes detected; no update performed.")

    except Exception as e:
        logger.error(f"Error in inserting/updating academic terms: {e}")

    logger.info("AcademicTerm insertions and updates completed!")


# -------------------------------------------------------------------------------------#


def insert_courses(rows):
    logger.info("Starting Course insertions and updates...")

    departments = {dept.code: dept for dept in Department.objects.all()}
    existing_courses = {course.guid: course for course in Course.objects.all()}
    new_courses = []
    updated_courses = []

    for row_index, row in enumerate(tqdm(rows, desc="Processing Courses")):
        guid = row.get("Course GUID")
        dept_code = row["Subject Code"]
        department = departments.get(dept_code)

        if not guid:
            logger.warning(f"Course GUID not found on row {row_index + 1}")
            continue

        crosslistings = row.get("Crosslistings")
        if crosslistings is None:
            crosslistings = f"{row['Subject Code']} {row['Catalog Number']}"

        # Handle CHI1001, FRE1027, GER1025...
        crosslistings = re.sub(r"([a-zA-Z])([0-9])", r"\1 \2", crosslistings)

        reading_list_entries = [
            f"{row[f'Reading List Title {i}']}//{row[f'Reading List Author {i}']}"
            for i in range(1, 7)
            if row.get(f"Reading List Author {i}")
            and row.get(f"Reading List Title {i}")
        ]
        reading_list = ";".join(reading_list_entries)

        defaults = {
            "course_id": row["Course ID"],
            "department": department,
            "title": row["Course Title"],
            "catalog_number": row["Catalog Number"],
            "description": row.get("Course Description"),
            "drop_consent": row.get("Drop Consent"),
            "add_consent": row.get("Add Consent"),
            "web_address": row.get("Web Address"),
            "transcript_title": row.get("Transcript Title"),
            "long_title": row.get("Long Title"),
            "distribution_area_long": row.get("Distribution Area Long"),
            "distribution_area_short": row.get("Distribution Area Short"),
            "reading_writing_assignment": row.get("Reading Writing Assignment"),
            "grading_basis": row.get("Grading Basis"),
            "reading_list": reading_list,
            "crosslistings": crosslistings,
        }

        course = existing_courses.get(guid)
        if course:
            # Update existing course
            update_required = False
            for key, value in defaults.items():
                if getattr(course, key) != value:
                    setattr(course, key, value)
                    update_required = True
            if update_required:
                updated_courses.append(course)
        else:
            # Check if the course already exists in new_courses
            new_course = next((c for c in new_courses if c.guid == guid), None)
            if new_course:
                # Update the existing new course instance
                for key, value in defaults.items():
                    setattr(new_course, key, value)
            else:
                # Create a new course instance
                new_course = Course(guid=guid, **defaults)
                new_courses.append(new_course)

    update_fields = [field.name for field in Course._meta.fields if field.name != "id"]

    try:
        with transaction.atomic():
            if new_courses:
                Course.objects.bulk_create(new_courses)

            if updated_courses:
                Course.objects.bulk_update(updated_courses, update_fields)
    except Exception as e:
        logger.error(f"Error in inserting/updating courses: {e}")

    logger.info(
        f"Inserted {len(new_courses)} new courses, updated {len(updated_courses)} existing courses."
    )
    logger.info("Course insertions and updates completed!")


# -------------------------------------------------------------------------------------#


def insert_instructors(rows):
    logger.info("Starting instructor insertions and updates...")

    update_fields = ["first_name", "last_name", "full_name"]
    new_instructors = []
    updated_instructors = []
    marked = []

    # Pre-fetch existing instructors to reduce duplicate checks during processing
    existing_instructors = {
        instructor.emplid: instructor for instructor in Instructor.objects.all()
    }

    for row in tqdm(rows, desc="Processing Instructors..."):
        instructor_emplid = row.get("Instructor EmplID", "").strip()
        if not instructor_emplid:
            logger.warning("Skipping row with missing Instructor EmplID")
            continue

        first_name = row.get("Instructor First Name", "").strip()
        last_name = row.get("Instructor Last Name", "").strip()
        full_name = row.get("Instructor Full Name", f"{first_name} {last_name}").strip()

        instructor = existing_instructors.get(instructor_emplid)
        if instructor:
            # Update existing instructor if there are changes
            changed = any(
                [
                    getattr(instructor, field) != locals()[field]
                    for field in update_fields
                ]
            )
            if changed:
                for field in update_fields:
                    setattr(instructor, field, locals()[field])
                updated_instructors.append(instructor)
        elif not instructor and instructor_emplid not in marked:
            # Prepare new instructor for bulk creation
            new_instructors.append(
                Instructor(
                    emplid=instructor_emplid,
                    first_name=first_name,
                    last_name=last_name,
                    full_name=full_name,
                )
            )
            marked.append(instructor_emplid)

    try:
        with transaction.atomic():
            # Bulk create new instructors
            if new_instructors:
                Instructor.objects.bulk_create(new_instructors)

            # Bulk update existing instructors
            if updated_instructors:
                Instructor.objects.bulk_update(updated_instructors, update_fields)

    except Exception as e:
        logger.error(f"Error in processing instructors: {e}")
    logger.info(
        f"Created {len(new_instructors)} new instructors, updated {len(updated_instructors)} existing instructors."
    )
    logger.info("Instructor processing completed!")


# -------------------------------------------------------------------------------------#


def insert_sections(rows):
    logger.info("Starting Section insertions and updates...")
    # Load caches for terms and courses
    term_cache = {term.term_code: term for term in AcademicTerm.objects.all()}
    course_cache = {course.guid: course for course in Course.objects.all()}

    # Load existing sections to facilitate updates and prevent duplicates
    existing_sections = {
        (section.course.guid, section.class_number, section.instructor.emplid): section
        for section in Section.objects.select_related(
            "course", "term", "instructor"
        ).all()
    }
    existing_instructors = {
        instructor.emplid: instructor for instructor in Instructor.objects.all()
    }

    new_sections = []
    updated_sections = []

    for row in tqdm(rows, desc="Processing Sections..."):
        class_number = int(row["Class Number"].strip())
        term_code = row["Term Code"].strip()
        course_guid = row["Course GUID"].strip()
        instructor_emplid = row.get("Instructor EmplID", "").strip()
        course = (
            course_cache.get(course_guid)
            if course_cache
            else Course.objects.get(guid=course_guid)
        )
        term = (
            term_cache.get(term_code)
            if term_cache
            else AcademicTerm.objects.get(term_code=term_code)
        )
        instructor = existing_instructors.get(instructor_emplid)
        # Skip if mandatory information is missing
        if not term or not course:
            continue

        section_key = (course_guid, class_number, instructor_emplid)
        section_data = {
            "class_number": class_number,
            "class_type": row.get("Class Type", ""),
            "class_section": row.get("Class Section", ""),
            "track": row.get("Course Track", "").strip(),
            "seat_reservations": row.get("Has Seat Reservations", "").strip(),
            "capacity": int(row.get("Class Capacity", 0)),
            "status": row.get("Class Status", ""),
            "enrollment": int(row.get("Class Enrollment", 0)),
            "course": course,
            "term": term,
            "instructor": instructor,
        }

        section = existing_sections.get(section_key)
        if section:
            # Check and update existing section
            update_required = False
            for key, value in section_data.items():
                if getattr(section, key) != value:
                    setattr(section, key, value)
                    update_required = True
            if update_required:
                updated_sections.append(section)
        else:
            # Create new section instance
            new_section = Section(**section_data)
            new_sections.append(new_section)

    update_fields = [field.name for field in Section._meta.fields if field.name != "id"]

    try:
        with transaction.atomic():
            if new_sections:
                Section.objects.bulk_create(new_sections)
            if updated_sections:
                Section.objects.bulk_update(updated_sections, update_fields)
    except Exception as e:
        logger.error(f"Error in section insertion and update process: {e}")

    logger.info(
        f"Inserted {len(new_sections)} new sections, updated {len(updated_sections)} sections."
    )
    logger.info("Section processing completed!")


# -------------------------------------------------------------------------------------#


def insert_class_meetings(rows):
    logger.info("Starting ClassMeeting insertions and updates...")

    section_cache = {
        (section.course.guid, section.class_number, section.instructor.emplid): section
        for section in Section.objects.select_related(
            "course", "term", "instructor"
        ).all()
    }

    existing_meetings = {
        (
            meeting.section_id,
            meeting.meeting_number,
        ): meeting
        for meeting in ClassMeeting.objects.all()
    }

    new_meetings = []
    updated_meetings = []

    for row in tqdm(rows, desc="Processing Class Meetings..."):
        course_guid = row["Course GUID"].strip()
        term_code = int(course_guid[:4])
        class_number = int(row["Class Number"].strip())
        meeting_number = int(row["Meeting Number"].strip())
        instructor_emplid = row.get("Instructor EmplID", "").strip()
        section_key = (course_guid, class_number, instructor_emplid)
        section = section_cache.get(section_key)

        if section is None:
            # Class is (likely) canceled and has no sections.
            continue

        start_time = _parse_time(row.get("Meeting Start Time", ""))
        end_time = _parse_time(row.get("Meeting End Time", ""))

        if not start_time:
            logger.error(
                f"Invalid start_time format for Class {class_number} "
                f"in Term {term_code} on row {row}."
            )
            continue

        if not end_time:
            logger.error(
                f"Invalid end_time for Class {class_number} "
                f"in Term {term_code} on row {row}."
            )
            continue

        meeting_key = (section.id, meeting_number)
        meeting = existing_meetings.get(meeting_key)
        if meeting:
            update_required = False
            fields_to_update = {
                "start_time": start_time,
                "end_time": end_time,
                "room": row.get("Meeting Room", "").strip(),
                "days": row.get("Meeting Days", "").strip(),
                "building_name": row.get("Building Name", "").strip(),
            }

            for field, new_value in fields_to_update.items():
                if getattr(meeting, field) != new_value:
                    setattr(meeting, field, new_value)
                    update_required = True

            if update_required:
                updated_meetings.append(meeting)
        else:
            # Check if the class meeting already exists in new_meetings
            new_meeting = next(
                (
                    m
                    for m in new_meetings
                    if m.section_id == section.id and m.meeting_number == meeting_number
                ),
                None,
            )
            if new_meeting:
                # Update the existing new class meeting instance
                new_meeting.start_time = start_time
                new_meeting.end_time = end_time
                new_meeting.room = row.get("Meeting Room", "").strip()
                new_meeting.days = row.get("Meeting Days", "").strip()
                new_meeting.building_name = row.get("Building Name", "").strip()
            else:
                # Create a new class meeting instance
                new_meeting = ClassMeeting(
                    section=section,
                    meeting_number=meeting_number,
                    start_time=start_time,
                    end_time=end_time,
                    room=row.get("Meeting Room", "").strip(),
                    days=row.get("Meeting Days", "").strip(),
                    building_name=row.get("Building Name", "").strip(),
                )
                new_meetings.append(new_meeting)

    update_fields = [
        "meeting_number",
        "start_time",
        "end_time",
        "room",
        "days",
        "building_name",
    ]

    try:
        with transaction.atomic():
            ClassMeeting.objects.bulk_create(new_meetings)

            # TODO: This is still somehow showing non-zero updates even
            # we insert the same semester data twice in a row. Bug?
            ClassMeeting.objects.bulk_update(updated_meetings, update_fields)
    except Exception as e:
        logger.error(f"Error in bulk operation: {e}")

    logger.info(
        f"Created {len(new_meetings)} new class meetings and updated {len(updated_meetings)} existing class meetings."
    )
    logger.info("ClassMeeting insertions and updates completed!")


# -------------------------------------------------------------------------------------#


def insert_class_year_enrollments(rows):
    logger.info("Starting ClassYearEnrollment insertions and updates...")

    # Initial cache of Section IDs to minimize database queries.
    section_cache = {
        (section.course.guid, section.class_number): section.id
        for section in Section.objects.select_related("course", "term").all()
    }

    # Fetch existing enrollments in bulk and create a dictionary for faster lookup
    existing_enrollments = {
        (enrollment.section_id, enrollment.class_year): enrollment
        for enrollment in ClassYearEnrollment.objects.filter(
            section_id__in=section_cache.values()
        )
    }

    new_enrollments = []
    updated_enrollment_data = []

    for row in tqdm(rows, desc="Processing Class Year Enrollments..."):
        course_guid = row["Course GUID"].strip()
        class_number = int(row["Class Number"].strip())
        section_key = (course_guid, class_number)
        section_id = section_cache.get(section_key)

        if section_id:
            enrollment_info = _parse_class_year_enrollments(
                row["Class Year Enrollments"], CLASS_YEAR_ENROLLMENT_PATTERN
            )
            for class_year, enrl_seats in enrollment_info:
                try:
                    class_year = int(class_year) if class_year else None
                except ValueError:
                    logger.error(f"Invalid class year: {class_year}")
                    continue

                enrollment_key = (section_id, class_year)
                existing_enrollment = existing_enrollments.get(enrollment_key)

                if existing_enrollment:
                    if existing_enrollment.enrl_seats != enrl_seats:
                        updated_enrollment_data.append(
                            (existing_enrollment.id, enrl_seats)
                        )
                else:
                    new_enrollment = ClassYearEnrollment(
                        section_id=section_id,
                        class_year=class_year,
                        enrl_seats=enrl_seats,
                    )
                    new_enrollments.append(new_enrollment)

    try:
        with transaction.atomic():
            ClassYearEnrollment.objects.bulk_create(new_enrollments)
            if updated_enrollment_data:
                # TODO: This is still somehow showing non-zero updates even
                # we insert the same semester data twice in a row. Bug?
                ClassYearEnrollment.objects.bulk_update(
                    [
                        ClassYearEnrollment(id=id, enrl_seats=enrl_seats)
                        for id, enrl_seats in updated_enrollment_data
                    ],
                    ["enrl_seats"],
                )
    except Exception as e:
        logger.error(f"Error in bulk operation: {e}")

    logger.info(
        f"Created {len(new_enrollments)} new class year enrollments and updated {len(updated_enrollment_data)} existing ones."
    )
    logger.info("ClassYearEnrollment insertions and updates completed!")


# -------------------------------------------------------------------------------------#


def get_semesters_from_args():
    parser = argparse.ArgumentParser(
        description="Fetch academic course data for specified semesters."
    )
    parser.add_argument(
        "semesters",
        nargs="*",
        help="Semesters to generate CSVs for, e.g., f2019 s2022.",
    )
    args = parser.parse_args()

    if not args.semesters:
        print(
            "No semesters provided as arguments. Please enter the semesters separated by spaces:"
        )
        args.semesters = input().strip().split(" ")

    return args.semesters


# -------------------------------------------------------------------------------------#


def insert_course_data(semester):
    # NOTE: It's recommended to run the script on one semester at a time.
    # Strange database race-like conditions are observed if you try to,
    # for example, input all semesters as an argument (e.g. not all data get inserted)
    # It has also been observed that all-semesters-as-args takes about 2m28s
    # whereas individual semesters takes about ~7s x 9 semesters = 1 minute or so.

    data = Path(f"{semester}.csv")

    if not data.exists():
        print(f"The file {data} does not exist in the data directory. Skipping.")
        return

    with data.open("r") as file:
        reader = csv.DictReader(file)
        rows = [row for row in reader]

    formatted_rows = [
        {key.strip(): value.strip() for key, value in row.items()} for row in rows
    ]

    try:
        with transaction.atomic():
            with transaction.atomic():
                insert_departments(formatted_rows)

            with transaction.atomic():
                insert_academic_terms(formatted_rows)

            with transaction.atomic():
                insert_courses(formatted_rows)

            with transaction.atomic():
                insert_instructors(formatted_rows)

            with transaction.atomic():
                insert_sections(formatted_rows)

            with transaction.atomic():
                insert_class_meetings(formatted_rows)

            with transaction.atomic():
                insert_class_year_enrollments(formatted_rows)

    except Exception as e:
        logger.error(f"Transaction failed: {e}")


# -------------------------------------------------------------------------------------#


def main():
    start_time = datetime.now()
    semesters = get_semesters_from_args()
    for semester in semesters:
        insert_course_data(semester)
    end_time = datetime.now()

    print(f"Finished in {_format_duration(start_time, end_time)}.")


# -------------------------------------------------------------------------------------#


if __name__ == "__main__":
    main()
