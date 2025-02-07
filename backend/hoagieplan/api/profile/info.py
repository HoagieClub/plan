import orjson as oj
from datetime import datetime

from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST

from hoagieplan.api.errors.errors import UserProfileNotFoundError
from hoagieplan.logger import logger
from hoagieplan.models import Certificate, Course, CustomUser, Major, Minor
from hoagieplan.serializers import CourseSerializer


UNDECLARED = {"code": "Undeclared", "name": "Undeclared"}
VALID_CLASS_YEAR_RANGE = range(2023, 2031)


@require_POST
def get_user(request):
    """Create or fetch a user based on email prefix (NetID)."""
    user = oj.loads(request.body)
    net_id = user.get("netId")
    first_name = user.get("firstName")
    last_name = user.get("lastName")
    email = user.get("email")

    try:
        user_inst, created = CustomUser.objects.get_or_create(
            email=email,
            defaults={
                "role": "student",
                "net_id": "",
                "first_name": "",
                "last_name": "",
                "class_year": datetime.now().year + 1,
            },
        )
        if created:
            user_inst.first_name = first_name
            user_inst.last_name = last_name
            user_inst.net_id = net_id
            user_inst.username = net_id
            user_inst.save()
        else:
            email_prefix = email.split("@")[0]
            user_inst.net_id = email_prefix
            user_inst.username = email_prefix
            user_inst.save()

        return JsonResponse(format_user_data(user_inst))

    except Exception as e:
        logger.error(f"Error processing profile data for {net_id}: {e}")
        raise UserProfileNotFoundError("Failed to create user profile") from e


def format_user_data(user_inst):
    """Format user data for API response."""
    return {
        "netId": user_inst.net_id,
        "email": user_inst.email,
        "firstName": user_inst.first_name,
        "lastName": user_inst.last_name,
        "classYear": user_inst.class_year,
        "major": ({"code": user_inst.major.code, "name": user_inst.major.name} if user_inst.major else UNDECLARED),
        "minors": [{"code": minor.code, "name": minor.name} for minor in user_inst.minors.all()],
        "certificates": [{"code": cert.code, "name": cert.name} for cert in user_inst.certificates.all()],
    }


def fetch_user_info(net_id):
    """Fetch database user information."""
    try:
        user_inst, _ = CustomUser.objects.get_or_create(
            net_id=net_id,
            defaults={
                "role": "student",
                "email": "",
                "first_name": "",
                "last_name": "",
                "class_year": datetime.now().year + 1,
            },
        )
        return format_user_data(user_inst)

    except Exception as e:
        logger.error(f"Error processing profile data for {net_id}: {e}")
        raise UserProfileNotFoundError("Failed to update user profile") from e


@require_GET
def get_user_courses(request):
    """Retrieve user's courses for frontend."""
    net_id = request.headers.get("X-NetId")
    if not net_id:
        return JsonResponse({})

    try:
        user_inst = CustomUser.objects.get(net_id=net_id)
        user_course_dict = {}

        for semester in range(1, 9):
            user_courses = Course.objects.filter(usercourses__user=user_inst, usercourses__semester=semester)
            serialized_courses = CourseSerializer(user_courses, many=True)
            user_course_dict[semester] = serialized_courses.data

        return JsonResponse(user_course_dict)

    except Exception as e:
        logger.error(f"An error occurred while retrieving courses: {e}")
        return JsonResponse({"error": "Internal Server Error"}, status=500)


@require_GET
def profile(request):
    """Get user profile information."""
    net_id = request.headers.get("X-NetId")
    if not net_id:
        return JsonResponse({"error": "Not authenticated"}, status=401)

    try:
        user_info = fetch_user_info(net_id)
        return JsonResponse(user_info)
    except UserProfileNotFoundError as e:
        return JsonResponse({"error": str(e)}, status=404)
    except Exception as e:
        logger.error(f"Error in profile view: {e}")
        return JsonResponse({"error": "Internal server error"}, status=500)


@require_POST
def update_profile(request):
    """Update user profile information."""
    net_id = request.headers.get("X-NetId")
    if not net_id:
        return JsonResponse({"error": "Not authenticated"}, status=401)

    try:
        data = oj.loads(request.body)
    except oj.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    try:
        with transaction.atomic():
            user_inst = CustomUser.objects.get(net_id=net_id)

            # Update basic info
            user_inst.username = net_id
            user_inst.first_name = data.get("firstName", user_inst.first_name)
            user_inst.last_name = data.get("lastName", user_inst.last_name)
            user_inst.class_year = data.get("classYear", user_inst.class_year)

            # Update major
            major_code = data.get("major", {}).get("code", UNDECLARED["code"])
            major = Major.objects.get(code=major_code)
            user_inst.major = major

            # Update minors
            minor_codes = [m["code"] for m in data.get("minors", []) if "code" in m]
            minors = Minor.objects.filter(code__in=minor_codes)
            user_inst.minors.set(minors)

            # Update certificates
            cert_codes = [c["code"] for c in data.get("certificates", []) if "code" in c]
            certificates = Certificate.objects.filter(code__in=cert_codes)
            user_inst.certificates.set(certificates)

            user_inst.save()

        return JsonResponse(format_user_data(user_inst))

    except CustomUser.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)
    except Major.DoesNotExist:
        return JsonResponse({"error": f"Major not found: {major_code}"}, status=404)
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        return JsonResponse({"error": "Internal server error"}, status=500)


@require_POST
def update_class_year(request):
    """Update user's class year."""
    net_id = request.headers.get("X-NetId")
    if not net_id:
        return JsonResponse({"error": "Not authenticated"}, status=401)

    try:
        class_year = int(request.body)
        if class_year not in VALID_CLASS_YEAR_RANGE:
            return JsonResponse(
                {
                    "error": f"Class year must be between {VALID_CLASS_YEAR_RANGE.start} and {VALID_CLASS_YEAR_RANGE.stop-1}"
                },
                status=400,
            )

        user_inst = CustomUser.objects.get(net_id=net_id)
        user_inst.class_year = class_year
        user_inst.save()

        return JsonResponse({"status": "success", "message": "Class year updated successfully"})

    except ValueError:
        return JsonResponse({"error": "Invalid class year format"}, status=400)
    except CustomUser.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)
    except Exception as e:
        logger.error(f"Error updating class year: {e}")
        return JsonResponse({"error": "Internal server error"}, status=500)
