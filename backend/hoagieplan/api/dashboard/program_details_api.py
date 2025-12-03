import json

from django.http import JsonResponse
from rest_framework.decorators import api_view

from constants import CERTIFICATES, MINORS
from hoagieplan.logger import logger
from hoagieplan.models import Certificate, Minor, Requirement


def serialize_requirement(requirement):
    """Serialize requirement with the necessary fields."""
    return {
        "name": requirement.name,
        "explanation": requirement.explanation,
        "min_needed": requirement.min_needed,
    }


@api_view(["GET"])
def program_details(request, code):
    """Return full details for a program (minor or certificate) from the database.

    Args:
        code: Program code (e.g., "FIN", "QCB")

    Returns:
        JSON with program details including description, contacts, urls, requirements

    """
    try:
        # Determine program type using constants
        if code in MINORS:
            program_type = "minor"
            program = Minor.objects.filter(code=code).first()
        elif code in CERTIFICATES:
            program_type = "certificate"
            program = Certificate.objects.filter(code=code).first()
        else:
            return JsonResponse({"error": "Program not found"}, status=404)

        # If program doesn't exist in database, return 404
        if not program:
            return JsonResponse({"error": "Program not found in database"}, status=404)

        # Get requirements for this program
        if program_type == "minor":
            requirements = Requirement.objects.filter(minor=program, parent__isnull=True)
        else:
            requirements = Requirement.objects.filter(certificate=program, parent__isnull=True)

        # Serialize requirements
        serialized_requirements = [serialize_requirement(req) for req in requirements]

        response = {
            "code": program.code,
            "name": program.name,
            "type": program_type,
            "description": program.description or "",
            "urls": json.loads(program.urls),
            "contacts": json.loads(program.contacts),
            "requirements": serialized_requirements,
        }

        return JsonResponse(response)
    except Exception as e:
        logger.error(f"Failed to fetch program details for {code}: {e}", exc_info=True)
        return JsonResponse({"error": "Failed to fetch program details"}, status=500)
