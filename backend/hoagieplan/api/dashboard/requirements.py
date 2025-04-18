import collections
import copy
import json

import orjson as oj
from django.db.models import Prefetch, Q
from django.http import JsonResponse

from hoagieplan.api.dashboard.utils import cumulative_time
from hoagieplan.api.profile.info import fetch_user_info
from hoagieplan.logger import logger
from hoagieplan.models import (
    Certificate,
    Course,
    CustomUser,
    Degree,
    Major,
    Minor,
    Requirement,
    UserCourses,
)
from hoagieplan.serializers import CourseSerializer


@cumulative_time
def check_user(net_id, major, minors, certificates):
    output = {}

    user_inst = CustomUser.objects.get(net_id=net_id)
    user_courses = create_courses(user_inst)

    if major is not None:
        major_code = major["code"]
        major_obj = Major.objects.get(code=major_code)

        # Check for degree
        degrees = major_obj.degree.all()
        for degree in degrees:
            output[degree.code] = {}
            formatted_req = check_requirements(user_inst, "Degree", degree.code, copy.deepcopy(user_courses))
            output[degree.code]["requirements"] = formatted_req

        # Check for major
        output[major_code] = {}
        if major_code != "Undeclared":
            formatted_req = check_requirements(user_inst, "Major", major_code, copy.deepcopy(user_courses))
        else:
            formatted_req = {"code": "Undeclared", "satisfied": True}
        output[major_code]["requirements"] = formatted_req

    # Check for minors
    output["Minors"] = {}
    for minor in minors:
        minor_code = minor["code"]
        output["Minors"][minor_code] = {}
        formatted_req = check_requirements(user_inst, "Minor", minor_code, copy.deepcopy(user_courses))
        output["Minors"][minor_code]["requirements"] = formatted_req

    # Check for certificates
    output["Certificates"] = {}
    for certificate in certificates:
        certificate_code = certificate["code"]
        output["Certificates"][certificate_code] = {}
        formatted_req = check_requirements(user_inst, "Certificate", certificate_code, copy.deepcopy(user_courses))
        output["Certificates"][certificate_code]["requirements"] = formatted_req

    # print(f"create_courses: {create_courses.total_time} seconds")
    # print(f"check_requirements: {check_requirements.total_time} seconds")
    # print(f"_init_courses: {_init_courses.total_time} seconds")
    # print(f"_init_req: {_init_req.total_time} seconds")
    # print(f"assign_settled_courses_to_reqs: {assign_settled_courses_to_reqs.total_time} seconds")
    # print(f"mark_possible_reqs: {mark_possible_reqs.total_time} seconds")
    # print(f"mark_possible_dist_reqs: {mark_possible_dist_reqs.total_time} seconds")
    # print(f"mark_possible_course_list_reqs: {mark_possible_course_list_reqs.total_time} seconds")
    # print(f"settle_double_counting_reqs: {settle_double_counting_reqs.total_time} seconds")
    # print(f"settle_reqs: {settle_reqs.total_time} seconds")
    # print(f"add_course_lists_to_req: {add_course_lists_to_req.total_time} seconds")
    # print(f"format_req_output: {format_req_output.total_time} seconds")

    return output


@cumulative_time
def check_requirements(user_inst, table, code, courses):
    """Determine whether requirements for 'user_inst' and 'table' are satisfied, based on the 'courses'.

    Args:
    ----
        user_inst: The user instance associated with the requirements.
        table: The table containing the root of the requirement tree.
        code: The primary key or identifier in the table.
        courses: A 2D array of dictionaries, where each dictionary represents a course.

    Returns:
    -------
        tuple:
            - bool: Whether the requirements are satisfied.
            - dict: A list of courses with details about the requirements they satisfy.
            - dict: A simplified JSON-like structure showing how much of each requirement is satisfied.
    """
    req = cached_init_req(user_inst, table, code)
    manually_satisfied_reqs = list(user_inst.requirements.values_list("id", flat=True))
    courses = _init_courses(courses)
    mark_possible_reqs(req, courses)
    assign_settled_courses_to_reqs(req, courses, manually_satisfied_reqs)
    add_course_lists_to_req(req, courses)
    formatted_req = format_req_output(req, courses, manually_satisfied_reqs)
    return formatted_req


