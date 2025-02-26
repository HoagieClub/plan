import pdfplumber
from hoagieplan.api.search import search_courses
from django.http import HttpRequest
from django.test.client import RequestFactory
import json

TERMS = {
	"Spring 2026": "1264",
	"Fall 2025": "1262",
	"Spring 2025": "1254",
	"Fall 2024": "1252",
	"Spring 2024": "1244",
	"Fall 2023": "1242",
	"Spring 2023": "1234",
	"Fall 2022": "1232",
	"Spring 2022": "1224",
	"Fall 2021": "1222",
	"Spring 2021": "1214",
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
            if ("Fall" in curr_line or "Spring" in curr_line):
                if (len(currentTermClasses) != 0):
                    class_output[currentTerm] = currentTermClasses
                    currentTermClasses = []

                currentTerm = get_current_term(total_lines[i])

            row = curr_line.split(" ")
            if (len(row) >= 2 and row[0].upper() == row[0] and len(row[0]) == 3 and row[1].isnumeric() and row[0] != "ID:"):
                currClass = row[0] + " " + row[1]  
                currentTermClasses.append(currClass)
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


# Retrieves the course_id from the DB given course_code
def get_course_id(course_code):
    factory = RequestFactory()
    request = factory.get("/search_courses", {"course": course_code})
    response = search_courses(request)
    response_content = response.content.decode("utf-8")

    courses = json.loads(response_content)["courses"]
    if len(courses) != 1:
        print("search_courses.py: Exact match not found")
        return None

    return courses[0]["course_id"]


# Returns course_guid from the semester and course_id
def get_course_guid(semester, course_id):
    return TERMS[semester] + course_id


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


if __name__ == "__main__":
    main()

