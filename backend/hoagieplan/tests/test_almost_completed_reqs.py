# tests/test_almost_completed_reqs.py
import types
from types import SimpleNamespace as NS
from django.test import TestCase

# Import the module under test
import hoagieplan.api.almost_completed_reqs as acr

# ---- minimal fakes to build trees ----
class LeafReq:
    def __init__(self, min_needed, count=0, candidate_ids=None):
        self.is_leaf = True
        self.min_needed = min_needed
        self.count = count
        # unsettled.courses: list of objects with .id
        courses = []
        for cid in (candidate_ids or []):
            courses.append(NS(id=cid))
        self.unsettled = NS(courses=courses)

class GroupReq:
    def __init__(self, min_needed, children):
        self.is_leaf = False
        self.min_needed = min_needed
        self.count = 0  # keep simple; ignore non-leaf count
        # preserve order for determinism
        self.subrequirements = {f"child{i}": child for i, child in enumerate(children)}


class AlmostCompletedReqsTests(TestCase):
    # ---------------- UNIT TESTS: helper ----------------

    def test_leaf_already_satisfied_returns_zero(self):
        r = LeafReq(min_needed=1, count=1, candidate_ids=["A"])
        self.assertEqual(acr.count_outstanding_courses_helper(r, used=[]), 0)

    def test_leaf_claims_candidates_to_zero(self):
        r = LeafReq(min_needed=2, count=0, candidate_ids=["A", "B"])
        self.assertEqual(acr.count_outstanding_courses_helper(r, used=[]), 0)

    def test_leaf_insufficient_candidates_returns_shortfall(self):
        r = LeafReq(min_needed=3, count=1, candidate_ids=["X"])
        # need 2; can claim 1; shortfall 1
        self.assertEqual(acr.count_outstanding_courses_helper(r, used=[]), 1)

    def test_group_k_of_n_picks_cheapest_children(self):
        # children costs will be: 0 (satisfied leaf), 1 (needs one with no candidates), 3
        c0 = LeafReq(min_needed=1, count=1)            # cost 0
        c1 = LeafReq(min_needed=1, count=0, candidate_ids=[])  # cost 1
        c3 = GroupReq( min_needed=3, children=[LeafReq(1,0,[]), LeafReq(1,0,[]), LeafReq(1,0,[])] )  # cost 3
        g = GroupReq(min_needed=2, children=[c0, c1, c3])
        self.assertEqual(acr.count_outstanding_courses_helper(g, used=[]), 1)  # 0 + 1

    def test_double_counting_prevented_same_course_id(self):
        # Two leaves both can claim "COS324". Only the first should claim it; second must count as 1.
        a = LeafReq(min_needed=1, count=0, candidate_ids=["COS324"])
        b = LeafReq(min_needed=1, count=0, candidate_ids=["COS324"])
        g = GroupReq(min_needed=2, children=[a, b])
        self.assertEqual(acr.count_outstanding_courses_helper(g, used=[]), 1)

    # ------------- INTEGRATION-ish: wiring/sorting/top-K -------------

    def test_get_all_outstanding_reqs_for_user(self):
        # Build two minors and one certificate
        # minor X: cost 0
        mX = GroupReq(1, [LeafReq(1,1)])
        # minor Y: cost 2
        mY = GroupReq(2, [LeafReq(1,0,[]), LeafReq(1,0,[])])
        # cert Z: cost 1
        cZ = LeafReq(2,1,["Z1"])

        # Fake UserRequirements that exposes .minors/.certificates
        class FakeUR:
            def __init__(self, raw):
                self.minors = {"X": mX, "Y": mY}
                self.certificates = {"Z": cZ}
                self.degree = None
                self.degree_type = None

        # Patch dependencies at module boundary
        original_fetch_user_info = acr.fetch_user_info
        original_check_user = acr.check_user
        original_UserRequirements = acr.UserRequirements
        original_MINORS = acr.MINORS
        original_CERTIFICATES = acr.CERTIFICATES

        try:
            acr.fetch_user_info = lambda net_id: {"major": "COS"}
            acr.check_user = lambda *args, **kwargs: {"dummy": True}
            acr.UserRequirements = FakeUR
            acr.MINORS = {"X": "Minor X", "Y": "Minor Y"}
            acr.CERTIFICATES = {"Z": "Cert Z"}

            result = acr._get_all_outstanding_reqs_for_user("rando")
            # result is a dict code->missing; current impl sorts descending by missing
            # expected raw counts: X:0, Y:2, Z:1
            self.assertEqual(result, {"Y": 2, "Z": 1, "X": 0})
        finally:
            # Restore original values
            acr.fetch_user_info = original_fetch_user_info
            acr.check_user = original_check_user
            acr.UserRequirements = original_UserRequirements
            acr.MINORS = original_MINORS
            acr.CERTIFICATES = original_CERTIFICATES

    def test_get_almost_completed_reqs_topK(self):
        # Return a deterministic ordered mapping: X:0, Z:1, Y:2
        original_get_all_outstanding_reqs = acr._get_all_outstanding_reqs_for_user

        try:
            acr._get_all_outstanding_reqs_for_user = lambda net_id: {"X": 0, "Z": 1, "Y": 2}
            # If your get_almost_completed_reqs sorts ascending and slices to top K,
            # you should get only {"X":0, "Z":1} for top=2
            res = acr.get_almost_completed_reqs("me", top_almost_completed=2)
            # Depending on your implementation this may be a dict preserving order or a list of pairs
            self.assertEqual(list(res.items()), [("X", 0), ("Z", 1)])
        finally:
            acr._get_all_outstanding_reqs_for_user = original_get_all_outstanding_reqs