# cache this: -2.5s. Also, do this at start up.
# TODO: Turn course lists back into sets
@cumulative_time
def cached_init_req(user_inst, table, code):
    req_dict = user_inst.req_dict
    root_id = code + ", " + table
    if req_dict:
        req_dict = oj.loads(req_dict)
        if root_id in req_dict:
            return req_dict[root_id]

        req_inst = prefetch_req_inst(table, code)
        req = _init_req(req_inst)
        req_dict[root_id] = req

        user_inst.req_dict = oj.dumps(req_dict).decode("utf-8")
        user_inst.save()
        return req

    req_dict = {}
    req_inst = prefetch_req_inst(table, code)
    req = _init_req(req_inst)
    req_dict[root_id] = req

    user_inst.req_dict = oj.dumps(req_dict).decode("utf-8")
    user_inst.save()

    return req


@cumulative_time
def _init_req(req_inst):
    req = serialize_req_inst(req_inst)

    if hasattr(req_inst, "_prefetched_objects_cache") and "req_list" in req_inst._prefetched_objects_cache:
        sub_reqs = req_inst._prefetched_objects_cache["req_list"]
    else:
        sub_reqs = req_inst.req_list.all()

    if sub_reqs:
        req["req_list"] = [_init_req(sub_req_inst) for sub_req_inst in sub_reqs]

    if req["table"] == "Requirement":
        if (
            hasattr(req_inst, "_prefetched_objects_cache")
            and "course_list" in req_inst._prefetched_objects_cache
            and "excluded_course_list" in req_inst._prefetched_objects_cache
        ):
            courses = req_inst._prefetched_objects_cache["course_list"]
            excluded_courses = req_inst._prefetched_objects_cache["excluded_course_list"]
        else:
            courses = req_inst.course_list.all()
            excluded_courses = req_inst.excluded_course_list.all()

        req["course_list"] = [course_inst.id for course_inst in courses]
        if len(req["course_list"]) == 0:
            req.pop("course_list")

        req["excluded_course_list"] = [course_inst.id for course_inst in excluded_courses]
        if len(req["excluded_course_list"]) == 0:
            req.pop("excluded_course_list")

    return req


@cumulative_time
def serialize_req_inst(req_inst):
    req = {
        "id": getattr(req_inst, "id", None),
        "name": getattr(req_inst, "name", None),
        "code": getattr(req_inst, "code", None),
        "max_counted": getattr(req_inst, "max_counted", None),
        "min_needed": getattr(req_inst, "min_needed", None),
        "double_counting_allowed": getattr(req_inst, "double_counting_allowed", False),
        "max_common_with_major": getattr(req_inst, "max_common_with_major", None),
        "completed_by_semester": getattr(req_inst, "completed_by_semester", None),
        "dept_list": getattr(req_inst, "dept_list", None),
        "dist_req": getattr(req_inst, "dist_req", None),
        "num_courses": getattr(req_inst, "num_courses", None),
        "table": req_inst._meta.db_table,
        "settled": [],
        "unsettled": [],
        "count": 0,
    }
    if req["dept_list"] is not None:
        req["dept_list"] = oj.loads(req["dept_list"])
    if req["dist_req"] is not None:
        req["dist_req"] = ensure_list(oj.loads(req["dist_req"]))

    return req


@cumulative_time
def prefetch_req_inst(table, code):
    req_inst = None

    if table == "Degree":
        req_inst = Degree.objects.prefetch_related(
            Prefetch(
                "req_list",
                queryset=Requirement.objects.prefetch_related(
                    Prefetch("req_list", queryset=Requirement.objects.all())
                ),
            )
        ).get(code=code)
    elif table == "Major":
        req_inst = Major.objects.prefetch_related(
            Prefetch(
                "req_list",
                queryset=Requirement.objects.prefetch_related(
                    Prefetch("req_list", queryset=Requirement.objects.all()),
                    "course_list",
                    "excluded_course_list",
                ),
            )
        ).get(code=code)
    elif table == "Minor":
        req_inst = Minor.objects.prefetch_related(
            Prefetch(
                "req_list",
                queryset=Requirement.objects.prefetch_related(
                    Prefetch("req_list", queryset=Requirement.objects.all()),
                    "course_list",
                    "excluded_course_list",
                ),
            )
        ).get(code=code)
    elif table == "Certificate":
        req_inst = Certificate.objects.prefetch_related(
            Prefetch(
                "req_list",
                queryset=Requirement.objects.prefetch_related(
                    Prefetch("req_list", queryset=Requirement.objects.all()),
                    "course_list",
                    "excluded_course_list",
                ),
            )
        ).get(code=code)

    return req_inst


