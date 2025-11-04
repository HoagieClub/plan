from hoagieplan.api.dashboard.almost_completed_reqs import get_almost_completed_reqs


def main():
    net_id = "issacli"
    
    # Get top results
    top_results = get_almost_completed_reqs(net_id)
    print("\nTop almost completed programs:")
    print("-" * 30)
    for program, courses_needed in top_results.items():
        print(f"{program}: {courses_needed} course(s) needed")


if __name__ == "__main__":
    main()
