from typing import List, Dict

from django.http import JsonResponse
from rest_framework.decorators import api_view

from hoagieplan.api.dashboard.almost_completed_reqs import (
    get_all_program_data,
)
from constants import MINORS, CERTIFICATES
from hoagieplan.logger import logger


@api_view(["GET"])
def almost_completed(request):
    """Return a JSON list of almost-completed programs for the current user.

    Response format: [{"code": "SML", "name": "Statistics and Machine Learning", "needed": 2, "type": "minor", "prereqFulfilled": true|false|null, "independentWorkRequired": true|false}, ...]
    """
    try:
        net_id = request.user.net_id
        
        # Optimized: compute all data in a single check_user() call
        results, prereq_status, iw_status, completion_info = get_all_program_data(net_id)

        # results is dict{code: needed_count}. Convert to list with names from MINORS/CERTIFICATES
        out: List[Dict] = []
        for code, needed in results.items():
            name = MINORS.get(code) or CERTIFICATES.get(code) or code
            typ = "minor" if code in MINORS else ("certificate" if code in CERTIFICATES else "unknown")
            prereq_fulfilled = prereq_status.get(code)  # Can be True, False, or None
            independent_work_required = iw_status.get(code, False)  # Default to False if not found
            info = completion_info.get(code, {"count": 0, "min_needed": 5})
            out.append({
                "code": code,
                "name": name,
                "needed": needed,
                "count": info["count"],
                "min_needed": info["min_needed"],
                "type": typ,
                "prereqFulfilled": prereq_fulfilled,
                "independentWorkRequired": independent_work_required
            })

        return JsonResponse({"programs": out})
    except Exception as e:
        logger.error(f"Failed to compute almost completed programs: {e}", exc_info=True)
        return JsonResponse({"programs": []})