@cumulative_time
def create_courses(user_inst):
    # Clean up any invalid records for this user
    cleanup_invalid_usercourses()
    
    courses = [[] for _ in range(8)]  # Initialize empty list for 8 semesters
    course_insts = UserCourses.objects.select_related("user", "course", "course__department").filter(user=user_inst)

    for course_inst in course_insts:
        if not course_inst or not course_inst.course:
            logger.warning(f"⚠️ ERROR: Course instance or related course is None for user {user_inst.net_id}.")
            # Delete the invalid record
            course_inst.delete()
            continue

        course = {
            "id": course_inst.course.id,
            "manually_settled": None,
            "distribution_area_short": course_inst.course.distribution_area_short,
            "crosslistings": course_inst.course.crosslistings,
            "dept_code": course_inst.course.department.code,
            "cat_num": course_inst.course.catalog_number,
        }

        req_ids = list(course_inst.requirements.values_list("id", flat=True))
        course["manually_settled"] = req_ids
        courses[course_inst.semester - 1].append(course)

    return courses


def ensure_list(x):
    if isinstance(x, list):
        return x
    elif isinstance(x, str):
        return [x]
    else:
        return []


@cumulative_time
def _init_courses(courses):
    if not courses:
        courses = [[] for i in range(8)]
    else:
        courses = copy.deepcopy(courses)
    for sem in courses:
        for course in sem:
            course["possible_reqs"] = []
            course["reqs_double_counted"] = []  # reqs satisfied for which double counting allowed
            course["num_settleable"] = 0  # number of reqs to which can be settled. autosettled if 1
            course["settled"] = []
    return courses


@cumulative_time
def mark_possible_reqs(req, courses):
    """Find all the requirements that each course can satisfy."""
    if "req_list" in req:
        for sub_req in req["req_list"]:
            mark_possible_reqs(sub_req, courses)
    else:
        if ("course_list" in req) or req["dept_list"]:
            mark_possible_course_list_reqs(req, courses)
        if req["dist_req"]:
            mark_possible_dist_reqs(req, courses)


@cumulative_time
def mark_possible_dist_reqs(req, courses):
    """Assign settleable requirements to courses (but not the other way around)."""
    for sem in courses:
        for course in sem:
            if req["id"] in course["possible_reqs"]:
                continue
            course_dist = course["distribution_area_short"]
            if not course_dist:
                continue

            course_dist = course_dist.split(" or ")
            ok = 0

            for area in course_dist:
                if area in req["dist_req"]:
                    ok = 1
                    break

            if ok == 1:
                course["possible_reqs"].append(req["id"])
                if not req["double_counting_allowed"]:
                    course["num_settleable"] += 1


@cumulative_time
def mark_possible_course_list_reqs(req, courses):
    """Assign settleable requirements to courses (but not the other way around)."""
    for sem_num, sem in enumerate(courses):
        if sem_num + 1 > req["completed_by_semester"]:
            continue
        for course in sem:
            if req["id"] in course["possible_reqs"]:
                continue
            if "excluded_course_list" in req:
                if course["id"] in req["excluded_course_list"]:
                    continue
            if req["dept_list"]:
                for code in req["dept_list"]:
                    if code == course["dept_code"]:
                        course["possible_reqs"].append(req["id"])
                        if not req["double_counting_allowed"]:
                            course["num_settleable"] += 1
                        break
            if "course_list" in req:
                if course["id"] in req["course_list"]:
                    course["possible_reqs"].append(req["id"])
                    if not req["double_counting_allowed"]:
                        course["num_settleable"] += 1


