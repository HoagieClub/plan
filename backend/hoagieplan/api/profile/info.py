import orjson as oj
from django.db import transaction
from django.db.models import F
from django.http import JsonResponse
from rest_framework.decorators import api_view

from hoagieplan.logger import logger
from hoagieplan.models import Certificate, Course, CustomUser, Major, Minor
from hoagieplan.serializers import CourseSerializer

UNDECLARED = {"code": "Undeclared", "name": "Undeclared"}
VALID_CLASS_YEAR_RANGE = range(2023, 2100)


@api_view(["GET"])
def get_user(request):
	"""Create or fetch a user based on email prefix (NetID)."""
	return JsonResponse(fetch_user_info(request.user))


def fetch_user_info(user_inst: CustomUser) -> dict:
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


@api_view(["GET"])
def get_user_courses(request):
	"""Retrieve user's courses for frontend."""
	try:
		all_courses = (
			Course.objects.filter(usercourses__user=request.user)
			.select_related("department")
			.annotate(semester=F("usercourses__semester"))
			.order_by("usercourses__semester")
		)

		user_course_dict = {sem: [] for sem in range(1, 9)}
		for course in all_courses:
			serialized = CourseSerializer(course).data
			user_course_dict[course.semester].append(serialized)

		return JsonResponse(user_course_dict)

	except Exception as e:
		logger.error(f"An error occurred while retrieving courses: {e}")
		return JsonResponse({"error": "Internal Server Error"}, status=500)


@api_view(["POST"])
def update_profile(request):
	"""Update user profile information."""
	try:
		data = oj.loads(request.body)
	except oj.JSONDecodeError:
		return JsonResponse({"error": "Invalid JSON"}, status=400)

	try:
		with transaction.atomic():
			user_inst = request.user

			# Update basic info
			user_inst.username = request.user.net_id
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

		return JsonResponse(fetch_user_info(user_inst))

	except Major.DoesNotExist:
		return JsonResponse({"error": f"Major not found: {major_code}"}, status=404)
	except Exception as e:
		logger.error(f"Error updating profile: {e}")
		return JsonResponse({"error": "Internal server error"}, status=500)


@api_view(["POST"])
def update_class_year(request):
	"""Update user's class year."""
	try:
		class_year = int(request.body)
		if class_year not in VALID_CLASS_YEAR_RANGE:
			return JsonResponse(
				{
					"error": f"Class year must be between {VALID_CLASS_YEAR_RANGE.start} and {VALID_CLASS_YEAR_RANGE.stop - 1}"
				},
				status=400,
			)

		user_inst = request.user
		user_inst.class_year = class_year
		user_inst.save(update_fields=["class_year"])

		return JsonResponse({"status": "success", "message": "Class year updated successfully"})

	except ValueError:
		return JsonResponse({"error": "Invalid class year format"}, status=400)
	except Exception as e:
		logger.error(f"Error updating class year: {e}")
		return JsonResponse({"error": "Internal server error"}, status=500)
