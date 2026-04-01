import os
import re
import sys
import time
from datetime import date
from pathlib import Path

import django
import orjson as oj
import yaml
from django.db import transaction
from django.db.models import Q

import constants

sys.path.append(str(Path("../").resolve()))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from hoagieplan.models import (
    Certificate,
    Course,
    CustomUser,
    Degree,
    Department,
    Major,
    Minor,
    Requirement,
)

DEGREE_FIELDS = ["name", "code", "description", "urls"]
MAJOR_FIELDS = ["name", "code", "description", "urls", "contacts", "iw_required"]
MINOR_FIELDS = ["name", "code", "description", "urls", "contacts", "apply_by_semester", "iw_required"]
CERTIFICATE_FIELDS = [
    "name",
    "code",
    "description",
    "urls",
    "contacts",
    "apply_by_semester",
    "active_until",
    "iw_required",
]
REQUIREMENT_FIELDS = [
    "name",
    "max_counted",
    "min_needed",
    "explanation",
    "double_counting_allowed",
    "max_common_with_major",
    "pdfs_allowed",
    "min_grade",
    "completed_by_semester",
    "dept_list",
    "dist_req",
    "num_courses",
]
UNDECLARED = {"code": "Undeclared", "name": "Undeclared"}

TWO_DIGIT_WILDCARD = re.compile(r"^\d\d\*$")
ONE_DIGIT_WILDCARD = re.compile(r"^\d\*{1,2}$")

# Global caches to avoid repeated database queries
DEPT_CACHE = {}
MAJOR_CACHE = {}
MINOR_CACHE = {}
DEGREE_CACHE = {}


def initialize_caches():
    """Load all reference data into memory to avoid repeated DB queries."""
    global DEPT_CACHE, MAJOR_CACHE, MINOR_CACHE, DEGREE_CACHE

    print("Initializing caches...")
    DEPT_CACHE = {dept.code: dept for dept in Department.objects.all()}
    print(f"Cached {len(DEPT_CACHE)} departments")

    DEGREE_CACHE = {degree.code: degree for degree in Degree.objects.all()}
    print(f"Cached {len(DEGREE_CACHE)} degrees")

    MAJOR_CACHE = {major.code: major for major in Major.objects.all()}
    print(f"Cached {len(MAJOR_CACHE)} majors")

    MINOR_CACHE = {minor.code: minor for minor in Minor.objects.all()}
    print(f"Cached {len(MINOR_CACHE)} minors")

    print("Caches initialized!")


def load_data(yaml_file):
    with open(yaml_file, "r") as file:
        data = yaml.safe_load(file)  # this is a Python dict
        return data


def load_all_data(path: Path) -> list[dict]:
    return [load_data(str(f)) for f in path.glob("*.yaml")]


# Recursively validates if req_list has sibling requirements of duplicate names
def validate_yaml(req_list: list[dict], path: str = "root") -> None:
    req_names = [req.get("name") for req in req_list if isinstance(req, dict)]
    seen_names = set()

    # Check for null or duplicate names among siblings
    for name in req_names:
        if name is None:
            raise ValueError(f"Requirement with null name found at {path}")
        if name in seen_names:
            raise ValueError(f"Duplicate sibling requirement name '{name}' at {path}")
        seen_names.add(name)

    # Recursively validate sub-requirements
    for req in req_list:
        if isinstance(req, dict) and "req_list" in req:
            validate_yaml(req["req_list"], path=f"{path} -> {req.get('name')}")


# Validate all YAMLs for siblings with duplicate names
def validate_yamls(all_data: list[dict]) -> None:
    errors = []
    for data in all_data:
        try:
            validate_yaml(data["req_list"], path=data["name"])
        except ValueError as e:
            errors.append(str(e))

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        raise ValueError(f"Validation failed with {len(errors)} error(s). Aborting.")


def delete_orphaned_requirements(qs) -> None:
    orphans = list(qs)
    for orphan in orphans:
        print(f"Deleting orphaned requirement: {orphan.name!r} (id={orphan.id})")
    if orphans:
        qs.delete()


