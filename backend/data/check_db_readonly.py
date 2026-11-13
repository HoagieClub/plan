"""Read-only health check of a HoagiePlan database, before/after a term import.

Usage (from backend/):
    uv run python data/check_db_readonly.py --test
    uv run python data/check_db_readonly.py --prod

Reads DATABASE_URL / TEST_DATABASE_URL from backend/.env. The connection is opened
in read-only mode, so this script cannot change anything. Prints no credentials.
"""

import argparse
import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

parser = argparse.ArgumentParser()
group = parser.add_mutually_exclusive_group(required=True)
group.add_argument("--prod", action="store_true", help="check DATABASE_URL (production)")
group.add_argument("--test", action="store_true", help="check TEST_DATABASE_URL")
parser.add_argument("--term", default="1274", help="term code being imported (default 1274 = Spring 2027)")
args = parser.parse_args()

var = "DATABASE_URL" if args.prod else "TEST_DATABASE_URL"
url = os.getenv(var)
if not url:
	sys.exit(f"{var} is not set in backend/.env")


def show(title, rows, headers):
	print(f"\n== {title}")
	if not rows:
		print("  (none)")
		return
	widths = [max(len(str(h)), *(len(str(r[i])) for r in rows)) for i, h in enumerate(headers)]
	print("  " + "  ".join(str(h).ljust(w) for h, w in zip(headers, widths, strict=False)))
	for r in rows:
		print("  " + "  ".join(str(v).ljust(w) for v, w in zip(r, widths, strict=False)))


try:
	conn = psycopg.connect(url, options="-c default_transaction_read_only=on", connect_timeout=15)
except Exception as e:
	sys.exit(f"Could not connect to {var}: {type(e).__name__}: {str(e).splitlines()[0]}")

conn.read_only = True
with conn, conn.cursor() as cur:
	cur.execute(
		"select current_database(), coalesce(host(inet_server_addr()), 'local socket'), current_setting('transaction_read_only'), split_part(version(), ' ', 2)"
	)
	db, host, ro, ver = cur.fetchone()
	print(f"Connected to {var}: database={db} server={host} postgres={ver} read_only={ro}")

	cur.execute("select name, applied::date from django_migrations where app = 'hoagieplan' order by id desc limit 3")
	show(
		"Latest hoagieplan migrations (0024 adds iw_required to Minor/Certificate)",
		cur.fetchall(),
		["migration", "applied"],
	)

	cur.execute(
		"select table_name from information_schema.columns "
		"where column_name = 'iw_required' and table_name in ('Major', 'Minor', 'Certificate') order by 1"
	)
	cols = [r[0] for r in cur.fetchall()]
	print(f"\n== Tables with an iw_required column: {', '.join(cols) or 'none'}")
	print("   (insert_yamls on preview writes it for Minor and Certificate; patch 03 stops writing it for Major)")

	cur.execute(
		"""
		select t.term_code, t.suffix,
		       (select count(*) from "Course" c where c.guid like t.term_code || '%') as courses,
		       (select count(*) from "Section" s where s.term_id = t.id) as sections,
		       (select count(distinct rcl.course_id) from "Requirement_course_list" rcl
		          join "Course" c on c.id = rcl.course_id where c.guid like t.term_code || '%') as linked_courses
		from "AcademicTerm" t order by t.term_code desc limit 6
		"""
	)
	rows = [
		(code, suffix, courses, sections, linked, f"{(100 * linked / courses):.0f}%" if courses else "-")
		for code, suffix, courses, sections, linked in cur.fetchall()
	]
	show(
		"Newest terms (linked = courses counted by at least one requirement; should be similar across terms)",
		rows,
		["term", "suffix", "courses", "sections", "linked", "linked %"],
	)

	cur.execute('select count(*) from "AcademicTerm" where term_code = %s', (args.term,))
	present = cur.fetchone()[0] > 0
	print(f"\n== Term {args.term} present: {'YES' if present else 'no'}")

	cur.execute('select count(*) from "Requirement"')
	reqs = cur.fetchone()[0]
	cur.execute('select count(*) from "Requirement_course_list"')
	links = cur.fetchone()[0]
	print(f"== Requirements: {reqs}, requirement-course links: {links}")

print("\nDone. Nothing was written.")
