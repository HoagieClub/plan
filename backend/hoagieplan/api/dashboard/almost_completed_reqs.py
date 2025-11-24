from typing import Dict

from constants import CERTIFICATES, MINORS
from hoagieplan.api.dashboard.requirement_models import Requirement, UserRequirements
from hoagieplan.api.dashboard.requirements import check_user
from hoagieplan.api.profile.info import fetch_user_info

TOP_ALMOST_COMPLETED = 100


def get_almost_completed_reqs(net_id: str, top_almost_completed=TOP_ALMOST_COMPLETED) -> Dict[str, int]:
    all_outstanding_reqs = _get_all_outstanding_reqs_for_user(net_id)
    # Sort by number of outstanding courses in ascending order and take the top N
    pairs = sorted(all_outstanding_reqs.items(), key=lambda item: item[1])
    top_pairs = pairs[:top_almost_completed]
    return dict(top_pairs)


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
    return combined_outstanding_reqs


def _convert_dict_to_list(dict: Dict[str, str]) -> list:
    """Convert a dictionary to a list of dictionaries with 'code' and 'name' keys.

    Ex: {"SML": "Statistics and Machine Learning"} --> [{"code": "SML", "name": "Statistics and Machine Learning"}]
    """
    return [{"code": k, "name": v} for k, v in dict.items()]


def count_outstanding_courses(requirement: Requirement) -> int:
    used = []
    return count_outstanding_courses_helper(requirement, used=used)


def count_outstanding_courses_helper(requirement: Requirement, used: list[int]) -> int:
    # Base case
    if requirement.is_leaf:
        return max(0, requirement.min_needed - requirement.count)

    # Top level node
    if requirement.code is not None:
        val = sum(
            [
                count_outstanding_courses_helper(subrequirement, used)
                for subrequirement in requirement.subrequirements.values()
            ]
        )
        return val

    # Return the min if requirement is the parent of a leaf node
    if _is_parent_of_leaf(requirement):
        val = max(
            requirement.min_needed - requirement.count,
            min(
                [
                    count_outstanding_courses_helper(subrequirement, used)
                    for subrequirement in requirement.subrequirements.values()
                ]
            ),
        )
        return val

    val = max(
        requirement.min_needed - requirement.count,
        sum(
            sorted(
                [
                    count_outstanding_courses_helper(subrequirement, used)
                    for subrequirement in requirement.subrequirements.values()
                ]
            )[: requirement.min_needed]
        ),
    )

    return max(
        requirement.min_needed - requirement.count,
        sum(
            sorted(
                [
                    count_outstanding_courses_helper(subrequirement, used)
                    for subrequirement in requirement.subrequirements.values()
                ]
            )[: requirement.min_needed]
        ),
    )


def _is_parent_of_leaf(requirement: Requirement) -> bool:
    if requirement is None or requirement.subrequirements is None:
        return False
    for subreq in requirement.subrequirements.values():
        if not subreq.is_leaf:
            return False
    return True
