from typing import Dict

from constants import CERTIFICATES, MINORS
from hoagieplan.api.dashboard.requirement_models import Requirement, UserRequirements
from hoagieplan.api.dashboard.requirements import check_user
from hoagieplan.api.profile.info import fetch_user_info

TOP_ALMOST_COMPLETED = 3


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
        minor: count_outstanding_courses(output_requirements.minors[minor]) 
        for minor in MINORS.keys()
    }
    outstanding_reqs_certs = {
        cert: count_outstanding_courses(output_requirements.certificates[cert]) 
        for cert in CERTIFICATES.keys()
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
    """
    Return the minimal number of *additional* courses still needed to satisfy
    the given Requirement tree.

    Notes:
    - Uses unsettled candidate courses to cover remaining slots where possible.
    - Prevents double counting the same course across sibling leaves by sharing `used`.
    - If you want a conservative *upper bound* instead of the minimal path,
      call the helper with ignore_candidates=True.
    """
    return count_outstanding_courses_helper(requirement, used=[], ignore_candidates=False)


def count_outstanding_courses_helper(requirement: Requirement, used: list, ignore_candidates: bool = False) -> int:
    """
    Recursively compute the minimal number of *additional* courses required
    to satisfy `requirement`.

    Rules:
    - Leaf node: need = max(0, min_needed - count). If `ignore_candidates` is False,
      greedily claim from `unsettled.courses` whose ids are not in `used`, and return
      the remaining shortfall. Claimed ids are appended to `used` to avoid reuse.
    - Group (non-leaf): treat as a k-of-n chooser. Recurse into children sharing `used`,
      sort child costs ascending, and sum the cheapest `k = min_needed` values.

    Parameters
    ----------
    requirement : Requirement
        The current node (root or child) in the requirement tree.
    used : list
        A shared list of course ids already claimed elsewhere in the traversal.
    ignore_candidates : bool
        If True, do not credit unsettled candidate courses at leaves (upper bound).
        If False, credit candidates (minimal path).

    Returns
    -------
    int
        Minimal additional courses required for this node.
    """
    if requirement is None:
        return 0  # defensive

    # ---------- LEAF: directly about courses ----------
    if getattr(requirement, "is_leaf", False):
        min_needed = max(0, getattr(requirement, "min_needed", 0))
        have = max(0, getattr(requirement, "count", 0))

        # nothing required or already satisfied
        if min_needed == 0 or have >= min_needed:
            return 0

        needed = min_needed - have
        if ignore_candidates:
            return needed

        # try to cover with unsettled candidates (without double-counting)
        unsettled = getattr(requirement, "unsettled", None)
        courses = getattr(unsettled, "courses", []) if unsettled is not None else []

        claimed = 0
        for course in courses:
            if claimed >= needed:
                break
            cid = getattr(course, "id", None)
            if cid is not None and cid not in used:
                used.append(cid)  # claim globally so siblings can't reuse it
                claimed += 1

        return max(0, needed - claimed)

    # ---------- GROUP: k-of-n children ----------
    subreqs = getattr(requirement, "subrequirements", None) or {}
    if not subreqs:
        # No children present — fall back to this node's own quota/count defensively.
        k = max(0, getattr(requirement, "min_needed", 0))
        have = max(0, getattr(requirement, "count", 0))
        return max(0, k - have)

    # compute each child's cost, sharing the same `used` list to prevent double-counting
    child_costs = [
        count_outstanding_courses_helper(child, used, ignore_candidates)
        for child in subreqs.values()
    ]
    child_costs.sort()  # cheapest first

    k = max(0, getattr(requirement, "min_needed", 0))

    if k == 0:
        return 0

    return sum(child_costs[:min(k, len(child_costs))])


