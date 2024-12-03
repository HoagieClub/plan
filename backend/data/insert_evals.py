import csv
import orjson as oj
import os
import sys
from pathlib import Path

import django
from django.db import transaction
from tqdm import tqdm

from compass.models import CourseComments, CourseEvaluations

sys.path.append(str(Path("../").resolve()))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

django.setup()

from hoagieplan.models import CourseEvaluations, CourseComments

evals = "./evals.csv"


def map_evaluation_fields(eval_data):
    # Maps CSV column names to Django model field names
    field_mapping = {
        "Quality of Course": "quality_of_course",
        "Quality of Lectures": "quality_of_lectures",
        "Quality of Readings": "quality_of_readings",
        "Quality of Written Assignments": "quality_of_written_assignments",
        "Recommend to Other Students": "recommend_to_other_students",
        # Add these to the database
        # If not found, then don't render on the page
        "Quality of Language": "quality_of_language",
        "Quality of the Classes": "quality_of_classes",
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

    return {field_mapping.get(key, key): value for key, value in eval_data.items()}


def parse_evaluations(eval_str):
    try:
        eval_data = oj.loads(f"{{{eval_str}}}")
        return map_evaluation_fields(eval_data)
    except ValueError:
        return {}


def parse_comments(comment_str):
    comments = comment_str.strip().split('",\n    "')
    return [comment.strip('",') for comment in comments]


def count_rows(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        return sum(1 for _ in csv.reader(f))


@transaction.atomic
def import_data(evals):
    total_rows = count_rows(evals)
    course_eval_batch = []
    comment_batch = []

    with open(evals, newline="", encoding="utf-8") as csvfile:
        reader = csv.reader(csvfile)
        next(reader, None)  # Skip header

        for row in tqdm(reader, total=total_rows - 1, desc="Inserting data", unit="row"):
            course_id, term, evals_str, comments = row[:4]

            # Create CourseEvaluations object
            eval_data = parse_evaluations(evals_str)
            course_eval = CourseEvaluations(course_guid=f"{term}{course_id}", **eval_data)
            course_eval_batch.append(course_eval)

            # Create CourseComments objects
            comment_texts = parse_comments(comments)
            for text in comment_texts:
                comment = CourseComments(course_guid=f"{term}{course_id}", comment=text)
                comment_batch.append(comment)

            # Bulk create in batches
            if len(course_eval_batch) >= 5000:
                CourseEvaluations.objects.bulk_create(course_eval_batch)
                CourseComments.objects.bulk_create(comment_batch)
                course_eval_batch, comment_batch = [], []

    # Handle any remaining batches
    if course_eval_batch:
        CourseEvaluations.objects.bulk_create(course_eval_batch)
        CourseComments.objects.bulk_create(comment_batch)


def main():
    import_data(evals)
    # course_evals = CourseEvaluations.objects.filter(course_guid='1234002051')

    # for eval in course_evals:
    #     print(eval.quality_of_course)

    # print(CourseComments.objects.filter(course_evaluation_id=id))


if __name__ == "__main__":
    main()
