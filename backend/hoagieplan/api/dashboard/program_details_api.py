import json

from rest_framework import serializers
from rest_framework.decorators import api_view
from rest_framework.response import Response

from constants import CERTIFICATES, MINORS
from hoagieplan.logger import logger
from hoagieplan.models import Certificate, Minor, Requirement


class ContactSerializer(serializers.Serializer):
	type = serializers.CharField()
	name = serializers.CharField()
	email = serializers.CharField(required=False)


class RequirementSerializer(serializers.Serializer):
	name = serializers.CharField()
	explanation = serializers.CharField(allow_null=True, required=False)
	min_needed = serializers.CharField(required=False)


class ProgramDetailsSerializer(serializers.Serializer):
	code = serializers.CharField()
	name = serializers.CharField()
	type = serializers.CharField()
	description = serializers.CharField(allow_blank=True)
	urls = serializers.ListField(child=serializers.CharField())
	contacts = ContactSerializer(many=True)
	requirements = RequirementSerializer(many=True)


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
			return Response({"error": "Program not found"}, status=404)

		# If program doesn't exist in database, return 404
		if not program:
			return Response({"error": "Program not found in database"}, status=404)

		# Get requirements for this program
		if program_type == "minor":
			requirements = Requirement.objects.filter(minor=program, parent__isnull=True)
		else:
			requirements = Requirement.objects.filter(certificate=program, parent__isnull=True)

		response = {
			"code": program.code,
			"name": program.name,
			"type": program_type,
			"description": program.description or "",
			"urls": json.loads(program.urls) if program.urls else [],
			"contacts": json.loads(program.contacts) if program.contacts else [],
			"requirements": list(requirements),
		}

		return Response(ProgramDetailsSerializer(response).data)
	except Exception as e:
		logger.error(f"Failed to fetch program details for {code}: {e}", exc_info=True)
		return Response({"error": "Failed to fetch program details"}, status=500)