@cumulative_time
def assign_settled_courses_to_reqs(req, courses, manually_satisfied_reqs):
    """Assign only settled courses and those that can only satify one requirement, and update the appropriate counts."""
    old_deficit = req["min_needed"] - req["count"]
    if req["max_counted"]:
        old_available = req["max_counted"] - req["count"]
    else:
        old_available = 0

    was_satisfied = old_deficit <= 0
    newly_satisfied = 0
    if "req_list" in req:
        for sub_req in req["req_list"]:
            newly_satisfied_added = assign_settled_courses_to_reqs(sub_req, courses, manually_satisfied_reqs)
            if sub_req["id"] in manually_satisfied_reqs:
                newly_satisfied_added = sub_req["max_counted"]
            newly_satisfied += newly_satisfied_added
    elif req["double_counting_allowed"]:
        newly_satisfied = settle_double_counting_reqs(req, courses)
    elif ("course_list" in req) or req["dept_list"] or req["dist_req"]:
        newly_satisfied = settle_reqs(req, courses)
    elif req["num_courses"]:
        newly_satisfied = check_degree_progress(req, courses)
    else:
        # for papers, IW, where there are no leaf nodes
        newly_satisfied = 1

    req["count"] += newly_satisfied
    new_deficit = req["min_needed"] - req["count"]
    if (not was_satisfied) and (new_deficit <= 0):
        if req["max_counted"] is None:
            return req["count"]
        else:
            return min(req["max_counted"], req["count"])
    elif was_satisfied and (new_deficit <= 0):
        if req["max_counted"] is None:
            return newly_satisfied
        else:
            return min(old_available, newly_satisfied)
    else:
        return 0


@cumulative_time
def settle_double_counting_reqs(req, courses):
    """Find and settle all courses in 'courses' that satisfy 'req', where double counting is allowed."""
    num_marked = 0
    for sem in courses:
        for course in sem:
            if req["id"] in course["possible_reqs"]:
                num_marked += 1
                course["reqs_double_counted"].append(req["id"])
    return num_marked


@cumulative_time
def settle_reqs(req, courses):
    """Find and settle all courses in 'courses' that satisfy 'req', where double counting is not allowed."""
    num_marked = 0
    for sem in courses:
        for course in sem:
            if len(course["manually_settled"]) > 0:
                for p in course[
                    "manually_settled"
                ]:  # go through the requirements this course was manually settled into
                    if (p == req["id"]) and (p in course["possible_reqs"]):
                        course["settled"].append(req["id"])
                        num_marked += 1
                        break
            if (
                (course["num_settleable"] == 1)
                and (req["id"] in course["possible_reqs"])
                and (req["id"] not in course["settled"])
            ):  # if course can only fall into the currrent requirement, settle it
                num_marked += 1
                course["settled"].append(req["id"])
    return num_marked


@cumulative_time
def check_degree_progress(req, courses):
    """Check whether the correct number of courses have been completed by the end of semester number (1-8)."""
    by_semester = req["completed_by_semester"]
    num_courses = 0
    if by_semester is None or by_semester > len(courses):
        by_semester = len(courses)
    for i in range(by_semester):
        num_courses += len(courses[i])
    return num_courses


@cumulative_time
def add_course_lists_to_req(req, courses):
    """Add course lists for each requirement that either (a) has no subrequirements, or (b) has hidden subrequirements."""
    if "req_list" in req:
        for sub_req in req["req_list"]:
            add_course_lists_to_req(sub_req, courses)
    req["settled"] = []
    req["unsettled"] = []
    for sem in courses:
        for course in sem:
            if (req["table"] == "Requirement") and req["double_counting_allowed"]:
                if len(course["reqs_double_counted"]) > 0:
                    for req_id in course["reqs_double_counted"]:
                        if req_id == req["id"]:
                            req["settled"].append(course["id"])
            elif len(course["settled"]) > 0:
                for req_id in course["settled"]:
                    if req_id == req["id"]:
                        req["settled"].append(course["id"])
            else:
                for req_id in course["possible_reqs"]:
                    if req_id == req["id"]:
                        req["unsettled"].append(course["id"])
                        break


