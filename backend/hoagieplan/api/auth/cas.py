from urllib.parse import urlencode
from urllib.request import urlopen
from urllib.error import HTTPError, URLError
from re import sub
from django.conf import settings
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import redirect
from typing import Optional
from hoagieplan.api.profile.info import fetch_user_info
from hoagieplan.models import CustomUser, Major
from django.contrib.auth import login, logout
from hoagieplan.logger import logger

# TODO: CAS is no longer used since we migrated to Auth0 :(
# It was a great feat of engineering while it lasted! -windsor
def strip_ticket(request: HttpRequest) -> str:
    """Strip the ticket parameter from the request URL.

    Args:
        request (HttpRequest): Incoming request.

    Returns:
        str: URL with the CAS ticket parameter removed.

    """
    url = request.build_absolute_uri()
    return sub(r"\?&?$|&$", "", sub(r"ticket=[^&]*&?", "", url))


def validate_ticket(ticket: str, service_url: str) -> Optional[str]:
    """Validate the CAS ticket by querying the CAS server.

    Args:
        ticket (str): CAS ticket string.
        service_url (str): Service URL string.

    Returns:
        Optional[str]: The authenticated NetID if successful, None otherwise.

    """
    cas_url = settings.CAS_SERVER_URL
    params = {"service": service_url, "ticket": ticket}
    validation_url = f"{cas_url}validate?{urlencode(params)}"

    try:
        with urlopen(validation_url, timeout=5) as response:
            response_lines = response.readlines()
            if len(response_lines) == 2:
                first_line, second_line = map(str.strip, map(bytes.decode, response_lines))
                if first_line.lower() == "yes":
                    logger.info(f"Successful ticket validation: {ticket}")
                    return second_line
            logger.warning(f"Ticket validation failed. Response: {response_lines}")
    except (HTTPError, URLError) as e:
        logger.error(f"Error during CAS validation: {e}, URL: {validation_url}")
    return None


def authenticate_user(request: HttpRequest) -> JsonResponse:
    """Authenticate the user using CAS and returns a JSON response.

    Args:
        request (HttpRequest): The incoming request.

    Returns:
        JsonResponse: A response with the authentication result (authenticated or not).

    """
    if request.user.is_authenticated:
        request.session["net_id"] = request.user.net_id
        user_info = fetch_user_info(request.user.net_id)
        response_data = {"authenticated": True, "user_info": user_info}
        return JsonResponse(response_data)

    ticket = request.GET.get("ticket")
    if not ticket:
        response_data = {"authenticated": False, "error": "No ticket provided"}
        return JsonResponse(response_data, status=400)

    service_url = strip_ticket(request)
    net_id = validate_ticket(ticket, service_url)

    if not net_id:
        response_data = {"authenticated": False, "error": "Ticket validation failed"}
        return JsonResponse(response_data, status=401)

    # Fetch or create the user based on CAS info
    user, new_user = CustomUser.objects.get_or_create(username=net_id, defaults={"role": "student"})

    if new_user:
        # Initialize new user if necessary
        user.username = net_id
        user.set_unusable_password()  # CAS users don't need Django passwords
        user.major, created = Major.objects.get_or_create(code="UNDECLARED")
        user.save()

    # Log the user in and establish session
    login(request, user)
    user_info = fetch_user_info(user.net_id)
    response_data = {"authenticated": True, "user_info": user_info}
    return JsonResponse(response_data)


def cas_login(request: HttpRequest) -> HttpResponse:
    """Handle user login via CAS, validating the ticket, and redirecting to dashboard.

    Args:
        request (HttpRequest): The incoming request.

    Returns:
        HttpResponse: A redirect to the dashboard or CAS login.

    """
    if request.user.is_authenticated:
        return redirect(settings.DASHBOARD)

    ticket = request.GET.get("ticket")
    if ticket:
        # Try to authenticate the user
        auth_response = authenticate_user(request)

        if auth_response.data.get("authenticated"):
            return redirect(settings.DASHBOARD)

    # If no valid ticket, redirect to CAS login
    service_url = request.build_absolute_uri()
    login_url = f"{settings.CAS_SERVER_URL}login?service={service_url}"
    return redirect(login_url)


def cas_logout(request: HttpRequest) -> HttpResponse:
    """Log out the user and redirects to the CAS logout URL.

    Args:
        request (HttpRequest): The incoming request.

    Returns:
        HttpResponse: A redirect to the CAS logout page.

    """
    logout(request)  # Invalidate the Django session
    cas_logout_url = f"{settings.CAS_SERVER_URL}logout?service={settings.HOMEPAGE}"
    return redirect(cas_logout_url)


def dispatch(request: HttpRequest) -> HttpResponse:
    """Dispatch login, logout, or authenticate based on 'action' parameter.

    Args:
        request (HttpRequest): The incoming request.

    Returns:
        HttpResponse: Action result.

    """
    action = request.GET.get("action")
    if action == "login":
        return cas_login(request)
    elif action == "logout":
        return cas_logout(request)
    elif action == "authenticate":
        return authenticate_user(request)
    else:
        response_data = {"error": "Invalid action"}
        return JsonResponse(response_data, status=400)
