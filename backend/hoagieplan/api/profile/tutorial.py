from django.http import JsonResponse
from rest_framework.decorators import api_view


@api_view(["GET"])
def get_status(request):
	return JsonResponse({"hasSeenTutorial": request.user.seen_tutorial})


@api_view(["POST"])
def set_status(request):
	request.user.seen_tutorial = True
	request.user.save(update_fields=["seen_tutorial"])
	return JsonResponse({"message": "Tutorial status updated successfully"})