@cumulative_time
def format_req_output(req, courses, manually_satisfied_reqs):
    """Enforce the type and order of fields in the req output."""
    output = collections.OrderedDict()
    if req["table"] != "Requirement" and req["code"]:
        output["code"] = req["code"]
    if req["table"] == "Requirement" and req["name"]:
        output["name"] = req["name"]
    output["req_id"] = req["id"]
    output["manually_satisfied"] = req["id"] in manually_satisfied_reqs
    output["satisfied"] = str((req["min_needed"] - req["count"] <= 0) or output["manually_satisfied"])
    output["count"] = str(req["count"])
    output["min_needed"] = str(req["min_needed"])
    output["max_counted"] = req["max_counted"]
    if "req_list" in req:  # internal node. recursively call on children
        req_list = {}
        for i, subreq in enumerate(req["req_list"]):
            child = format_req_output(subreq, courses, manually_satisfied_reqs)
            if child is not None:
                if "code" in child:
                    code = child.pop("code")
                    req_list[code] = child
                elif "name" in child:
                    name = child.pop("name")
                    req_list[name] = child
                else:
                    req_list[f"Subrequirement {i + 1}"] = child
        if req_list:
            output["subrequirements"] = req_list
    if ("settled" in req) and ("req_list" not in req):
        settled = []
        for semester in courses:
            for course in semester:
                if course["id"] in req["settled"]:
                    course_output = {
                        "code": course["dept_code"] + " " + course["cat_num"],
                        "id": course["id"],
                        "crosslistings": course["crosslistings"],
                        "manually_settled": course["manually_settled"],
                    }
                    settled.append(course_output)
        output["settled"] = [settled, req["id"]]
    if ("unsettled" in req) and ("req_list" not in req):
        unsettled = []
        for semester in courses:
            for course in semester:
                if course["id"] in req["unsettled"]:
                    course_output = {
                        "code": course["dept_code"] + " " + course["cat_num"],
                        "crosslistings": course["crosslistings"],
                        "id": course["id"],
                        "manually_settled": course["manually_settled"],
                    }
                    unsettled.append(course_output)
        output["unsettled"] = [unsettled, req["id"]]
    return output


def transform_requirements(requirements):
    if "subrequirements" not in requirements:
        return requirements

    transformed = {}
    for key, subreq in requirements["subrequirements"].items():
        transformed[key] = transform_requirements(subreq)
    requirements.pop("subrequirements")

    return {**requirements, **transformed}


def transform_data(data):
    transformed_data = {}

    # Go through each major/minor and transform accordingly
    for _, value in data.items():
        if "requirements" in value:
            code = value["requirements"].pop("code")
            satisfied = value["requirements"].pop("satisfied")
            transformed_reqs = transform_requirements(value["requirements"])
            transformed_data[code] = {"satisfied": satisfied, **transformed_reqs}

    return transformed_data


def manually_settle(request):
    data = oj.loads(request.body)
    crosslistings = data.get("crosslistings")
    req_id = int(data.get("reqId"))
    net_id = request.headers.get("X-NetId")
    user_inst = CustomUser.objects.get(net_id=net_id)
    course_inst = (
        Course.objects.select_related("department")
        .filter(crosslistings__iexact=crosslistings, usercourses__user=user_inst)
        .order_by("-guid")
        .first()
    )
    if not course_inst:
        course_inst = (
            Course.objects.select_related("department")
            .filter(crosslistings__iexact=crosslistings)
            .order_by("-guid")
            .first()
        )

    user_course_inst = UserCourses.objects.get(user_id=user_inst.id, course=course_inst)
    if user_course_inst.requirements.filter(id=req_id).exists():
        user_course_inst.requirements.remove(req_id)
        return JsonResponse({"Unsettled": user_course_inst.id})
    else:
        user_course_inst.requirements.add(req_id)
        return JsonResponse({"Manually settled": user_course_inst.id})


def mark_satisfied(request):
    data = oj.loads(request.body)
    req_id = int(data.get("reqId"))
    marked_satisfied = data.get("markedSatisfied")
    net_id = request.headers.get("X-NetId")

    user_inst = CustomUser.objects.get(net_id=net_id)
    req_inst = Requirement.objects.get(id=req_id)

    if marked_satisfied == "true":
        user_inst.requirements.add(req_inst)
        action = "Marked satisfied"
    elif marked_satisfied == "false":
        if user_inst.requirements.filter(id=req_id).exists():
            user_inst.requirements.remove(req_inst)
            action = "Unmarked satisfied"
        else:
            return JsonResponse({"error": "Requirement not found in user requirements."})

    return JsonResponse({"Manually satisfied": req_id, "action": action})


