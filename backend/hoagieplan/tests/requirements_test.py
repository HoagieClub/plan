from hoagieplan.api.dashboard.requirement_models import Requirement, UserRequirements
from hoagieplan.api.dashboard.requirements import check_user


def main():
    net_id = "issacli"
    output = check_user(
        net_id,
        {"code": "COS-BSE", "name": "Computer Science - BSE"},
        [{"code": "SML", "name": "Statistics and Machine Learning"}, {"code": "FIN", "name": "Finance"}],
        [{"code": "OQDS", "name": "Optimization and Quantitative Decision Science"}],
    )

    output_requirements = UserRequirements(output)

    print("SML outstanding requirements: ",
          count_outstanding_requirements(output_requirements.minors["SML"]))
    
    print("-" * 50)

    print("OQDS outstanding requirements: ",
          count_outstanding_requirements(output_requirements.certificates["OQDS"]))
    


def count_total_requirements(requirement: Requirement) -> int:
    """Return the total number of courses that are required in a top-level Requirement object."""
    count = 0
    for req in requirement.subrequirements.values():
        count += req.min_needed
    return count



def count_outstanding_requirements(requirement: Requirement) -> int:
    return count_outstanding_requirements_helper(requirement, [])




def count_outstanding_requirements_helper(requirement: Requirement, used: list) -> int:
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

if __name__ == "__main__":
    main()
