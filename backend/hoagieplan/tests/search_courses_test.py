from hoagieplan.api.dashboard.search import search_courses_helper
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


# Queries the DB for course_id given course
# Ex: get_course_id("COS 126") --> 002051
def get_course_id(course):
    response = search_courses_helper(course)
    string_data = response.content.decode("utf-8")

    # Parse JSON string to dictionary
    courses = json.loads(string_data)["courses"]
    if len(courses) != 1:
        print("search_courses.py: Exact match for %s not found" % (course))
        return None

    return courses[0]["course_id"] 


# Returns course_guid from the semester and course_id
def get_course_guid(semester, course_id):
    return TERMS[semester] + course_id


# Convert transcript_dict into using guids 
def convert_to_guids(transcript_dict):
    new_transcript_dict = {}
    missing_courses = []

    for semester, courses in transcript_dict.items():
        courses_guids = []
        for course in courses:
            print("Querying for", course)
            course_id = get_course_id(course)
            if course_id is None:
                missing_courses.append(course)
                continue
            course_guid = get_course_guid(semester, course_id)
            courses_guids.append(course_guid)
        new_transcript_dict[semester] = courses_guids
    
    return new_transcript_dict, missing_courses


def main():
    transcript_dict = {
        "Fall 2021": ["COS 126", "CWR 201", "ECO 312", "EGR 301"],
        "Spring 2022": ["COS 226", "MAT 217", "MAT 378", "ORF 309", "WRI 192"],
        "Fall 2022": ["COS 217", "COS 511", "MAT 320", "ORF 405"],
        "Spring 2023": ["COS 240", "GER 211", "MAT 325", "ORF 307", "PHI 301",],
        "Fall 2023": ["COS 333", "COS 514", "ORF 526", "POL 210"],
        "Spring 2024": ["COS 398", "COS 418", "ENG 319", "ORF 515", "ORF 523",],
        "Fall 2024": ["ART 335", "COS 326", "COS 433", "ORF 418"]
    }

    transcript_dict, missing_courses = convert_to_guids(transcript_dict)
    print(transcript_dict)
    print(missing_courses)
    
    
if __name__ == "__main__":
    main()