def update_requirements(request):
    net_id = request.headers.get("X-NetId")
    user_info = fetch_user_info(net_id)

    this_major = user_info["major"]["code"]
    these_minors = [minor["code"] for minor in user_info["minors"]]
    these_certificates = [certificate["code"] for certificate in user_info["certificates"]]

    req_dict = check_user(user_info["netId"], user_info["major"], user_info["minors"], user_info["certificates"])

    # Rewrite req_dict so that it is stratified by requirements being met
    formatted_dict = {}
    if "AB" in req_dict:
        formatted_dict["AB"] = req_dict["AB"]
    elif "BSE" in req_dict:
        formatted_dict["BSE"] = req_dict["BSE"]
    formatted_dict[this_major] = req_dict[this_major]
    for minor in these_minors:
        formatted_dict[minor] = req_dict["Minors"][minor]
    for certificate in these_certificates:
        formatted_dict[certificate] = req_dict["Certificates"][certificate]
    formatted_dict = transform_data(formatted_dict)

    def pretty_print(data, indent=0):
        for key, value in data.items():
            print("  " * indent + str(key))
            if isinstance(value, dict):
                pretty_print(value, indent + 1)
            else:
                print("  " * (indent + 1) + str(value))

    return JsonResponse(formatted_dict)


# ---------------------------- FETCH REQUIREMENT INFO -----------------------------------#


def requirement_info(request):
    req_id = request.GET.get("reqId", "")
    net_id = request.headers.get("X-NetId")
    explanation = ""
    completed_by_semester = 8
    dist_req = []
    sorted_dept_list = []
    sorted_course_list = []
    sorted_dept_sample_list = []
    marked_satisfied = False

    try:
        req_inst = Requirement.objects.get(id=req_id)
        user_inst = CustomUser.objects.get(net_id=net_id)

        explanation = req_inst.explanation
        completed_by_semester = req_inst.completed_by_semester
        if req_inst.dist_req:
            dist_req = ensure_list(oj.loads(req_inst.dist_req))
            query = Q()
            for distribution in dist_req:
                query |= Q(distribution_area_short__icontains=distribution)
            course_list = (
                Course.objects.select_related("department")
                .filter(query)
                .order_by("course_id", "-guid")
                .distinct("course_id")
            )
        else:
            excluded_course_ids = req_inst.excluded_course_list.values_list("course_id", flat=True).distinct()
            course_list = (
                req_inst.course_list.exclude(course_id__in=excluded_course_ids)
                .order_by("course_id", "-guid")
                .distinct("course_id")
            )

        if course_list:
            serialized_course_list = CourseSerializer(course_list, many=True)
            sorted_course_list = sorted(serialized_course_list.data, key=lambda course: course["crosslistings"])

        if req_inst.dept_list:
            sorted_dept_list = sorted(oj.loads(req_inst.dept_list))

            query = Q()

            for dept in sorted_dept_list:
                # Fetch the IDs of 5 courses for the current department
                dept_course_ids = (
                    Course.objects.select_related("department")
                    .filter(department__code=dept)
                    .values_list("id", flat=True)[:5]
                )

                query |= Q(id__in=list(dept_course_ids))

            dept_sample_list = (
                Course.objects.select_related("department")
                .filter(query)
                .order_by("course_id", "-guid")
                .distinct("course_id")
            )
            if dept_sample_list:
                serialized_dept_sample_list = CourseSerializer(dept_sample_list, many=True)
                sorted_dept_sample_list = sorted(
                    serialized_dept_sample_list.data,
                    key=lambda course: course["crosslistings"],
                )

        marked_satisfied = user_inst.requirements.filter(id=req_id).exists()

    except Requirement.DoesNotExist:
        pass

    info = {}
    info[0] = req_id
    info[1] = explanation
    info[2] = completed_by_semester
    info[3] = dist_req
    info[4] = sorted_dept_list
    info[5] = sorted_course_list
    info[6] = sorted_dept_sample_list
    info[7] = marked_satisfied
    return JsonResponse(info)


def parse_semester(semester_id, class_year):
    try:
        term, year = semester_id.split(" ")
        year = int(year)  # Ensure it's an integer
        is_Fall = 1 if term == "Fall" else 0
        semester_num = 8 - ((class_year - year) * 2 - is_Fall)
        return semester_num
    except ValueError:
        raise ValueError(f"Invalid semester format: {semester_id}")
    