def load_course_list(course_list):
    query = Q()
    dept_list = []

    for course_code in course_list:
        if isinstance(course_code, dict):
            course_code = list(course_code.keys())[0]
        dept_code = course_code.replace("/", " ").split(" ")[0]
        course_num = course_code.replace("/", " ").split(" ")[1]

        if dept_code == "LANG":
            for lang_dept in constants.LANG_DEPTS:
                dept = DEPT_CACHE.get(lang_dept)
                if not dept:
                    print(f"Dept with code {lang_dept} not found")
                    continue

                dept_id = dept.id

                if course_num in ["*", "***"]:
                    dept_list.append(lang_dept)
                elif TWO_DIGIT_WILDCARD.match(course_num):
                    query |= Q(department_id=dept_id, catalog_number__startswith=course_num[:2])
                elif ONE_DIGIT_WILDCARD.match(course_num):
                    query |= Q(department_id=dept_id, catalog_number__startswith=course_num[0])
                else:
                    query |= Q(department_id=dept_id, catalog_number=course_num)
        else:
            dept = DEPT_CACHE.get(dept_code)
            if not dept:
                print(f"Dept with code {dept_code} not found")
                continue

            dept_id = dept.id

            if course_num in ["*", "***"]:
                dept_list.append(dept_code)
            elif TWO_DIGIT_WILDCARD.match(course_num):
                query |= Q(department_id=dept_id, catalog_number__startswith=course_num[:2])
            elif ONE_DIGIT_WILDCARD.match(course_num):
                query |= Q(department_id=dept_id, catalog_number__startswith=course_num[0])
            else:
                query |= Q(department_id=dept_id, catalog_number=course_num)

    course_inst_list = list(Course.objects.filter(query)) if query else []
    return course_inst_list, dept_list


def push_requirement(
    req: dict,
    parent: Requirement | None = None,
    degree: Degree | None = None,
    major: Major | None = None,
    minor: Minor | None = None,
    certificate: Certificate | None = None,
) -> Requirement:
    req_fields = {}

    # If this is a no_req requirement, set min_needed to 0
    if "no_req" in req:
        req["min_needed"] = 0

    for field in REQUIREMENT_FIELDS:
        if field in req:
            if field == "min_needed":
                if req[field] == "ALL":
                    if "req_list" in req:
                        req_fields[field] = len(req["req_list"])
                    elif "course_list" in req:
                        req_fields[field] = len(req["course_list"])
                elif req[field] is not None:
                    req_fields[field] = req[field]
                else:
                    continue
            elif field == "max_counted":
                if req[field] is not None:
                    req_fields[field] = req[field]
                else:
                    continue
            elif field == "dist_req":
                req_fields[field] = oj.dumps(req[field]).decode("utf-8")
            elif field == "num_courses":
                req_fields[field] = req[field]
                req_fields["min_needed"] = req[field]
            else:
                req_fields[field] = req[field]

    # For root requirements, update/create based on the degree/major/minor/cert
    if parent is None:
        req_inst, _ = Requirement.objects.update_or_create(
            parent=None,
            degree=degree,
            major=major,
            minor=minor,
            certificate=certificate,
            name=req["name"],
            defaults=req_fields,
        )
    # For non-root requirements, update/create based on the parent
    else:
        req_inst, _ = Requirement.objects.update_or_create(
            parent=parent,
            name=req["name"],
            defaults=req_fields,
        )

    if ("req_list" in req) and (len(req["req_list"]) != 0):
        seen_ids = set()
        for sub_req in req["req_list"]:
            if "completed_by_semester" in req_fields:
                sub_req["completed_by_semester"] = req_fields["completed_by_semester"]
            if "double_counting_allowed" in req_fields:
                sub_req["double_counting_allowed"] = req_fields["double_counting_allowed"]
            sub_req_inst = push_requirement(sub_req, parent=req_inst)
            seen_ids.add(sub_req_inst.id)
        delete_orphaned_requirements(Requirement.objects.filter(parent=req_inst).exclude(id__in=seen_ids))

    elif ("course_list" in req) and (len(req["course_list"]) != 0):
        course_inst_list, dept_list = load_course_list(req["course_list"])
        if course_inst_list:
            new_ids = {c.id for c in course_inst_list}
            existing_ids = set(req_inst.course_list.values_list("id", flat=True))
            if new_ids != existing_ids:
                req_inst.course_list.set(course_inst_list)
        if len(dept_list) != 0:
            req_inst.dept_list = oj.dumps(dept_list).decode("utf-8")
            req_inst.save()
        if ("excluded_course_list" in req) and (len(req["excluded_course_list"]) != 0):
            excluded_course_list, _ = load_course_list(req["excluded_course_list"])
            if excluded_course_list:
                new_excluded_ids = {c.id for c in excluded_course_list}
                existing_excluded_ids = set(req_inst.excluded_course_list.values_list("id", flat=True))
                if new_excluded_ids != existing_excluded_ids:
                    req_inst.excluded_course_list.set(excluded_course_list)

    elif (
        (("dist_req" not in req) or (req["dist_req"] is None))
        and (("num_courses" not in req) or (req["num_courses"] is None))
        and (("dept_list" not in req) or (req["dept_list"] is None))
    ):
        req_inst.max_counted = 1
        req_inst.min_needed = 0
        req_inst.save()

    return req_inst


