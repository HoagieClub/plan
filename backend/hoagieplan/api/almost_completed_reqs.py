from hoagieplan.api.dashboard.requirement_models import Requirement





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

