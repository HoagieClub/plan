from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST
from hoagieplan.models import CustomUser


def get_status(request):
    net_id = request.headers.get("X-NetId")
    print(f"NETID: {net_id}")

    try:
        user_inst = CustomUser.objects.get(net_id=net_id)
        print(user_inst.seen_tutorial)
        return JsonResponse({"hasSeenTutorial": user_inst.seen_tutorial})
    except CustomUser.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)
    except Exception as e:
        print(f"An error occurred: {e}")
        return JsonResponse({"error": "An internal error occurred"}, status=500)


def set_status(request):
    net_id = request.headers.get("X-NetId")
    if not net_id:
        return JsonResponse({})

    try:
        user_inst = CustomUser.objects.get(net_id=net_id)
        user_inst.seen_tutorial = True
        user_inst.save()
        return JsonResponse({"message": "Tutorial status updated successfully"})
    except Exception as e:
        logger.error(f"An error occurred while updating tutorial status: {e}")
        return JsonResponse({"error": "Internal Server Error"}, status=500)
