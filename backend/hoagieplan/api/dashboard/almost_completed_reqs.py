from typing import Dict, Optional

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


def _check_prereq_satisfied(requirement: Requirement) -> Optional[bool]:
    """Check if a program's prerequisites are satisfied by looking for a 'Prerequisites' or 'Prerequisite' subrequirement.
    
    Returns:
        - True if prerequisites exist and are satisfied
        - False if prerequisites exist and are not satisfied
        - None if no prerequisites exist
    """
    if requirement.subrequirements is None:
        return None
    
    # Look for a subrequirement named "Prerequisites" or "Prerequisite" (case-insensitive)
    for name, subreq in requirement.subrequirements.items():
        if name.lower() in ['prerequisites', 'prerequisite']:
            # Debug: Check if count/min_needed tells us more than satisfied flag
            # If a requirement has min_needed but count is 0, it's not satisfied regardless of the flag
            if subreq.count == 0 and subreq.min_needed > 0:
                return False
            return subreq.satisfied
    
    # If no prerequisites requirement found, return None
    return None


def _check_independent_work_required(requirement: Requirement) -> bool:
    """Check if a program requires independent work by looking for an 'Independent Work' subrequirement.
    
    Returns:
        - True if independent work requirement exists
        - False if no independent work requirement exists
    """
    if requirement.subrequirements is None:
        return False
    
    # Look for a subrequirement named "Independent Work" (case-insensitive)
    for name in requirement.subrequirements.keys():
        if name.lower() == 'independent work':
            return True
    
    return False


def _get_incomplete_subrequirements(requirement: Requirement, max_items: int = 3) -> list[str]:
    """Get a list of incomplete subrequirement names for better progress visibility.
    
    Returns up to max_items incomplete subrequirement names.
    """
    if requirement.subrequirements is None:
        return []
    
    incomplete = []
    for name, subreq in requirement.subrequirements.items():
        # Skip Prerequisites and Independent Work as they're shown separately
        if name.lower() in ['prerequisites', 'prerequisite', 'independent work']:
            continue
        
        # Check if this subrequirement is incomplete
        # A subrequirement is incomplete if it's not satisfied OR if count < min_needed
        if not subreq.satisfied or subreq.count < subreq.min_needed:
            needed = subreq.min_needed - subreq.count
            if needed > 0:  # Only include if actually needs more courses
                incomplete.append(f"{name} ({needed} more)")
                
                if len(incomplete) >= max_items:
                    break
    
    return incomplete


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


def get_all_program_data(net_id: str, top_almost_completed=TOP_ALMOST_COMPLETED):
    """Optimized function that computes all program data in a single pass.
    
    Returns a tuple of (almost_completed_dict, prereq_status_dict, iw_status_dict, incomplete_subreqs_dict)
    where almost_completed_dict contains {code: courses_needed_to_complete}
    and incomplete_subreqs_dict contains {code: [list of incomplete subrequirement descriptions]}
    """
    user_info = fetch_user_info(net_id)
    user_major = user_info["major"]

    minors_as_list = _convert_dict_to_list(MINORS)
    certs_as_list = _convert_dict_to_list(CERTIFICATES)

    # Single call to check_user
    user_req_output = check_user(
        net_id,
        user_major,
        minors_as_list,
        certs_as_list,
    )
    output_requirements = UserRequirements(user_req_output)

    # Compute almost completed requirements
    all_outstanding_reqs = {}
    prereq_status_dict = {}
    iw_status_dict = {}
    incomplete_subreqs_dict = {}
    
    for minor_code in MINORS.keys():
        req = output_requirements.minors[minor_code]
        outstanding = count_outstanding_courses(req)
        all_outstanding_reqs[minor_code] = outstanding
        prereq_status_dict[minor_code] = _check_prereq_satisfied(req)
        iw_status_dict[minor_code] = _check_independent_work_required(req)
        incomplete_subreqs_dict[minor_code] = _get_incomplete_subrequirements(req)

    for cert_code in CERTIFICATES.keys():
        req = output_requirements.certificates[cert_code]
        outstanding = count_outstanding_courses(req)
        all_outstanding_reqs[cert_code] = outstanding
        prereq_status_dict[cert_code] = _check_prereq_satisfied(req)
        iw_status_dict[cert_code] = _check_independent_work_required(req)
        incomplete_subreqs_dict[cert_code] = _get_incomplete_subrequirements(req)

    pairs = sorted(all_outstanding_reqs.items(), key=lambda item: item[1])
    top_pairs = pairs[:top_almost_completed]
    almost_completed_dict = dict(top_pairs)

    return almost_completed_dict, prereq_status_dict, iw_status_dict, incomplete_subreqs_dict

