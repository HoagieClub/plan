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
    print(requirement)
    # print()
    used = []
    return count_outstanding_courses_helper(requirement, used=used)


def count_outstanding_courses_helper(requirement: Requirement, used: list[int]) -> int:
    # Base case
    print()
    print(requirement)
    if requirement.is_leaf:
        print(requirement.req_id, "Returning ", max(0, requirement.min_needed - requirement.count))
        return max(0, requirement.min_needed - requirement.count)
    
    # Top level node
    if requirement.code is not None: 
        val = sum(
            [
                count_outstanding_courses_helper(subrequirement, used)
                for subrequirement in requirement.subrequirements.values()
            ]
        )
        print(requirement.req_id, "Returning ", val)
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
        print(requirement.req_id, "Returning ", val)
        return val
    
    val = max(
        requirement.min_needed - requirement.count,
        sum(
            sorted([
                count_outstanding_courses_helper(subrequirement, used)
                for subrequirement in requirement.subrequirements.values()
            ])[:requirement.min_needed]
        ),
    )

    print(requirement.req_id, "Returning ", val)
    return max(
        requirement.min_needed - requirement.count,
        sum(
            sorted([
                count_outstanding_courses_helper(subrequirement, used)
                for subrequirement in requirement.subrequirements.values()
            ])[:requirement.min_needed]
        ),
    )


def _is_parent_of_leaf(requirement: Requirement) -> bool:
    if requirement is None or requirement.subrequirements is None:
        return False
    for subreq in requirement.subrequirements.values():
        if not subreq.is_leaf:
            return False
    return True


# def count_outstanding_courses(requirement: Requirement) -> int:
#     """Return the minimal number of *additional* courses still needed to satisfy the given Requirement tree.

#     Notes:
#     - Uses unsettled candidate courses to cover remaining slots where possible.
#     - Prevents double counting the same course across sibling leaves by sharing `used`.
#     - If you want a conservative *upper bound* instead of the minimal path,
#       call the helper with ignore_candidates=True.

#     """
#     used = []
#     return count_outstanding_courses_helper(requirement, used=used, ignore_candidates=False)


# def count_outstanding_courses_helper(requirement: Requirement, used: list, ignore_candidates: bool = False) -> int:
#     """Recursively compute the minimal number of *additional* courses required to satisfy `requirement`.

#     Rules:
#     - Leaf node: need = max(0, min_needed - count). If `ignore_candidates` is False,
#       greedily claim from `unsettled.courses` whose ids are not in `used`, and return
#       the remaining shortfall. Claimed ids are appended to `used` to avoid reuse.
#     - Group (non-leaf): Calculate how many additional courses are needed from children.

#     Parameters
#     ----------
#     requirement : Requirement
#         The current node (root or child) in the requirement tree.
#     used : list
#         A shared list of course ids already claimed elsewhere in the traversal.
#     ignore_candidates : bool
#         If True, do not credit unsettled candidate courses at leaves (upper bound).
#         If False, credit candidates (minimal path).

#     Returns
#     -------
#     int
#         Minimal additional courses required for this node.

#     """
#     print()
#     print(requirement)
#     print(used)
#     print(ignore_candidates)

#     if requirement is None:
#         print("Returning ", 0)
#         return 0  # defensive

#     # ---------- LEAF: directly about courses ----------
#     if getattr(requirement, "is_leaf", False):
#         min_needed = max(0, requirement.min_needed)
#         count = max(0, requirement.count)

#         # nothing required or already satisfied
#         if min_needed == 0 or count >= min_needed:
#             print("Returning ", 0)
#             return 0

#         needed = min_needed - count
#         if ignore_candidates:
#             print("Returning ", needed)
#             return needed

#         # try to cover with unsettled candidates (without double-counting)
#         unsettled = requirement.unsettled
#         courses = [] if unsettled is None else unsettled.courses

#         claimed = 0
#         for course in courses:
#             if claimed >= needed:
#                 break
#             cid = getattr(course, "id", None)
#             if cid is not None and cid not in used:
#                 used.append(cid)  # claim globally so siblings can't reuse it
#                 claimed += 1

#         print("Returning ", max(0, needed - claimed))
#         return max(0, needed - claimed)

#     # ---------- GROUP: collect k courses from children ----------
#     subreqs = getattr(requirement, "subrequirements", None) or {}
#     if not subreqs:
#         k = max(0, getattr(requirement, "min_needed", 0))
#         count = max(0, getattr(requirement, "count", 0))
#         print("Returning ", max(0, k - count))
#         return max(0, k - count)

#     k = max(0, getattr(requirement, "min_needed", 0))
#     current_count = max(0, getattr(requirement, "count", 0))

#     if current_count >= k:
#         print("Returning ", 0)
#         return 0

#     # For groups: if the group itself has a deficit, that takes priority
#     # Otherwise, sum the deficits of children
#     group_deficit = k - current_count

#     if group_deficit > 0:
#         # This group needs courses - either return its deficit or sum of children, whichever is larger
#         child_total = sum(
#             count_outstanding_courses_helper(child, used, ignore_candidates) for child in subreqs.values()
#         )

#         # Return the larger of: group's own deficit, or sum of children's needs
#         result = max(group_deficit, child_total)
#     else:
#         # Group is satisfied, just return sum of children
#         result = sum(
#             count_outstanding_courses_helper(child, used, ignore_candidates) for child in subreqs.values()
#         )

#     print("Returning ", result)
#     return result
