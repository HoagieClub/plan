import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.test import RequestFactory
from data.transcript_to_json import transcript_to_json, convert_to_guids
from hoagieplan.models import Course, UserCourses
from hoagieplan.api.dashboard.requirements import update_transcript_courses
from django.test import RequestFactory

@csrf_exempt
@require_POST
def upload_file(request):
    if "file" not in request.FILES:
        return JsonResponse({"error": "No file uploaded"}, status=400)

    uploaded_file = request.FILES["file"]
    print(f"Processing transcript: {uploaded_file.name}")

    # Validate file type
    if not uploaded_file.name.lower().endswith('.pdf'):
        return JsonResponse({"error": "Please upload a PDF file"}, status=400)

    # Convert transcript PDF to JSON
    try:
        json_data = transcript_to_json(uploaded_file)
        
        # Check if the JSON data looks like a transcript
        if not json_data or not isinstance(json_data, dict):
            return JsonResponse({"error": "Invalid transcript format"}, status=400)
            
        # Check if it has at least one semester with courses
        has_valid_semesters = any(
            isinstance(courses, list) and len(courses) > 0 
            for courses in json_data.values()
        )
        if not has_valid_semesters:
            return JsonResponse({"error": "No valid courses found in transcript"}, status=400)

        transcript_output, missing_courses = convert_to_guids(json_data)

        if missing_courses:
            print(f"⚠️ Could not find: {', '.join(missing_courses)}")

    except Exception as e:
        print(f"Error processing transcript: {e}")
        return JsonResponse({"error": "Failed to process transcript. Please ensure you uploaded a valid transcript PDF."}, status=500)
    
    # Ensure we extract NetID correctly
    net_id = request.headers.get("X-NetId")
    if not net_id:
        return JsonResponse({"error": "Missing NetID in request headers"}, status=400)

    # Simulate an HTTP request with correct JSON structure
    try:
        factory = RequestFactory()
        fake_request = factory.post(
            "/update_courses/",
            data=json.dumps(transcript_output),
            content_type="application/json",
            HTTP_X_NetId=net_id
        )

        response = update_transcript_courses(fake_request)
        print("✅ Transcript processed successfully")
        return response

    except Exception as e:
        print(f"❌ Error adding courses: {e}")
        return JsonResponse({"error": "Failed to add courses"}, status=500)
