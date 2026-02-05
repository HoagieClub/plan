import orjson as oj

from hoagieplan.models import CustomUser, UserCourses, Course, Requirement
from hoagieplan.api.dashboard.windsor_approach import (
    parse_semester,
    fetch_user_info,
    get_flattened_requirements,
    build_flow_network,
    run_flow_solver,
    interpret_flow_results,
    prepare_frontend_data,
)
from hoagieplan.logger import logger
from django.http import JsonResponse


def update_requirements(request):
    net_id = request.user.net_id
    user = CustomUser.objects.get(net_id=net_id)
    user_info = fetch_user_info(net_id)
    requirements = get_flattened_requirements(user_info)
    overrides = {
        "forced_assignments": {
            (uc.course.id, req_id) for uc in UserCourses.objects.filter(user=user)
            for req_id in uc.requirements.values_list("id", flat=True)
        },
        "req_marked_satisfied": set(user.requirements.values_list("id", flat=True))
    }
    network = build_flow_network(user, requirements, overrides)
    flow_dict = run_flow_solver(network)
    flow_results = interpret_flow_results(network, flow_dict)
    frontend_data = prepare_frontend_data(request, requirements, flow_results)
    logger.debug(oj.dumps(frontend_data, option=oj.OPT_INDENT_2).decode("utf-8"))
    return JsonResponse(frontend_data)


def manually_settle(request):
    payload = oj.loads(request.body)
    crosslistings = payload.get("crosslistings")
    req_id = int(payload.get("reqId"))
    net_id = request.user.net_id
    user = CustomUser.objects.get(net_id=net_id)
    course_instance = (
        Course.objects.select_related("department")
        .filter(crosslistings__iexact=crosslistings, usercourses__user=user)
        .order_by("-guid").first()
    ) or (
        Course.objects.select_related("department")
        .filter(crosslistings__iexact=crosslistings)
        .order_by("-guid").first()
    )
    user_course = UserCourses.objects.get(user=user, course=course_instance)
    if user_course.requirements.filter(id=req_id).exists():
        user_course.requirements.remove(req_id)
    else:
        user_course.requirements.add(req_id)
    return JsonResponse({"Manually settled": user_course.id})


def mark_satisfied(request):
    payload = oj.loads(request.body)
    req_id = int(payload.get("reqId"))
    mark_flag = payload.get("markedSatisfied")
    net_id = request.user.net_id
    user = CustomUser.objects.get(net_id=net_id)
    requirement_obj = Requirement.objects.get(id=req_id)
    if mark_flag == "true":
        user.requirements.add(requirement_obj)
        action = "Marked satisfied"
    elif mark_flag == "false":
        if user.requirements.filter(id=req_id).exists():
            user.requirements.remove(requirement_obj)
            action = "Unmarked satisfied"
        else:
            return JsonResponse({"error": "Requirement not found"})
    else:
        action = "No action"
    return JsonResponse({"Manually satisfied": req_id, "action": action})


def update_courses(request):
    try:
        payload = oj.loads(request.body)
        crosslistings = payload.get("crosslistings")
        semester_identifier = payload.get("semesterId")
        net_id = request.user.net_id
        user = CustomUser.objects.get(net_id=net_id)
        class_year = user.class_year

        course_instance = (
            Course.objects.select_related("department")
            .filter(crosslistings__iexact=crosslistings, usercourses__user=user)
            .order_by("-guid").first()
        ) or (
            Course.objects.select_related("department")
            .filter(crosslistings__iexact=crosslistings)
            .order_by("-guid").first()
        )
        if semester_identifier == "Search Results":
            user_course = UserCourses.objects.get(user=user, course=course_instance)
            user_course.delete()
            message = f"Deleted: {crosslistings} for {net_id}"
        else:
            semester_index = parse_semester(semester_identifier, class_year)
            user_course, created = UserCourses.objects.update_or_create(
                user=user, course=course_instance, defaults={"semester": semester_index}
            )
            message = f"{'Added' if created else 'Updated'}: {semester_index}, {crosslistings}, {net_id}"
        return JsonResponse({"status": "success", "message": message})
    except Exception as e:
        logger.error(f"Internal error: {e}", exc_info=True)
        return JsonResponse({"status": "error", "message": "Internal error occurred"})
