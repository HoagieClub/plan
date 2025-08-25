from typing import Dict

from constants import CERTIFICATES, MINORS
from hoagieplan.api.dashboard.requirement_models import Requirement, UserRequirements
from hoagieplan.api.dashboard.requirements import check_user
from hoagieplan.api.profile.info import fetch_user_info

TOP_ALMOST_COMPLETED = 3


def get_almost_completed_reqs(net_id: str, top_almost_completed=TOP_ALMOST_COMPLETED) -> Dict[str, int]:
    all_outstanding_reqs = _get_all_outstanding_reqs_for_user(net_id)
    return (
        all_outstanding_reqs[:top_almost_completed]
        if len(all_outstanding_reqs) > top_almost_completed
        else all_outstanding_reqs
    )


def _get_all_outstanding_reqs_for_user(net_id: str) -> Dict[str, int]:
    user_info = fetch_user_info(net_id)
    user_major = user_info["major"]

    minors_as_list = _convert_dict_to_list(MINORS)
    certs_as_list = _convert_dict_to_list(CERTIFICATES)

    user_req_output = check_user(
        net_id,
        user_major,
        minors_as_list,
        certs_as_list,
    )
    output_requirements = UserRequirements(user_req_output)

    outstanding_reqs_minors = {
        minor: count_outstanding_courses(output_requirements.minors[minor]) for minor in MINORS.keys()
    }
    outstanding_reqs_certs = {
        cert: count_outstanding_courses(output_requirements.certificates[cert]) for cert in CERTIFICATES.keys()
    }

    combined_outstanding_reqs = dict(
        sorted({**outstanding_reqs_minors, **outstanding_reqs_certs}.items(), key=lambda item: item[1], reverse=True)
    )
    print(combined_outstanding_reqs)

    return combined_outstanding_reqs


def _convert_dict_to_list(dict: Dict[str, str]) -> list:
    """Convert a dictionary to a list of dictionaries with 'code' and 'name' keys.

    Ex: {"SML": "Statistics and Machine Learning"} --> [{"code": "SML", "name": "Statistics and Machine Learning"}]
    """
    return [{"code": k, "name": v} for k, v in dict.items()]


def count_total_requirements(requirement: Requirement) -> int:
    """Return the total number of courses that are required in a top-level Requirement object."""
    count = 0
    for req in requirement.subrequirements.values():
        count += req.min_needed
    return count


def count_outstanding_courses(requirement: Requirement) -> int:
    """Return the number of courses that are still needed to satisfy a Requirement object.

    Note: This provides an upper bound, and may not strictly be the minimum number of courses needed.
    """
    return count_outstanding_courses_helper(requirement, [])


def count_outstanding_courses_helper(requirement: Requirement, used: list) -> int:
    # TODO: Need to implement
    return 1

    print(requirement)
    print()
    count = 0

    # Base case
    if requirement.is_leaf:
        # For requirements that can't be checked, or has already been satisfied
        if requirement.min_needed == 0 or requirement.count >= requirement.min_needed:
            return 0
        # For requirements that are missing courses
        needed = requirement.min_needed - requirement.count
        if requirement.unsettled.courses == []:
            return needed
        for course in requirement.unsettled.courses:
            if course.id not in used:
                used.append(course.id)
                needed -= 1
            if needed == 0:
                return 0

    for key, req in requirement.subrequirements.items():
        print(key + ": ")
        print(req)
        print()
        # count += count_requirements(req.get("subrequirements", []))
    return count
