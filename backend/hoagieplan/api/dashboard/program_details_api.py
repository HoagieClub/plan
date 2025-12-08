import os
import yaml
from django.http import JsonResponse
from rest_framework.decorators import api_view
from constants import MINORS, CERTIFICATES
from hoagieplan.logger import logger


@api_view(["GET"])
def program_details(request, code):
    """Return full details for a program (minor or certificate) from its YAML file.
    
    Args:
        code: Program code (e.g., "FIN", "QCB")
    
    Returns:
        JSON with program details including description, contacts, urls, requirements
    """
    try:
        # Determine if it's a minor or certificate and get the file path
        if code in MINORS:
            yaml_path = os.path.join(os.path.dirname(__file__), "../../../minors", f"{code}.yaml")
            program_type = "minor"
        elif code in CERTIFICATES:
            yaml_path = os.path.join(os.path.dirname(__file__), "../../../certificates", f"{code}.yaml")
            program_type = "certificate"
        else:
            return JsonResponse({"error": "Program not found"}, status=404)
        
        # Load and parse the YAML file
        if not os.path.exists(yaml_path):
            return JsonResponse({"error": "YAML file not found"}, status=404)
        
        with open(yaml_path, 'r') as f:
            data = yaml.safe_load(f)
        
        # Extract the fields we need
        response = {
            "code": code,
            "name": data.get("name", ""),
            "type": program_type,
            "description": data.get("description", ""),
            "urls": data.get("urls", []),
            "contacts": data.get("contacts", []),
            "requirements": data.get("req_list", [])
        }
        
        return JsonResponse(response)
    except Exception as e:
        logger.error(f"Failed to fetch program details for {code}: {e}", exc_info=True)
        return JsonResponse({"error": "Failed to fetch program details"}, status=500)