def assign_sequential_semesters(transcript_data):
    """
    Assigns sequential semester numbers based on their order in the JSON file.
    The first semester in the transcript gets '1', the second '2', etc.
    """
    semester_list = list(transcript_data.keys())  # Preserve the order of appearance
    semester_mapping = {semester: i + 1 for i, semester in enumerate(semester_list)}
    return semester_mapping




def parse_transcript_semester(semester_name):
    try:
        term, year = semester_name.split(' ')  # Fix the order
        return f"{term} {year}"  # Keep it unchanged
    except ValueError:
        raise ValueError(f"Invalid semester format: {semester_name}")

def update_transcript_courses(request):
    try:
        body_data = request.body.decode('utf-8')
        data = json.loads(body_data)
        
        if not isinstance(data, dict):
            raise TypeError(f"Expected dictionary but got {type(data)}")

        net_id = request.headers.get("X-NetId")
        user_inst = CustomUser.objects.get(net_id=net_id)
        
        # Clean up old UserCourses records for this user
        UserCourses.objects.filter(user=user_inst).delete()
        
        missing_courses = []
        semester_mapping = assign_sequential_semesters(data)

        for semester, courses in data.items():
            semester_number = semester_mapping[semester]

            for course_name in courses:
                # Try finding course by GUID first
                course_inst = (
                    Course.objects.select_related('department')
                    .filter(guid=course_name)
                    .order_by('-guid')
                    .first()
                )
                
                # If not found by GUID, try finding by course_id
                if not course_inst and len(course_name) >= 6:
                    course_id = course_name[-6:]
                    course_inst = (
                        Course.objects.select_related('department')
                        .filter(course_id=course_id)
                        .order_by('-guid')  # Get the most recent version
                        .first()
                    )
                
                if not course_inst:
                    missing_courses.append({
                        'guid': course_name,
                        'course_id': course_name[-6:] if len(course_name) >= 6 else course_name,
                        'semester': semester
                    })
                    continue
                
                # Create new UserCourses record
                UserCourses.objects.create(
                    user=user_inst, 
                    course=course_inst, 
                    semester=semester_number
                )

        response_data = {
            'status': 'success',
            'message': 'Courses updated successfully',
            'processed_courses': len(data),
            'missing_courses': missing_courses
        }

        return JsonResponse(response_data)

    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Invalid JSON format'}, status=400)
    except CustomUser.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': f"User with NetID {net_id} not found"}, status=404)
    except Exception as e:
        logger.error(f'❌ Internal error: {e}', exc_info=True)
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


def update_courses(request):
    try:
        # update_transcript_courses(request)
        data = json.loads(request.body)
        crosslistings = data.get("crosslistings")
        container = data.get("semesterId")
        net_id = request.headers.get("X-NetId")
        user_inst = CustomUser.objects.get(net_id=net_id)
        class_year = user_inst.class_year
    

        course_inst = (
            Course.objects.select_related("department")
            .filter(crosslistings__iexact=crosslistings, usercourses__user=user_inst)
            .order_by("-guid")
            .first()
        )
        if not course_inst:
            course_inst = (
                Course.objects.select_related("department")
                .filter(crosslistings__iexact=crosslistings)
                .order_by("-guid")
                .first()
            )

        if container == "Search Results":
            if not course_inst:
                return JsonResponse({'status': 'error', 'message': f"Course '{crosslistings}' not found"}, status=404)
            user_course = UserCourses.objects.get(user=user_inst, course=course_inst)
            user_course.delete()
            message = f"User course deleted: {crosslistings}, {net_id}"
        else:
            semester = parse_semester(container, class_year)

            user_course, created = UserCourses.objects.update_or_create(
                user=user_inst, course=course_inst, defaults={"semester": semester}
            )

        return JsonResponse({"status": "success", "message": message})

    except Exception as e:
        logger.error(f'An internal error occurred: {e}', exc_info=True)
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


def cleanup_invalid_usercourses():
    """Remove any UserCourses records that have null courses or invalid course references."""
    invalid_records = UserCourses.objects.filter(
        Q(course__isnull=True) | 
        Q(course__department__isnull=True)
    )
    count = invalid_records.count()
    if count > 0:
        logger.info(f"Cleaning up {count} invalid UserCourses records")
        invalid_records.delete()
    return count