def push_degree(data: dict):
    print(f"{data['name']}")
    degree_fields = {}

    for field in DEGREE_FIELDS:
        if field in data:
            if field == "urls":
                degree_fields[field] = oj.dumps(data[field]).decode("utf-8")
            else:
                degree_fields[field] = data[field]

    degree_fields["min_needed"] = len(data["req_list"])

    degree_inst, created = Degree.objects.update_or_create(
        name=degree_fields["name"],
        code=degree_fields["code"],
        defaults=degree_fields,
    )

    seen_ids = set()
    for req in data["req_list"]:
        req_inst = push_requirement(req, degree=degree_inst)
        seen_ids.add(req_inst.id)
    delete_orphaned_requirements(Requirement.objects.filter(degree=degree_inst, parent=None).exclude(id__in=seen_ids))

    if created:
        print(f"Created new degree: {degree_inst.name}")
    else:
        print(f"Updated existing degree: {degree_inst.name}")


def push_undeclared_major():
    print("Undeclared")
    _, created = Major.objects.update_or_create(name=UNDECLARED["name"], code=UNDECLARED["code"], defaults=UNDECLARED)
    if created:
        print(f"Created new major: {UNDECLARED['code']}")
    else:
        print(f"Updated existing major: {UNDECLARED['code']}")


def push_major(data: dict):
    print(f"{data['name']}")
    major_fields = {}

    for field in MAJOR_FIELDS:
        if field in data:
            if field in ["urls", "contacts"]:
                major_fields[field] = oj.dumps(data[field]).decode("utf-8")
            else:
                major_fields[field] = data[field]

    major_fields["min_needed"] = len(data["req_list"])
    major_inst, created = Major.objects.update_or_create(
        name=major_fields["name"], code=major_fields["code"], defaults=major_fields
    )

    degree_code = "BSE" if major_inst.code in constants.BSE_MAJORS else "AB"
    degree_inst = DEGREE_CACHE.get(degree_code)
    if degree_inst:
        major_inst.degree.add(degree_inst)
    else:
        print(f"Degree with code {degree_code} not found")

    seen_ids = set()
    for req in data["req_list"]:
        req_inst = push_requirement(req, major=major_inst)
        seen_ids.add(req_inst.id)
    delete_orphaned_requirements(Requirement.objects.filter(major=major_inst, parent=None).exclude(id__in=seen_ids))

    if created:
        print(f"Created new major: {major_inst.code}")
    else:
        print(f"Updated existing major: {major_inst.code}")


def push_minor(data: dict):
    print(f"{data['name']}")
    minor_fields = {}

    for field in MINOR_FIELDS:
        if field in data:
            if field in ["urls", "contacts"]:
                minor_fields[field] = oj.dumps(data[field]).decode("utf-8")
            else:
                minor_fields[field] = data[field]

    minor_fields["min_needed"] = len(data["req_list"])
    minor_inst, created = Minor.objects.update_or_create(
        name=minor_fields["name"], code=minor_fields["code"], defaults=minor_fields
    )

    if "excluded_majors" in data:
        excluded_majors = []
        for major_code in data["excluded_majors"]:
            major_inst = MAJOR_CACHE.get(major_code)
            if major_inst:
                excluded_majors.append(major_inst)
            else:
                print(f"Major with code {major_code} not found")
        if excluded_majors:
            minor_inst.excluded_majors.set(excluded_majors)

    if "excluded_minors" in data:
        excluded_minors = []
        for minor_code in data["excluded_minors"]:
            other_minor_inst = MINOR_CACHE.get(minor_code)
            if other_minor_inst:
                excluded_minors.append(other_minor_inst)
            else:
                print(f"Minor with code {minor_code} not found")
        if excluded_minors:
            minor_inst.excluded_minors.set(excluded_minors)

    seen_ids = set()
    for req in data["req_list"]:
        req_inst = push_requirement(req, minor=minor_inst)
        seen_ids.add(req_inst.id)
    delete_orphaned_requirements(Requirement.objects.filter(minor=minor_inst, parent=None).exclude(id__in=seen_ids))

    if created:
        print(f"Created new minor: {minor_inst.code}")
    else:
        print(f"Updated existing minor: {minor_inst.code}")


