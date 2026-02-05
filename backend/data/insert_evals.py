import argparse
import csv
import os
import sys
from pathlib import Path

import django
import orjson as oj
from django.db import transaction
from tqdm import tqdm

sys.path.append(str(Path("../").resolve()))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

django.setup()

from hoagieplan.models import Course, CourseComments


# Field mapping for CSV columns to Django model fields
EVALUATION_FIELD_MAPPING = {
    "Quality of Course": "quality_of_course",
    "Quality of Lectures": "quality_of_lectures",
    "Quality of Readings": "quality_of_readings",
    "Quality of Written Assignments": "quality_of_written_assignments",
    "Recommend to Other Students": "recommend_to_other_students",
    "Quality of Language": "quality_of_language",
    "Quality of the Classes": "quality_of_the_classes",
    "Quality of the Seminar": "quality_of_seminar",
    "Quality of Precepts": "quality_of_precepts",
    "Quality of Laboratories": "quality_of_laboratories",
    "Quality of Classes": "quality_of_classes",
    "Quality of Studios": "quality_of_studios",
    "Quality of Ear Training": "quality_of_ear_training",
    "Overall Course Quality Rating": "overall_course_quality_rating",
    "Interest in Subject Matter": "interest_in_subject_matter",
    "Overall Quality of the Course": "overall_quality_of_the_course",
    "Overall Quality of the Lecture": "overall_quality_of_the_lecture",
    "Papers and Problem Sets": "papers_and_problem_sets",
    "Readings": "readings",
    "Oral Presentation Skills": "oral_presentation_skills",
    "Workshop Structure": "workshop_structure",
    "Written Work": "written_work",
}


def map_evaluation_fields(eval_data):
    """Map CSV column names to Django model field names."""
    return {EVALUATION_FIELD_MAPPING.get(key, key): value for key, value in eval_data.items()}


def parse_evaluations(eval_str):
    try:
        eval_data = oj.loads(f"{{{eval_str}}}")
        return map_evaluation_fields(eval_data)
    except ValueError:
        return {}


def parse_comments(comment_str):
    comments = comment_str.strip().split('","')
    return [comment.strip().strip('"') for comment in comments]


def count_rows(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        return sum(1 for _ in csv.reader(f))


@transaction.atomic
def import_data(evals):
    print("Clearing existing CourseComments...")
    CourseComments.objects.all().delete()

    total_rows = count_rows(evals)
    course_batch = []
    comment_batch = []
    missing_courses = []

    # Fetch existing courses to minimize DB hits
    courses_map = {course.guid: course for course in Course.objects.all()}

    with open(evals, newline="", encoding="utf-8") as csvfile:
        reader = csv.reader(csvfile)
        next(reader, None)  # Skip header

        for row in tqdm(reader, total=total_rows - 1, desc="Inserting data", unit="row"):
            course_id, term, evals_str, comments = row[:4]
            course_guid = f"{term}{course_id}"

            # Update Course object with evaluation data
            eval_data = parse_evaluations(evals_str)
            curr_course = courses_map.get(course_guid)

            # Skip and track if this evaluation does not have a corresponding course
            if not curr_course:
                missing_courses.append(course_guid)
                continue

            for field, value in eval_data.items():
                setattr(curr_course, field, value)

            course_batch.append(curr_course)

            # Create CourseComments objects
            comment_texts = parse_comments(comments)
            for text in comment_texts:
                comment = CourseComments(course_guid=course_guid, comment=text)
                comment_batch.append(comment)

            # Bulk create in batches
            if len(course_batch) >= 1000:
                Course.objects.bulk_update(course_batch, fields=list(EVALUATION_FIELD_MAPPING.values()))
                CourseComments.objects.bulk_create(comment_batch)
                course_batch, comment_batch = [], []

    # Handle any remaining batches
    if course_batch:
        Course.objects.bulk_update(course_batch, fields=list(EVALUATION_FIELD_MAPPING.values()))
        CourseComments.objects.bulk_create(comment_batch)

    # Print summary of missing courses
    if missing_courses:
        print(f"\nWarning: {len(missing_courses)} course(s) not found in database:")
        for guid in missing_courses[:10]:  # Show first 10
            print(f"  - {guid}")
        if len(missing_courses) > 10:
            print(f"  ... and {len(missing_courses) - 10} more")


def main():
    parser = argparse.ArgumentParser(description="Import course evaluations from a CSV file")
    parser.add_argument(
        "filename",
        nargs="?",
        default="./evals.csv",
        help="Path to the evaluations CSV file (default: ./evals.csv)"
    )
    args = parser.parse_args()

    print(f"Importing evaluations from: {args.filename}")
    import_data(args.filename)


if __name__ == "__main__":
    main()
