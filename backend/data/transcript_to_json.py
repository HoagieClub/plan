import pdfplumber
import re
from hoagieplan.models import Course

TERMS = {
	"Spring 2027": "1284",
	"Fall 2026": "1272",
    "Spring 2026": "1274",
	"Fall 2025": "1262",
	"Spring 2025": "1264",
	"Fall 2024": "1252",
	"Spring 2024": "1254",
	"Fall 2023": "1242",
	"Spring 2023": "1244",
	"Fall 2022": "1232",
	"Spring 2022": "1234",
	"Fall 2021": "1222",
	"Spring 2021": "1224",
	"Fall 2020": "1212",
}

# Converts a transcript_pdf_path into a dictionary object of courses
# Sample output: {"Fall 2021": ["COS 126", "CWR 201", "ECO 312", "EGR 301"],
# "Spring 2022": ["COS 226", "MAT 217", "MAT 378", "ORF 309", "WRI 192"],
# "Fall 2022": ["COS 217", "COS 511", "MAT 320", "ORF 405"],
# "Spring 2023": ["COS 240", "GER 211", "MAT 325", "ORF 307", "PHI 301",],
# "Fall 2023": ["COS 333", "COS 514", "ORF 526", "POL 210"],
# "Spring 2024": ["COS 398", "COS 418", "ENG 319", "ORF 515", "ORF 523",],
# "Fall 2024": ["ART 335", "COS 326", "COS 433", "ORF 418"]}

def transcript_to_json(transcript_pdf_path):
    class_output = {}
    with pdfplumber.open(transcript_pdf_path) as pdf:
        total_lines = []
        for _, page in enumerate(pdf.pages, start=1):
            lines = page.extract_text().splitlines()
            total_lines.extend(lines)
        currentTerm = ""
        currentTermClasses = []
        for i in range(len(total_lines)):
            curr_line = total_lines[i]
            if ("Fall" in curr_line or "Spring" in curr_line or "Summer" in curr_line):
                # Only save previous term's classes if it wasn't a summer term
                if len(currentTermClasses) != 0 and "Summer" not in currentTerm:
                    class_output[currentTerm] = currentTermClasses
                
                currentTermClasses = []
                # Only set currentTerm if it's not a summer term
                if "Summer" not in curr_line:
                    currentTerm = get_current_term(total_lines[i])
                else:
                    currentTerm = ""  # Reset term if it's summer

            # Only process classes if we're not in a summer term
            row = curr_line.split(" ")
            if currentTerm and len(row) >= 2 and row[0].upper() == row[0] and len(row[0]) == 3 and row[1].isnumeric() and row[0] != "ID:":
                currClass = row[0] + " " + row[1]
                currentTermClasses.append(currClass)

        # Only save final term if it's not summer
        if currentTerm and "Summer" not in currentTerm:
            class_output[currentTerm] = currentTermClasses
        
    return class_output


# Returns the current term given the entire year and semester string
# get_current_term("2021-2022 Fall") --> "Fall 2021" 
# get_current_term("2021-2022 Spring") --> "Spring 2022" 
def get_current_term(year_and_semester_string: str) -> str:
    semester_info_list = year_and_semester_string.split(" ")
    semester = semester_info_list[1]
    year = semester_info_list[0].split("-")[0] if semester == "Fall" else semester_info_list[0].split("-")[1]
    current_term = semester + " " + year
    return current_term


# Batch queries DB for course_ids given all unique courses in transcript_dict.
# Returns mapping: "COS 126" -> "002051".
def get_course_ids_for_courses(transcript_dict):
    course_set = set()
    for courses in transcript_dict.values():
        course_set.update(course.strip().upper() for course in courses if course and course.strip())

    if not course_set:
        return {}

    # Fast exact-match path for cases where DB crosslistings already match transcript tokens.
    matched_courses = Course.objects.filter(crosslistings__in=course_set).values("crosslistings", "course_id")

    course_map = {}
    for row in matched_courses:
        cross = (row["crosslistings"] or "").strip().upper()
        if cross and cross not in course_map:
            course_map[cross] = row["course_id"]

    unresolved = [course for course in course_set if course not in course_map]
    if not unresolved:
        return course_map

    # Second batch path: map by indexed department code + catalog number.
    parsed = []
    for course in unresolved:
        match = re.match(r"^([A-Z]{3,4})\s+([0-9]+[A-Z]?)$", course)
        if match:
            parsed.append((course, match.group(1), match.group(2)))

    if parsed:
        dept_codes = {dept for _, dept, _ in parsed}
        catalog_numbers = {num for _, _, num in parsed}
        dept_catalog_matches = (
            Course.objects.filter(
                department__code__in=dept_codes,
                catalog_number__in=catalog_numbers,
            )
            .select_related("department")
            .values("department__code", "catalog_number", "course_id")
        )

        by_dept_catalog = {}
        for row in dept_catalog_matches:
            key = f"{(row['department__code'] or '').upper()} {str(row['catalog_number']).upper()}"
            if key not in by_dept_catalog:
                by_dept_catalog[key] = row["course_id"]

        for original_course, _, _ in parsed:
            cid = by_dept_catalog.get(original_course)
            if cid and original_course not in course_map:
                course_map[original_course] = cid

    return course_map


# Returns course_guid from the semester and course_id
def get_course_guid(semester, course_id):
    return TERMS[semester] + course_id


# Convert transcript_dict into guids.
def convert_to_guids(transcript_dict):
    new_transcript_dict = {}
    missing_courses = []

    course_map = get_course_ids_for_courses(transcript_dict)

    for semester, courses in transcript_dict.items():
        courses_guids = []
        for course in courses:
            course_id = course_map.get(course.strip().upper())
            if course_id is None:
                missing_courses.append(course)
                continue
            course_guid = get_course_guid(semester, course_id)
            courses_guids.append(course_guid)
        new_transcript_dict[semester] = courses_guids

    return new_transcript_dict, missing_courses


def main():
    
    pdf_url = "George_Transcript.pdf"
    transcript_json = transcript_to_json(pdf_url)
    
    correct_json = {
        "Fall 2021": ["COS 126", "CWR 201", "ECO 312", "EGR 301"],
        "Spring 2022": ["COS 226", "MAT 217", "MAT 378", "ORF 309", "WRI 192"],
        "Fall 2022": ["COS 217", "COS 511", "MAT 320", "ORF 405"],
        "Spring 2023": ["COS 240", "GER 211", "MAT 325", "ORF 307", "PHI 301",],
        "Fall 2023": ["COS 333", "COS 514", "ORF 526", "POL 210"],
        "Spring 2024": ["COS 398", "COS 418", "ENG 319", "ORF 515", "ORF 523",],
        "Fall 2024": ["ART 335", "COS 326", "COS 433", "ORF 418"]
        }
    
    assert(transcript_json == correct_json)

    transcript_dict, missing_courses = convert_to_guids(transcript_json)
    print(transcript_dict)
    print(missing_courses)
    

if __name__ == "__main__":
    main()