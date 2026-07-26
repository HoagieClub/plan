import argparse
import csv
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

from hoagieplan.models import Course, CourseComment, CourseEvalSummary

API_BASE_URL = os.getenv("SUMMARY_API_BASE_URL")
API_KEY = os.getenv("SUMMARY_API_KEY")
MODEL = os.getenv("SUMMARY_MODEL")

SYSTEM_PROMPT = (
	"You are a helpful assistant that summarizes student course evaluations. "
	"Be concise and bring some energy. Focus on key themes like teaching quality, "
	"workload, course content, and the difficulty of the course. Don't speak in third person "
	"about students. Use the comments to capture the overall sentiment and specific feedback, "
	"but avoid generic statements. Focus on the course, and less on the professor. Make sure to"
	"use similar language as the course description and students' comments"
)

MAX_COMMENTS = 50
MAX_RETRIES = 3
WORKERS = 1000


def get_client():
	return OpenAI(base_url=API_BASE_URL, api_key=API_KEY)


def generate_summary(client, comments: list[str], description: str = "") -> str:
	"""Generate a summary of course comments using the OpenAI-compatible API."""
	joined = "\n".join(f"- {c}" for c in comments[:MAX_COMMENTS])
	context = description if description else ""
	for attempt in range(MAX_RETRIES):
		response = client.chat.completions.create(
			model=MODEL,
			max_tokens=8000,
			messages=[
				{"role": "system", "content": SYSTEM_PROMPT},
				{
					"role": "user",
					"content": (
						"Summarize these student course reviews in 4-5 sentences. "
						"Focus on the key themes (teaching quality, workload, content value)."
						"Feel free to use the course description for context.\n\n"
						"Course Description:"
						f"{context}"
						"Student Course Reviews"
						f"{joined}"
					),
				},
			],
		)
		content = response.choices[0].message.content
		if content:
			return content
		print(f"  Empty response, retrying ({attempt + 1}/{MAX_RETRIES})...")
	return None


def get_comments_by_course():
	"""Fetch all comments from the DB, grouped by course_id."""
	all_comments = CourseComment.objects.filter(comment__isnull=False).values_list("course_id", "comment")

	# Dictionary of course_id to list of comments
	course_comments_dict = defaultdict(list)
	for course_id, comment in all_comments:
		if comment.strip():
			course_comments_dict[course_id].append(comment)

	return dict(course_comments_dict)


def export_summaries(filepath):
	"""Export all summaries from DB to a CSV file keyed by course guid."""
	summaries = CourseEvalSummary.objects.select_related("course").all()
	with open(filepath, "w", newline="", encoding="utf-8") as f:
		writer = csv.writer(f)
		writer.writerow(["course_guid", "summary"])
		for s in summaries:
			writer.writerow([s.course.guid, s.summary])
	print(f"Exported {summaries.count()} summaries to {filepath}")


def import_summaries(filepath, force=False):
	"""Import summaries from a CSV file into the DB."""
	if force:
		CourseEvalSummary.objects.all().delete()
		print("Force mode: cleared all existing summaries")

	# Build guid -> course id map
	guid_to_id = dict(Course.objects.values_list("guid", "id"))

	existing = set(CourseEvalSummary.objects.values_list("course_id", flat=True))

	to_create = []
	skipped = 0
	missing = 0
	with open(filepath, newline="", encoding="utf-8") as f:
		reader = csv.DictReader(f)
		for row in reader:
			course_id = guid_to_id.get(row["course_guid"])
			if not course_id:
				missing += 1
				continue
			if course_id in existing:
				skipped += 1
				continue
			to_create.append(CourseEvalSummary(course_id=course_id, summary=row["summary"]))

	if to_create:
		CourseEvalSummary.objects.bulk_create(to_create)

	print(f"Imported {len(to_create)} summaries from {filepath}")
	if skipped:
		print(f"Skipped {skipped} existing summaries")
	if missing:
		print(f"Warning: {missing} course GUIDs not found in DB")


def generate_all_summaries(force=False, export_path=None):
	courses = get_comments_by_course()
	print(f"Found {len(courses)} courses with comments")

	if force:
		CourseEvalSummary.objects.all().delete()
		print("Force mode: cleared all existing summaries")
	else:
		existing = set(CourseEvalSummary.objects.values_list("course_id", flat=True))
		courses = {cid: comments for cid, comments in courses.items() if cid not in existing}
		print(f"Skipping {len(existing)} courses with existing summaries")

	print(f"Generating summaries for {len(courses)} courses ({WORKERS} workers)")

	if not courses:
		print("Nothing to do.")
		if export_path:
			export_summaries(export_path)
		return

	# Fetch course descriptions and guid map for CSV export
	course_info = dict(Course.objects.filter(id__in=courses.keys()).values_list("id", "description"))
	id_to_guid = dict(Course.objects.filter(id__in=courses.keys()).values_list("id", "guid"))

	client = get_client()
	summaries = {}
	errors = []

	# Open CSV writer if exporting
	csv_file = None
	csv_writer = None
	if export_path:
		csv_file = open(export_path, "w", newline="", encoding="utf-8")
		csv_writer = csv.writer(csv_file)
		csv_writer.writerow(["course_guid", "summary"])

	with ThreadPoolExecutor(max_workers=WORKERS) as pool:
		futures = {
			pool.submit(generate_summary, client, comments, course_info.get(course_id, "")): course_id
			for course_id, comments in courses.items()
		}
		for future in tqdm(as_completed(futures), total=len(futures), desc="Generating summaries", unit="course"):
			course_id = futures[future]
			try:
				summary = future.result()
				if summary:
					summaries[course_id] = summary
					if csv_writer:
						csv_writer.writerow([id_to_guid.get(course_id, ""), summary])
						csv_file.flush()
				else:
					errors.append((course_id, "Empty response"))
					print(f"  [ERROR] Course {course_id}: Empty response after {MAX_RETRIES} retries")
			except Exception as e:
				errors.append((course_id, str(e)))
				print(f"  [ERROR] Course {course_id}: {e}")

	if csv_file:
		csv_file.close()
		print(f"Exported {len(summaries)} summaries to {export_path}")

	# Bulk create summaries in DB
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


# Usage:
#   1. Toggle to test env
#   2. python generate_summaries.py --export summaries.csv   (save to test DB + export as csv)
#   1. Toggle to prod env
#   4. python generate_summaries.py --import summaries.csv   (save to prod DB using csv)

# Other usage:
#   python generate_summaries.py                              (generate for new courses only)
#   python generate_summaries.py --force                      (regenerate all summaries)
if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Generate AI summaries for course evaluation comments")
	parser.add_argument("--force", action="store_true", help="Clear existing summaries before generating/importing")
	parser.add_argument("--export", metavar="FILE", help="Export all summaries to a CSV file after generating")
	parser.add_argument(
		"--import", dest="import_file", metavar="FILE", help="Import summaries from a CSV file (no API calls)"
	)
	args = parser.parse_args()

	if args.import_file:
		import_summaries(args.import_file, force=args.force)
	else:
		generate_all_summaries(force=args.force, export_path=args.export)
