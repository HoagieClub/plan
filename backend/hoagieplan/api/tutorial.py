import orjson as oj
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST


@require_GET
def get_status(request):
    user = request.user
    return JsonResponse({"hasSeenTutorial": user.has_seen_tutorial})


@require_POST
def set_status(request):
    user = oj.loads(request.body)
    user.has_seen_tutorial = True
    user.save()
    return JsonResponse({"message": "Tutorial status updated successfully"})
