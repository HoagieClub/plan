class UserRequirements:
    def __init__(self, data: dict):
        print(data)
        """Initialize UserRequirements with degree type, degree, minors, and certificates."""
        self.degree_type: Requirement
        self.degree: Requirement
        self.minors: dict[str, Requirement]
        self.certificates: dict[str, Requirement]

        keys = list(data.keys())
        if "BSE" in data:
            self.degree_type = Requirement(data["BSE"]["requirements"])
            keys.remove("BSE")
        elif "AB" in data:
            self.degree_type = Requirement(data["AB"]["requirements"])
            keys.remove("AB")
        else:
            self.degree_type = "Undeclared"

        if "Minors" in data:
            self.minors = {
                minor: Requirement(value["requirements"]) for minor, value in data["Minors"].items()
            }
            keys.remove("Minors")
        else:
            raise ValueError("UserRequirements must have a Minors field")

        if "Certificates" in data:
            self.certificates = {
                certificate: Requirement(value["requirements"]) for certificate, value in data["Certificates"].items()
            }
            keys.remove("Certificates")
        else:
            raise ValueError("UserRequirements must have a Certificates field")

        if len(keys) != 1:
            raise ValueError("UserRequirements is missing a degree")
        self.degree = Requirement(data[keys[0]]["requirements"])


    def __str__(self) -> str:
        fields = {
            "degree_type": self.degree_type,
            "degree": self.degree,
            "minors": {key: value for key, value in self.minors.items()},
            "certificates": {key: value for key, value in self.certificates.items()},
        }
        return str(fields)


class Requirement:
    def __init__(self, requirements: dict):
        """Initialize a Requirement with its properties. It will have either subrequirements or settled/unsettled courses."""
        self.code: str | None
        self.req_id: int
        self.manually_satisfied: bool
        self.satisfied: bool
        self.count: int
        self.min_needed: int
        self.max_counted: int | None
        self.subrequirements: dict[str, Requirement] | None
        self.settled: CourseList | None
        self.unsettled: CourseList | None
        self.is_leaf: bool

        def require(key)-> str | int | bool:
            if key not in requirements:
                raise ValueError(f"Requirements must have a {key} field")
            return requirements[key]
        
        self.code = requirements.get("code", None)
        if self.code == "Undeclared":
            self.req_id = -1
            self.manually_satisfied = False
            self.satisfied = False
            self.count = -1
            self.min_needed = -1
            self.max_counted = -1
        else:
            self.req_id = int(require("req_id"))
            self.manually_satisfied = require("manually_satisfied")
            self.satisfied = bool(require("satisfied"))
            self.count = int(require("count"))
            self.min_needed = int(require("min_needed"))
            self.max_counted = require("max_counted")

        if "subrequirements" in requirements:
            self.subrequirements = {
                key: Requirement(subreq) for key, subreq in requirements["subrequirements"].items()
            }
            self.settled = None
            self.unsettled = None
            self.is_leaf = False
        elif "settled" in requirements and "unsettled" in requirements:
            self.settled = CourseList(requirements["settled"])
            self.unsettled = CourseList(requirements["unsettled"])
            self.subrequirements = None
            self.is_leaf = True
        elif self.code == "Undeclared":
            self.subrequirements = {}
        else:
            raise ValueError("Requirements must have either subrequirements or settled/unsettled fields")


    def __str__(self):
        fields = {
            "code": self.code,
            "req_id": self.req_id,
            "manually_satisfied": self.manually_satisfied,
            "satisfied": self.satisfied,
            "count": self.count,
            "min_needed": self.min_needed,
            "max_counted": self.max_counted,
            "is_leaf": getattr(self, "is_leaf", None),
        }
        if self.subrequirements is not None:
            fields["subrequirements"] = {
                key: str(value) for key, value in self.subrequirements.items()
            }
        total_str = str(fields)
        total_str += "\n settled: " + self.settled.__str__() if self.settled is not None else ""
        total_str += "\n unsettled: " + self.unsettled.__str__() if self.unsettled is not None else ""
        return total_str


class CourseList:
    def __init__(self, course_list: list):
        """Initialize a CourseList with a list containing course information and an ID."""
        self.course_list_id: int
        self.courses: list[Course]

        if len(course_list) != 2:
            raise ValueError("CourseList must have two elements")

        self.course_list_id = course_list[1]
        self.courses = [Course(course) for course in course_list[0]]
    
    def __str__(self):
        fields = {
            "course_list_id": self.course_list_id,
            "courses": [str(course) for course in self.courses]
        }
        return str(fields)


class Course:
    def __init__(self, course_dict: dict):
        """Initialize a Course with course information from a dictionary."""
        self.code: str
        self.crosslistings: str
        self.id: int
        self.manually_settled: list[int]

        def require(key)-> str | int | bool:
            if key not in course_dict:
                raise ValueError(f"Requirements must have a {key} field")
            return course_dict[key]
        self.code = require("code")
        self.crosslistings = require("crosslistings")
        self.id = require("id")
        self.manually_settled = require("manually_settled")


    def __str__(self):
        fields = {
            "code": self.code,
            "id": self.id,
            "crosslistings": self.crosslistings,
            "manually_settled": self.manually_settled
        }
        return str(fields)