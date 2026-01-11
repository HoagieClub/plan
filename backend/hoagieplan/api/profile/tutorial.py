from django.http import JsonResponse
from rest_framework.decorators import api_view
from hoagieplan.models import CustomUser


@api_view(["GET"])
def get_status(request):
    net_id = request.user.net_id

    try:
        user_inst = CustomUser.objects.get(net_id=net_id)
        return JsonResponse({"hasSeenTutorial": user_inst.seen_tutorial})
    except CustomUser.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)
    except Exception as e:
        print(f"An error occurred: {e}")
        return JsonResponse({"error": "An internal error occurred"}, status=500)


@api_view(["POST"])
def set_status(request):
    net_id = request.user.net_id
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
