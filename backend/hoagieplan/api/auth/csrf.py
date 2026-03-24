from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.decorators import api_view, authentication_classes, permission_classes

# The csrf endpoint does not need auth
@api_view(["GET"])
@authentication_classes([])
@permission_classes([])
@ensure_csrf_cookie
def csrf_token_view(request):
    token = get_token(request)
    return JsonResponse({"csrfToken": token})