def push_certificate(data: dict):
    print(f"{data['name']}")
    certificate_fields = {}

    for field in CERTIFICATE_FIELDS:
        if field in data:
            if field in ["urls", "contacts"]:
                certificate_fields[field] = oj.dumps(data[field]).decode("utf-8")
            else:
                certificate_fields[field] = data[field]

    certificate_fields["min_needed"] = len(data["req_list"])
    certificate_fields["active_until"] = date(2025, 5, 1)
    certificate_inst, created = Certificate.objects.update_or_create(
        name=certificate_fields["name"], code=certificate_fields["code"], defaults=certificate_fields
    )

    if "excluded_majors" in data:
        excluded_majors = []
        for major_code in data["excluded_majors"]:
            major_inst = MAJOR_CACHE.get(major_code)
            if major_inst:
                excluded_majors.append(major_inst)
            else:
                print(f"Major with code {major_code} not found")
        if excluded_majors:
            certificate_inst.excluded_majors.set(excluded_majors)

    seen_ids = set()
    for req in data["req_list"]:
        req_inst = push_requirement(req, certificate=certificate_inst)
        seen_ids.add(req_inst.id)
    delete_orphaned_requirements(
        Requirement.objects.filter(certificate=certificate_inst, parent=None).exclude(id__in=seen_ids)
    )

    if created:
        print(f"Created new certificate: {certificate_inst.code}")
    else:
        print(f"Updated existing certificate: {certificate_inst.code}")


def push_degrees(all_data: list[dict]):
    print("Pushing degree requirements...")
    for degree_data in all_data:
        push_degree(degree_data)
    DEGREE_CACHE.update({degree.code: degree for degree in Degree.objects.all()})
    print("Degree requirements pushed!")


def push_majors(all_data: list[dict]):
    print("Pushing major requirements...")
    push_undeclared_major()
    for major_data in all_data:
        push_major(major_data)
    MAJOR_CACHE.update({major.code: major for major in Major.objects.all()})
    print("Major requirements pushed!")


def push_minors(all_data: list[dict]):
    print("Pushing minor requirements...")
    for minor_data in all_data:
        push_minor(minor_data)
    print("Minor requirements pushed!")


def push_certificates(all_data: list[dict]):
    print("Pushing certificate requirements...")
    for certificate_data in all_data:
        push_certificate(certificate_data)
    print("Certificate requirements pushed!")


def clear_user_req_dict():
    print("Clearing CustomUser req_dict cache...")
    CustomUser.objects.update(req_dict=None)
    print("CustomUser req_dict cache cleared!")


def main():
    degrees_path = Path("../degrees").resolve()
    majors_path = Path("../majors").resolve()
    minors_path = Path("../minors").resolve()
    certificates_path = Path("../certificates").resolve()

    degrees_data = load_all_data(degrees_path)
    majors_data = load_all_data(majors_path)
    minors_data = load_all_data(minors_path)
    certificates_data = load_all_data(certificates_path)

    validate_yamls(degrees_data + majors_data + minors_data + certificates_data)

    start_time = time.time()
    with transaction.atomic():
        initialize_caches()

        push_degrees(degrees_data)
        push_majors(majors_data)
        push_minors(minors_data)
        push_certificates(certificates_data)

    clear_user_req_dict()
    end_time = time.time()
    print(f"\nTotal execution time: {(end_time - start_time):.2f} seconds")


if __name__ == "__main__":
    main()
