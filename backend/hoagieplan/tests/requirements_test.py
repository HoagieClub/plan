from hoagieplan.api.almost_completed_reqs import get_almost_completed_reqs, _get_all_outstanding_reqs_for_user


def main():
    net_id = "rm5883"
    
    # Get top results
    top_results = get_almost_completed_reqs(net_id)
    print("\nTop almost completed programs:")
    print("-" * 30)
    for program, courses_needed in top_results.items():
        print(f"{program}: {courses_needed} course(s) needed")
    
    # Get all results
    all_results = _get_all_outstanding_reqs_for_user(net_id)
    print("\nAll programs and their remaining requirements:")
    print("-" * 50)
    for program, courses_needed in all_results.items():
        print(f"{program}: {courses_needed} course(s) needed")


if __name__ == "__main__":
    main()
