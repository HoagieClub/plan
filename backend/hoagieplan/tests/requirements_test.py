from hoagieplan.api.almost_completed_reqs import get_almost_completed_reqs


def main():
    net_id = "issacli"
    result = get_almost_completed_reqs(net_id)
    print(result)


if __name__ == "__main__":
    main()
