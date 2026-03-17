import os
import sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import django
from openai import OpenAI
from tqdm import tqdm

sys.path.append(str(Path("../").resolve()))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

django.setup()

from hoagieplan.models import CourseComment, CourseEvalSummary

API_BASE_URL = os.getenv("SUMMARY_API_BASE_URL")
API_KEY = os.getenv("SUMMARY_API_KEY")
MODEL = os.getenv("SUMMARY_MODEL")

SYSTEM_PROMPT = (
    "You are a helpful assistant that summarizes student course evaluations. "
    "Be concise and bring some energy. Focus on key themes like teaching quality, "
    "workload, course content, and the difficulty of the course. Don't speak in third person "
    "about students. Use the comments to capture the overall sentiment and specific feedback, "
    "but avoid generic statements."
)

MAX_COMMENTS = 50
MIN_COMMENTS = 3
WORKERS = 10


def get_client():
    return OpenAI(base_url=API_BASE_URL, api_key=API_KEY)


def generate_summary(client, comments: list[str]) -> str:
    """Generate a summary of course comments using the OpenAI-compatible API."""
    joined = "\n".join(f"- {c}" for c in comments[:MAX_COMMENTS])
    response = client.chat.completions.create(
        model=MODEL,
        max_tokens=8000,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    "Summarize these student course reviews in 2-3 sentences. "
                    "Focus on the key themes (teaching quality, workload, content value).\n\n"
                    f"{joined}"
                ),
            },
        ],
    )
    return response.choices[0].message.content


def get_comments_by_course():
    """Fetch all comments from the DB, grouped by course_id."""
    all_comments = CourseComment.objects.filter(comment__isnull=False).values_list("course_id", "comment")

    # Dictionary of course_id to list of comments
    course_comments_dict = defaultdict(list)
    for course_id, comment in all_comments:
        if comment.strip():
            course_comments_dict[course_id].append(comment)

    return {
        course_id: comments for course_id, comments in course_comments_dict.items() if len(comments) >= MIN_COMMENTS
    }


def generate_all_summaries():
    courses = get_comments_by_course()
    print(f"Found {len(courses)} courses with >= {MIN_COMMENTS} comments")

    # Clear existing summaries
    CourseEvalSummary.objects.all().delete()

    print(f"Generating summaries for {len(courses)} courses " f"({WORKERS} workers)")

    if not courses:
        print("Nothing to do.")
        return

    client = get_client()
    summaries = {}
    errors = []

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {
            pool.submit(generate_summary, client, comments): course_id for course_id, comments in courses.items()
        }
        for future in tqdm(as_completed(futures), total=len(futures), desc="Generating summaries", unit="course"):
            course_id = futures[future]
            try:
                summary = future.result()
                if summary:
                    summaries[course_id] = summary
                else:
                    errors.append((course_id, "Empty response"))
            except Exception as e:
                errors.append((course_id, str(e)))

    # Bulk create summaries
    CourseEvalSummary.objects.bulk_create(
        [CourseEvalSummary(course_id=course_id, summary=summary_text) for course_id, summary_text in summaries.items()]
    )

    print(f"\nDone: {len(summaries)} summaries created")
    if errors:
        print(f"Errors: {len(errors)}")
        for course_id, err in errors[:10]:
            print(f"  - Course {course_id}: {err}")
        if len(errors) > 10:
            print(f"  ... and {len(errors) - 10} more")


# Usage: python generate_summaries.py
if __name__ == "__main__":
    generate_all_summaries()
