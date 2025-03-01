import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.test import RequestFactory
from data.transcript_to_json import transcript_to_json, convert_to_guids
from hoagieplan.models import Course, UserCourses
from hoagieplan.api.dashboard.requirements import update_transcript_courses

@csrf_exempt
@require_POST
def upload_file(request):
    if "file" not in request.FILES:
        return JsonResponse({"error": "No file uploaded"}, status=400)

    uploaded_file = request.FILES["file"]
    print(f"✅ Received file: {uploaded_file.name}, size: {uploaded_file.size} bytes")

    # Convert transcript PDF to JSON
    try:
        json_data = transcript_to_json(uploaded_file)
        transcript_output, _ = convert_to_guids(json_data)

        # 📌 Print formatted transcript data
        print("\n📌 Converted Transcript GUIDs:")
        for semester, guids in transcript_output.items():
            print(f"📅 Semester: {semester}")
            for guid in guids:
                print(f"   🏷️ GUID: {guid}")
            print()  # Add a blank line for readability
    except Exception as e:
        print(f"Error processing transcript: {e}")
        return JsonResponse({"error": "Failed to process transcript"}, status=500)
    
    # Extract NetID from the original request
    net_id = request.headers.get("X-NetId")

    # Call update_transcript_courses() and manually pass the data
    try:
        response = update_transcript_courses(request, transcript_output, net_id)
        print(f"✅ Courses successfully added.")  
        return response
    except Exception as e:
        print(f"❌ Error adding courses: {e}")
        return JsonResponse({"error": "Failed to add courses"}, status=500)
