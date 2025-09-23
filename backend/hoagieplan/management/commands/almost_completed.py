from django.core.management.base import BaseCommand
from hoagieplan.api.almost_completed_reqs import get_almost_completed_reqs
import json

class Command(BaseCommand):
    help = "Show almost-completed minors/certificates for a user."

    def add_arguments(self, parser):
        parser.add_argument("--netid", required=True, help="User NetID")
        parser.add_argument("--top", type=int, default=10, help="How many to show")
        parser.add_argument("--json", action="store_true", help="Pretty JSON output")

    def handle(self, *args, **opts):
        netid = opts["netid"]
        top = opts["top"]
        result = get_almost_completed_reqs(netid, top_almost_completed=top)

        if opts["json"]:
            self.stdout.write(json.dumps(result, indent=2, sort_keys=True))
        else:
            for code, remaining in result.items():
                self.stdout.write(f"{code}: {remaining} course(s) remaining")
