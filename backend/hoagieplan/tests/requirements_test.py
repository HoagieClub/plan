from hoagieplan.api.almost_completed_reqs import count_outstanding_courses
from hoagieplan.api.dashboard.requirement_models import UserRequirements
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

    print("SML outstanding requirements: ", count_outstanding_courses(output_requirements.minors["SML"]))

    print("-" * 50)

    print("OQDS outstanding requirements: ", count_outstanding_courses(output_requirements.certificates["OQDS"]))


if __name__ == "__main__":
    main()
