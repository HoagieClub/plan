import os
import json
from django.test import TransactionTestCase
from hoagieplan.api.almost_completed_reqs import get_almost_completed_reqs
from constants import MINORS, CERTIFICATES

class TestRealUserAlmostCompleted(TransactionTestCase):
    # Don't create a new test database
    serialized_rollback = True

    def test_real_user_dump(self):
        netid = os.getenv("HOAGIE_NETID")
        if not netid:
            self.skipTest("Set HOAGIE_NETID to run this test, e.g. HOAGIE_NETID=jdoe")
        result = get_almost_completed_reqs(netid, top_almost_completed=10)

        # smoke checks
        self.assertIsInstance(result, dict)
        for code, remaining in result.items():
            self.assertIsInstance(code, str)
            self.assertIsInstance(remaining, int)
            self.assertGreaterEqual(remaining, 0)
            self.assertIn(code, {**MINORS, **CERTIFICATES})

        # makes it easy to see your output in test logs
        print(json.dumps(result, indent=2, sort_keys=True))
