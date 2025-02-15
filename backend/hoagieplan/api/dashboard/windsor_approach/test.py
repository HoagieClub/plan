import orjson as oj
import os
import time
import numpy as np
from scipy.sparse import csr_matrix
from scipy.sparse.csgraph import maximum_flow
from django.test import TestCase, Client, override_settings
from django.contrib.auth import get_user_model
from django.db.models import Q
from hoagieplan.models import (
    CustomUser,
    Course, 
    Department, 
    UserCourses, 
    Requirement, 
    Major,
    Minor,
    Certificate,
    Degree
)
from hoagieplan.api.dashboard.requirements import check_user, transform_data
from hoagieplan.api.dashboard.windsor_approach import (
    FlowNetwork,
    build_flow_network,
    run_flow_solver,
    interpret_flow_solution,
    transform_data_for_frontend,
    flatten_req_tree,
    fetch_flattened_requirements,
    is_eligible_for
)

# Use SQLite for testing
TEST_DB = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:'
    }
}

class TestDataMixin:
    """Mixin providing comprehensive test data setup methods matching our models."""
    
    def create_department(self, code="COS", name="Computer Science"):
        """Create a Department instance."""
        return Department.objects.create(
            code=code,
            name=name
        )
    
    def create_course(self, dept, catalog_number, dist_area="QR", **kwargs):
        """Create a Course instance with full model fields."""
        crosslistings = kwargs.get('crosslistings', f"{dept.code} {catalog_number}")
        return Course.objects.create(
            department=dept,
            catalog_number=catalog_number,
            crosslistings=crosslistings,
            title=kwargs.get('title', f"Test Course {crosslistings}"),
            description=kwargs.get('description', "Test description"),
            distribution_area_short=dist_area,
            distribution_area_long=kwargs.get('dist_area_long', "Quantitative Reasoning"),
            guid=kwargs.get('guid', f"{dept.code}{catalog_number}"),
            course_id=kwargs.get('course_id', f"{dept.code}-{catalog_number}"),
            web_address=kwargs.get('web_address', None),
            transcript_title=kwargs.get('transcript_title', None),
            long_title=kwargs.get('long_title', None),
            reading_writing_assignment=kwargs.get('reading_writing_assignment', None),
            grading_basis=kwargs.get('grading_basis', "GRAD"),
            reading_list=kwargs.get('reading_list', None)
        )
    
    def create_requirement(self, **kwargs):
        """Create a Requirement instance with all possible fields."""
        # Encode JSON fields
        dept_list = kwargs.get('dept_list')
        if dept_list is not None:
            dept_list = oj.dumps(dept_list).decode('utf-8')
        
        dist_req = kwargs.get('dist_req')
        if dist_req is not None:
            dist_req = oj.dumps(dist_req).decode('utf-8')
        
        return Requirement.objects.create(
            name=kwargs.get('name', "Test Requirement"),
            max_counted=kwargs.get('max_counted', 1),
            min_needed=kwargs.get('min_needed', 1),
            explanation=kwargs.get('explanation', "Test requirement explanation"),
            double_counting_allowed=kwargs.get('double_counting_allowed', False),
            max_common_with_major=kwargs.get('max_common_with_major', 0),
            pdfs_allowed=kwargs.get('pdfs_allowed', 0),
            min_grade=kwargs.get('min_grade', 0.0),
            completed_by_semester=kwargs.get('completed_by_semester', 8),
            parent=kwargs.get('parent', None),
            degree=kwargs.get('degree', None),
            major=kwargs.get('major', None),
            minor=kwargs.get('minor', None),
            certificate=kwargs.get('certificate', None),
            dept_list=dept_list,
            dist_req=dist_req,
            num_courses=kwargs.get('num_courses', None)
        )
    
    def create_degree(self, code="AB", name="Bachelor of Arts", **kwargs):
        """Create a Degree instance."""
        return Degree.objects.create(
            code=code,
            name=name,
            description=kwargs.get('description', "Test degree description"),
            urls=kwargs.get('urls', []),
            max_counted=kwargs.get('max_counted', None),
            min_needed=kwargs.get('min_needed', 1)
        )
    
    def create_major(self, code="COS", name="Computer Science", **kwargs):
        """Create a Major instance with optional degree association."""
        major = Major.objects.create(
            code=code,
            name=name,
            description=kwargs.get('description', "Test major description"),
            urls=kwargs.get('urls', []),
            max_counted=kwargs.get('max_counted', None),
            min_needed=kwargs.get('min_needed', 1)
        )
        if 'degree' in kwargs:
            major.degree.add(kwargs['degree'])
        if 'requirements' in kwargs:
            major.req_list.add(*kwargs['requirements'])
        return major
    
    def create_minor(self, code="COS", name="Computer Science Minor", **kwargs):
        """Create a Minor instance."""
        minor = Minor.objects.create(
            code=code,
            name=name,
            description=kwargs.get('description', "Test minor description"),
            urls=kwargs.get('urls', []),
            apply_by_semester=kwargs.get('apply_by_semester', 6),
            max_counted=kwargs.get('max_counted', None),
            min_needed=kwargs.get('min_needed', 1)
        )
        if 'requirements' in kwargs:
            minor.req_list.add(*kwargs['requirements'])
        if 'excluded_majors' in kwargs:
            minor.excluded_majors.add(*kwargs['excluded_majors'])
        if 'excluded_minors' in kwargs:
            minor.excluded_minors.add(*kwargs['excluded_minors'])
        return minor
    
    def create_user(self, net_id="test123", class_year=2024, **kwargs):
        """Create a CustomUser instance with full profile."""
        return CustomUser.objects.create(
            username=kwargs.get('username', net_id),
            net_id=net_id,
            email=kwargs.get('email', f"{net_id}@princeton.edu"),
            first_name=kwargs.get('first_name', "Test"),
            last_name=kwargs.get('last_name', "User"),
            class_year=class_year,
            role=kwargs.get('role', "student"),
            major=kwargs.get('major', None),
            req_dict=kwargs.get('req_dict', None),
            seen_tutorial=kwargs.get('seen_tutorial', False)
        )
    
    def create_user_course(self, user, course, semester=1, **kwargs):
        """Create a UserCourses instance with optional requirement assignments."""
        user_course = UserCourses.objects.create(
            user=user,
            course=course,
            semester=semester
        )
        if 'requirements' in kwargs:
            user_course.requirements.add(*kwargs['requirements'])
        return user_course
    
    def create_mock_request(self, net_id="test123"):
        """Create a mock request object with necessary headers."""
        class MockRequest:
            def __init__(self, net_id):
                self.headers = {'X-NetId': net_id}
        return MockRequest(net_id)
import orjson as oj
import numpy as np
from django.test import TestCase, override_settings
from hoagieplan.models import (
    CustomUser, Course, Department, UserCourses, Requirement, Major,
    Minor, Certificate, Degree
)
from hoagieplan.api.dashboard.windsor_approach import (
    FlowNetwork, build_flow_network, run_flow_solver, interpret_flow_solution,
    flatten_req_tree, is_eligible_for, was_manually_settled, is_marked_satisfied,
    transform_data_for_frontend
)

# Use SQLite for testing
TEST_DB = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:'
    }
}

# Assuming TestDataMixin is defined elsewhere and provides helper methods
class TestDataMixin:
    """Mixin providing comprehensive test data setup methods matching our models."""
    
    def create_department(self, code="COS", name="Computer Science"):
        from hoagieplan.models import Department  # local import in tests
        return Department.objects.create(code=code, name=name)
    
    def create_course(self, dept, catalog_number, dist_area="QR", **kwargs):
        crosslistings = kwargs.get('crosslistings', f"{dept.code} {catalog_number}")
        from hoagieplan.models import Course  # local import in tests
        return Course.objects.create(
            department=dept,
            catalog_number=catalog_number,
            crosslistings=crosslistings,
            title=kwargs.get('title', f"Test Course {crosslistings}"),
            description=kwargs.get('description', "Test description"),
            distribution_area_short=dist_area,
            distribution_area_long=kwargs.get('dist_area_long', "Quantitative Reasoning"),
            guid=kwargs.get('guid', f"{dept.code}{catalog_number}"),
            course_id=kwargs.get('course_id', f"{dept.code}-{catalog_number}"),
            web_address=kwargs.get('web_address', None),
            transcript_title=kwargs.get('transcript_title', None),
            long_title=kwargs.get('long_title', None),
            reading_writing_assignment=kwargs.get('reading_writing_assignment', None),
            grading_basis=kwargs.get('grading_basis', "GRAD"),
            reading_list=kwargs.get('reading_list', None)
        )
    
    def create_requirement(self, **kwargs):
        dept_list = kwargs.get('dept_list')
        if dept_list is not None:
            dept_list = oj.dumps(dept_list).decode('utf-8')
        dist_req = kwargs.get('dist_req')
        if dist_req is not None:
            dist_req = oj.dumps(dist_req).decode('utf-8')
        from hoagieplan.models import Requirement  # local import
        return Requirement.objects.create(
            name=kwargs.get('name', "Test Requirement"),
            max_counted=kwargs.get('max_counted', 1),
            min_needed=kwargs.get('min_needed', 1),
            explanation=kwargs.get('explanation', "Test requirement explanation"),
            double_counting_allowed=kwargs.get('double_counting_allowed', False),
            max_common_with_major=kwargs.get('max_common_with_major', 0),
            pdfs_allowed=kwargs.get('pdfs_allowed', 0),
            min_grade=kwargs.get('min_grade', 0.0),
            completed_by_semester=kwargs.get('completed_by_semester', 8),
            parent=kwargs.get('parent', None),
            degree=kwargs.get('degree', None),
            major=kwargs.get('major', None),
            minor=kwargs.get('minor', None),
            certificate=kwargs.get('certificate', None),
            dept_list=dept_list,
            dist_req=dist_req,
            num_courses=kwargs.get('num_courses', None)
        )
    
    def create_degree(self, code="AB", name="Bachelor of Arts", **kwargs):
        from hoagieplan.models import Degree
        return Degree.objects.create(
            code=code,
            name=name,
            description=kwargs.get('description', "Test degree description"),
            urls=kwargs.get('urls', []),
            max_counted=kwargs.get('max_counted', None),
            min_needed=kwargs.get('min_needed', 1)
        )
    
    def create_major(self, code="COS", name="Computer Science", **kwargs):
        from hoagieplan.models import Major
        major = Major.objects.create(
            code=code,
            name=name,
            description=kwargs.get('description', "Test major description"),
            urls=kwargs.get('urls', []),
            max_counted=kwargs.get('max_counted', None),
            min_needed=kwargs.get('min_needed', 1)
        )
        if 'degree' in kwargs:
            major.degree.add(kwargs['degree'])
        if 'requirements' in kwargs:
            major.req_list.add(*kwargs['requirements'])
        return major
    
    def create_minor(self, code="COS", name="Computer Science Minor", **kwargs):
        from hoagieplan.models import Minor
        minor = Minor.objects.create(
            code=code,
            name=name,
            description=kwargs.get('description', "Test minor description"),
            urls=kwargs.get('urls', []),
            apply_by_semester=kwargs.get('apply_by_semester', 6),
            max_counted=kwargs.get('max_counted', None),
            min_needed=kwargs.get('min_needed', 1)
        )
        if 'requirements' in kwargs:
            minor.req_list.add(*kwargs['requirements'])
        if 'excluded_majors' in kwargs:
            minor.excluded_majors.add(*kwargs['excluded_majors'])
        if 'excluded_minors' in kwargs:
            minor.excluded_minors.add(*kwargs['excluded_minors'])
        return minor
    
    def create_user(self, net_id="test123", class_year=2024, **kwargs):
        from hoagieplan.models import CustomUser
        return CustomUser.objects.create(
            username=kwargs.get('username', net_id),
            net_id=net_id,
            email=kwargs.get('email', f"{net_id}@princeton.edu"),
            first_name=kwargs.get('first_name', "Test"),
            last_name=kwargs.get('last_name', "User"),
            class_year=class_year,
            role=kwargs.get('role', "student"),
            major=kwargs.get('major', None),
            req_dict=kwargs.get('req_dict', None),
            seen_tutorial=kwargs.get('seen_tutorial', False)
        )
    
    def create_user_course(self, user, course, semester=1, **kwargs):
        from hoagieplan.models import UserCourses
        user_course = UserCourses.objects.create(
            user=user,
            course=course,
            semester=semester
        )
        if 'requirements' in kwargs:
            user_course.requirements.add(*kwargs['requirements'])
        return user_course
    
    def create_mock_request(self, net_id="test123"):
        class MockRequest:
            def __init__(self, net_id):
                self.headers = {'X-NetId': net_id}
        return MockRequest(net_id)


@override_settings(DATABASES=TEST_DB)
class FlowNetworkTest(TestCase, TestDataMixin):
    """Test suite for the core FlowNetwork implementation."""
    
    def setUp(self):
        self.network = FlowNetwork()
    
    def test_node_creation(self):
        self.network.add_node("test_node")
        self.assertIn("test_node", self.network.graph)
        self.assertIn("test_node", self.network.node_to_index)
        self.assertIn(self.network.node_to_index["test_node"], self.network.index_to_node)
        old_index = self.network.node_to_index["test_node"]
        self.network.add_node("test_node")
        self.assertEqual(old_index, self.network.node_to_index["test_node"])
    
    def test_edge_creation(self):
        self.network.add_edge("node1", "node2", 5)
        self.assertIn("node1", self.network.graph)
        self.assertIn("node2", self.network.graph)
        self.assertEqual(self.network.graph["node1"]["node2"], 5)
        self.assertEqual(self.network.graph["node2"]["node1"], 0)
    
    def test_capacity_matrix_creation(self):
        self.network.add_edge("source", "A", 3)
        self.network.add_edge("A", "sink", 2)
        matrix = self.network.build_capacity_matrix()
        n = len(self.network.node_to_index)
        self.assertEqual(matrix.shape, (n, n))
        source_idx = self.network.node_to_index["source"]
        a_idx = self.network.node_to_index["A"]
        sink_idx = self.network.node_to_index["sink"]
        self.assertEqual(matrix[source_idx, a_idx], 3)
        self.assertEqual(matrix[a_idx, sink_idx], 2)
    
    def test_maximum_flow_computation(self):
        # Diamond network:
        #      A
        #   3/   \2
        # s         sink
        #   2\   /3
        #      B
        self.network.add_edge("source", "A", 3)
        self.network.add_edge("source", "B", 2)
        self.network.add_edge("A", "sink", 2)
        self.network.add_edge("B", "sink", 3)
        flow = self.network.compute_maximum_flow()
        total_flow = sum(val for (u, v), val in flow.items() if v == "sink")
        self.assertEqual(total_flow, 4)
        for node in self.network.graph:
            if node in ("source", "sink"):
                continue
            inflow = sum(val for (u, v), val in flow.items() if v == node)
            outflow = sum(val for (u, v), val in flow.items() if u == node)
            self.assertEqual(inflow, outflow)
    
    def test_add_course_node(self):
        self.network.add_course_node(101)
        self.assertIn(101, self.network.course_nodes)
        primary, secondary = self.network.course_nodes[101]
        self.assertEqual(self.network.graph[self.network.source][primary], 1)
        self.assertEqual(self.network.graph[self.network.source][secondary], self.network.INF)
    
    def test_add_requirement_node(self):
        dummy_req = {
            "id": 10, "name": "Dummy Req", "table": "Requirement",
            "min_needed": 1, "max_counted": 1, "double_counting_allowed": False,
            "completed_by_semester": 8, "dept_list": [], "dist_req": [],
            "course_list": [], "excluded_course_list": []
        }
        user_overrides = {"req_marked_satisfied": set()}
        self.network.add_requirement_node(dummy_req, user_overrides)
        comp_key = f"{dummy_req['table']}_{dummy_req['id']}"
        self.assertIn(comp_key, self.network.requirement_nodes)
        req_node = self.network.requirement_nodes[comp_key]
        self.assertIn(req_node, self.network.graph)
        self.assertEqual(self.network.req_min_needed[req_node], dummy_req["min_needed"])
    
    def test_connect_course_to_requirement(self):
        # Test non-double-counting: only primary edge with capacity 1.
        self.network.add_course_node(202)
        dummy_req = {
            "id": 20, "name": "Non-double", "table": "Requirement",
            "min_needed": 1, "max_counted": 1, "double_counting_allowed": False,
            "completed_by_semester": 8, "dept_list": [], "dist_req": [],
            "course_list": [], "excluded_course_list": []
        }
        user_overrides = {"req_marked_satisfied": set()}
        self.network.add_requirement_node(dummy_req, user_overrides)
        self.network.connect_course_to_requirement(202, dummy_req)
        primary, secondary = self.network.course_nodes[202]
        req_node = self.network.requirement_nodes[f"{dummy_req['table']}_{dummy_req['id']}"]
        self.assertEqual(self.network.graph[primary][req_node], 1)
        self.assertNotIn(req_node, self.network.graph[secondary])
        
        # Test double-counting allowed: both primary and secondary edges with INF capacity.
        self.network.add_course_node(303)
        dummy_req2 = {
            "id": 30, "name": "Double-count", "table": "Requirement",
            "min_needed": 1, "max_counted": 2, "double_counting_allowed": True,
            "completed_by_semester": 8, "dept_list": [], "dist_req": [],
            "course_list": [], "excluded_course_list": []
        }
        self.network.add_requirement_node(dummy_req2, user_overrides)
        self.network.connect_course_to_requirement(303, dummy_req2)
        primary, secondary = self.network.course_nodes[303]
        req_node2 = self.network.requirement_nodes[f"{dummy_req2['table']}_{dummy_req2['id']}"]
        self.assertEqual(self.network.graph[primary][req_node2], self.network.INF)
        self.assertEqual(self.network.graph[secondary][req_node2], self.network.INF)
    
    def test_is_eligible_for(self):
        course = {
            "id": 1, "dept_code": "COS", "semester_idx": 2,
            "distribution_area_short": "QR or something"
        }
        req = {
            "id": 1, "excluded_course_list": [2], "completed_by_semester": 8,
            "course_list": [1], "dept_list": ["COS"], "dist_req": ["QR"]
        }
        # Direct course match
        self.assertTrue(is_eligible_for(course, req))
        req["course_list"] = []
        # Dept match
        self.assertTrue(is_eligible_for(course, req))
        # Distribution requirement: match found in split string
        course["distribution_area_short"] = "notQR or QR"
        self.assertTrue(is_eligible_for(course, req))
        # Semester too high: ineligible
        course["semester_idx"] = 9
        self.assertFalse(is_eligible_for(course, req))
        # Excluded course: always ineligible
        course["semester_idx"] = 2
        req["excluded_course_list"] = [1]
        self.assertFalse(is_eligible_for(course, req))
    
    def test_was_manually_settled_and_is_marked_satisfied(self):
        uo = {
            "forced_assignments": {(1, 100)},
            "req_marked_satisfied": {200}
        }
        self.assertTrue(was_manually_settled(1, 100, uo))
        self.assertFalse(was_manually_settled(2, 100, uo))
        self.assertTrue(is_marked_satisfied(200, uo))
        self.assertFalse(is_marked_satisfied(201, uo))
    
    def test_flatten_req_tree(self):
        # Create a parent and child requirement.
        parent = self.create_requirement(name="Parent")
        child = self.create_requirement(name="Child", parent=parent)
        parent.req_list.add(child)  # Assuming req_list is the related manager for children.
        flat = flatten_req_tree(parent)
        self.assertGreaterEqual(len(flat), 2)
        parent_node = next((n for n in flat if n["id"] == parent.id), None)
        child_node = next((n for n in flat if n["id"] == child.id), None)
        self.assertIsNotNone(parent_node)
        self.assertIsNotNone(child_node)
        self.assertIn(child.id, parent_node.get("subreq_ids", []))
        

@override_settings(DATABASES=TEST_DB)
class FlowNetworkIntegrationTest(TestCase, TestDataMixin):
    """Integration tests for building and solving the flow network."""
    
    def setUp(self):
        self.dept = self.create_department()
        self.course = self.create_course(self.dept, "101")
        self.requirement = self.create_requirement(name="Core Requirement", min_needed=1, max_counted=1)
        # Ensure course qualifies by linking it to the requirement's course list.
        self.requirement.course_list.add(self.course.id)
        self.user = self.create_user()
        self.create_user_course(self.user, self.course, semester=2)
        self.uo = {"forced_assignments": set(), "req_marked_satisfied": set()}
    
    def test_full_flow_network(self):
        # Flatten the requirement (take the top node)
        req_nodes = [flatten_req_tree(self.requirement)[0]]
        fnet = build_flow_network(self.user, req_nodes, self.uo)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        self.assertIn(self.requirement.id, results)
        self.assertTrue(results[self.requirement.id]["satisfied"])
        self.assertIn(self.course.id, results[self.requirement.id]["courses"])
    
    def test_transform_data_for_frontend(self):
        # Create a dummy requirement node and flow result.
        req_node = {
            "id": 500,
            "name": "Test Req",
            "table": "Requirement",
            "code": None,
            "subreq_ids": []
        }
        flow_results = {
            500: {"req_id": 500, "satisfied": True, "count": 1, "min_needed": 1, "courses": [123]}
        }
        transformed = transform_data_for_frontend(self.create_mock_request(), [req_node], flow_results)
        self.assertIsInstance(transformed, dict)

@override_settings(DATABASES=TEST_DB)
class RequirementEligibilityTest(TestCase, TestDataMixin):
    """Test suite for requirement eligibility checking."""
    
    def setUp(self):
        self.dept = self.create_department()
        self.course = self.create_course(self.dept, "126")
        self.requirement = self.create_requirement()
        self.user = self.create_user()
        self.user_course = self.create_user_course(self.user, self.course)
    
    def test_course_list_eligibility(self):
        """Eligibility based on explicit course list."""
        self.requirement.course_list.add(self.course)
        course_dict = {
            "id": self.course.id,
            "dept_code": self.dept.code,
            "distribution_area_short": self.course.distribution_area_short,
            "semester_idx": 2
        }
        req_dict = {
            "course_list": [self.course.id],
            "excluded_course_list": [],
            "dept_list": [],
            "dist_req": [],
            "completed_by_semester": 8
        }
        self.assertTrue(is_eligible_for(course_dict, req_dict))
    
    def test_department_list_eligibility(self):
        """Eligibility based on department list."""
        req_dict = {
            "course_list": [],
            "excluded_course_list": [],
            "dept_list": ["COS"],
            "dist_req": [],
            "completed_by_semester": 8
        }
        course_dict = {
            "id": self.course.id,
            "dept_code": "COS",
            "distribution_area_short": "QR",
            "semester_idx": 2
        }
        self.assertTrue(is_eligible_for(course_dict, req_dict))
    
    def test_distribution_area_eligibility(self):
        """Eligibility based on distribution area."""
        req_dict = {
            "course_list": [],
            "excluded_course_list": [],
            "dept_list": [],
            "dist_req": ["QR"],
            "completed_by_semester": 8
        }
        course_dict = {
            "id": self.course.id,
            "dept_code": "COS",
            "distribution_area_short": "QR",
            "semester_idx": 2
        }
        self.assertTrue(is_eligible_for(course_dict, req_dict))
    
    def test_semester_constraint(self):
        """Eligibility based on semester limits."""
        req_dict = {
            "course_list": [self.course.id],
            "excluded_course_list": [],
            "dept_list": [],
            "dist_req": [],
            "completed_by_semester": 4
        }
        # Course in semester 5 should be ineligible.
        course_dict = {
            "id": self.course.id,
            "dept_code": "COS",
            "distribution_area_short": "QR",
            "semester_idx": 5
        }
        self.assertFalse(is_eligible_for(course_dict, req_dict))
        # Course in semester 3 should be eligible.
        course_dict["semester_idx"] = 3
        self.assertTrue(is_eligible_for(course_dict, req_dict))
    
    def test_excluded_courses(self):
        """Excluded courses should be marked ineligible even if other criteria match."""
        req_dict = {
            "course_list": [],
            "excluded_course_list": [self.course.id],
            "dept_list": ["COS"],
            "dist_req": [],
            "completed_by_semester": 8
        }
        course_dict = {
            "id": self.course.id,
            "dept_code": "COS",
            "distribution_area_short": "QR",
            "semester_idx": 2
        }
        self.assertFalse(is_eligible_for(course_dict, req_dict))
    
    def test_multiple_criteria(self):
        """
        Eligibility when multiple criteria are present:
          - Courses from department COS,
          - Courses with distribution area QR,
          - Or specific courses.
        """
        other_dept = self.create_department("MAT", "Mathematics")
        other_course = self.create_course(other_dept, "201", "QR")
        req_dict = {
            "course_list": [other_course.id],
            "excluded_course_list": [],
            "dept_list": ["COS"],
            "dist_req": ["QR"],
            "completed_by_semester": 8
        }
        # COS course should qualify by department.
        cos_course = {
            "id": self.course.id,
            "dept_code": "COS",
            "distribution_area_short": "",
            "semester_idx": 2
        }
        self.assertTrue(is_eligible_for(cos_course, req_dict))
        # QR course should qualify by distribution area.
        qr_course = {
            "id": 999,
            "dept_code": "PHY",
            "distribution_area_short": "QR",
            "semester_idx": 2
        }
        self.assertTrue(is_eligible_for(qr_course, req_dict))
        # Specific course in the course list.
        specific_course = {
            "id": other_course.id,
            "dept_code": "MAT",
            "distribution_area_short": "",
            "semester_idx": 2
        }
        self.assertTrue(is_eligible_for(specific_course, req_dict))
    
    def test_no_criteria_match(self):
        """Test that a course failing to meet any criterion is ineligible."""
        req_dict = {
            "course_list": [],
            "excluded_course_list": [],
            "dept_list": [],
            "dist_req": [],
            "completed_by_semester": 8
        }
        course_dict = {
            "id": self.course.id,
            "dept_code": "BIO",  # Does not match any expected department.
            "distribution_area_short": "Non-QR",
            "semester_idx": 2
        }
        self.assertFalse(is_eligible_for(course_dict, req_dict))

@override_settings(DATABASES=TEST_DB)
class RequirementTreeTest(TestCase, TestDataMixin):
    """Test suite for requirement tree flattening and hierarchy."""
    
    def setUp(self):
        self.dept = self.create_department()
        self.course = self.create_course(self.dept, "126")
        
        # Create a hierarchical requirement structure.
        self.parent_req = self.create_requirement(
            name="Parent Requirement",
            min_needed=2
        )
        self.child_req1 = self.create_requirement(
            name="Child Requirement 1",
            min_needed=1
        )
        self.child_req2 = self.create_requirement(
            name="Child Requirement 2",
            min_needed=1
        )
        
        # Link requirements: add children to parent's req_list.
        self.parent_req.req_list.add(self.child_req1, self.child_req2)
        
        # Add a course to one of the child requirements.
        self.child_req1.course_list.add(self.course)
    
    def test_requirement_flattening(self):
        """Test that requirement hierarchies are properly flattened."""
        nodes = flatten_req_tree(self.parent_req)
        
        # Expect three nodes: the parent and its two children.
        self.assertEqual(len(nodes), 3)
        
        # The first node should be the parent with two subreq_ids.
        parent_node = nodes[0]
        self.assertEqual(parent_node["id"], self.parent_req.id)
        self.assertEqual(len(parent_node["subreq_ids"]), 2)
        
        # Verify that the child nodes are present.
        child_nodes = nodes[1:]
        child_ids = {node["id"] for node in child_nodes}
        expected_ids = {self.child_req1.id, self.child_req2.id}
        self.assertEqual(child_ids, expected_ids)
        
        # Check that the course added to child_req1 is captured.
        child1_node = next(n for n in nodes if n["id"] == self.child_req1.id)
        self.assertIn(self.course.id, child1_node["course_list"])
    
    def test_requirement_attributes(self):
        """Test that all requirement attributes are properly captured."""
        nodes = flatten_req_tree(self.parent_req)
        parent_node = nodes[0]
        
        expected_fields = {
            "id", "name", "subreq_ids", "table", "min_needed", "max_counted",
            "double_counting_allowed", "completed_by_semester", "dept_list",
            "dist_req", "course_list", "excluded_course_list", "explanation"
        }
        self.assertEqual(set(parent_node.keys()), expected_fields)
        
        # Validate specific attribute values.
        self.assertEqual(parent_node["min_needed"], 2)
        self.assertEqual(parent_node["table"], "Requirement")
        self.assertIsInstance(parent_node["double_counting_allowed"], bool)
        self.assertIsInstance(parent_node["dept_list"], list)
        self.assertIsInstance(parent_node["dist_req"], list)
    
    def test_major_flattening(self):
        """Test flattening of a major with requirements."""
        major = self.create_major(requirements=[self.parent_req])
        nodes = flatten_req_tree(major)
        
        # Expect four nodes: the major node, parent req, and two child reqs.
        self.assertEqual(len(nodes), 4)
        
        # The first node should represent the major.
        major_node = nodes[0]
        self.assertEqual(major_node["table"], "Major")
        self.assertEqual(major_node["code"], "COS")
        
        # The major node should link to its requirement (the parent).
        self.assertIn(self.parent_req.id, major_node["subreq_ids"])
        
        # Confirm that all requirement nodes are present.
        req_ids = {node["id"] for node in nodes[1:]}
        expected_ids = {self.parent_req.id, self.child_req1.id, self.child_req2.id}
        self.assertEqual(req_ids, expected_ids)
    
    def test_requirement_linking(self):
        """Test that requirement relationships are properly maintained."""
        nodes = flatten_req_tree(self.parent_req)
        node_map = {node["id"]: node for node in nodes}
        
        # Parent should list both children in its subreq_ids.
        parent_node = node_map[self.parent_req.id]
        self.assertIn(self.child_req1.id, parent_node["subreq_ids"])
        self.assertIn(self.child_req2.id, parent_node["subreq_ids"])
        
        # Child requirements should have no subrequirements.
        child1_node = node_map[self.child_req1.id]
        child2_node = node_map[self.child_req2.id]
        self.assertEqual(len(child1_node["subreq_ids"]), 0)
        self.assertEqual(len(child2_node["subreq_ids"]), 0)

# !! 1 failure
@override_settings(DATABASES=TEST_DB)
class FlowNetworkConstructionTest(TestCase, TestDataMixin):
    """Test suite for building and solving flow networks from requirements."""

    def setUp(self):
        # Create departments.
        self.cos_dept = self.create_department("COS", "Computer Science")
        self.mat_dept = self.create_department("MAT", "Mathematics")
        
        # Create courses.
        self.cos126 = self.create_course(self.cos_dept, "126", "QR")
        self.cos226 = self.create_course(self.cos_dept, "226", "QR")
        self.mat201 = self.create_course(self.mat_dept, "201", "QR")
        
        # Create user.
        self.user = self.create_user()
        
        # Add courses to user.
        self.uc126 = self.create_user_course(self.user, self.cos126, semester=1)
        self.uc226 = self.create_user_course(self.user, self.cos226, semester=2)
        self.uc201 = self.create_user_course(self.user, self.mat201, semester=3)
        
        # Create requirements.
        self.prog_req = self.create_requirement(
            name="Programming",
            min_needed=2,
            max_counted=2
        )
        self.prog_req.course_list.add(self.cos126, self.cos226)
        
        self.math_req = self.create_requirement(
            name="Math",
            min_needed=1,
            max_counted=1
        )
        self.math_req.course_list.add(self.mat201)
        
        # Create a major with these requirements.
        self.major = self.create_major(requirements=[self.prog_req, self.math_req])
        
        # Create a mock request object.
        self.request = self.create_mock_request()
    
    def test_network_construction(self):
        """Test basic flow network construction."""
        requirement_nodes = [
            {
                "table": "Major",
                "id": self.major.id,
                "name": self.major.name,
                "min_needed": 2,
                "max_counted": None,
                "subreq_ids": [self.prog_req.id, self.math_req.id],
            },
            {
                "table": "Requirement",
                "id": self.prog_req.id,
                "name": self.prog_req.name,
                "min_needed": 2,
                "max_counted": None,
                "course_list": [self.cos126.id, self.cos226.id],
            },
            {
                "table": "Requirement",
                "id": self.math_req.id,
                "name": self.math_req.name,
                "min_needed": 1,
                "max_counted": None,
                "course_list": [self.mat201.id],
            }
        ]
        
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        
        # Check course nodes.
        self.assertEqual(len(fnet.course_nodes), 3)
        for course_id in [self.cos126.id, self.cos226.id, self.mat201.id]:
            self.assertIn(course_id, fnet.course_nodes)
        
        # Check requirement nodes (using composite keys).
        major_key = f"Major_{self.major.id}"
        prog_key = f"Requirement_{self.prog_req.id}"
        math_key = f"Requirement_{self.math_req.id}"
        self.assertIn(major_key, fnet.requirement_nodes)
        self.assertIn(prog_key, fnet.requirement_nodes)
        self.assertIn(math_key, fnet.requirement_nodes)
        
        # Verify edges.
        prog_node = fnet.requirement_nodes[prog_key]
        for course_id in [self.cos126.id, self.cos226.id]:
            primary, _ = fnet.course_nodes[course_id]
            self.assertIn(prog_node, fnet.graph[primary])
        math_node = fnet.requirement_nodes[math_key]
        primary, _ = fnet.course_nodes[self.mat201.id]
        self.assertIn(math_node, fnet.graph[primary])
    
    def test_flow_solution(self):
        """Test that flow solution correctly assigns courses to requirements."""
        requirement_nodes = flatten_req_tree(self.major)
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        
        # (Optional) Debug prints.
        print("\n=== Test Flow Solution ===")
        print(f"Requirement nodes: {len(requirement_nodes)}")
        for req in requirement_nodes:
            print(f"- {req['table']} {req['id']}: {req['name']} (min={req['min_needed']}, max={req.get('max_counted')})")
        
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        print("\nNetwork structure:")
        print(f"- Course nodes: {len(fnet.course_nodes)}")
        print(f"- Requirement nodes: {len(fnet.requirement_nodes)}")
        print(f"- Total nodes: {len(fnet.node_to_index)}")
        
        flow = run_flow_solver(fnet)
        print("\nFlow results:")
        for (u, v), f in flow.items():
            if f > 0:
                print(f"- {u} -> {v}: {f}")
        
        results = interpret_flow_solution(fnet, flow)
        print("\nInterpreted results:")
        for req_id, result in results.items():
            print(f"- Req {req_id}: satisfied={result['satisfied']}, count={result['count']}, courses={result['courses']}")
        
        prog_result = results[self.prog_req.id]
        self.assertTrue(prog_result["satisfied"], "Programming requirement should be satisfied")
        self.assertEqual(prog_result["count"], 2, "Programming requirement should have 2 courses")
        self.assertEqual(set(prog_result["courses"]), {self.cos126.id, self.cos226.id})
        
        math_result = results[self.math_req.id]
        self.assertTrue(math_result["satisfied"], "Math requirement should be satisfied")
        self.assertEqual(math_result["count"], 1, "Math requirement should have 1 course")
        self.assertEqual(set(math_result["courses"]), {self.mat201.id})
    
    def test_max_common_with_major_constraint(self):
        """Test that max_common_with_major constraint is respected."""
        minor_req = self.create_requirement(
            name="Minor Requirement",
            min_needed=2,
            max_counted=2,
            max_common_with_major=1
        )
        minor_req.course_list.add(self.cos126, self.cos226, self.mat201)
        minor = self.create_minor(requirements=[minor_req])
        
        requirement_nodes = flatten_req_tree(self.major) + flatten_req_tree(minor)
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        
        minor_result = results[minor_req.id]
        self.assertTrue(minor_result["satisfied"])
        self.assertEqual(minor_result["count"], 2)
        major_courses = set()
        for req_id in [self.prog_req.id, self.math_req.id]:
            major_courses.update(results[req_id]["courses"])
        shared_courses = len(set(minor_result["courses"]) & major_courses)
        self.assertLessEqual(shared_courses, 1, "Overlap should not exceed the max_common_with_major constraint")
    
    def test_manual_overrides(self):
        """Test that manual overrides are respected in the flow network."""
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": {self.math_req.id}}
        requirement_nodes = flatten_req_tree(self.major)
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        
        math_result = results[self.math_req.id]
        self.assertTrue(math_result["satisfied"], "Math requirement should be manually satisfied")
        prog_result = results[self.prog_req.id]
        self.assertTrue(prog_result["satisfied"], "Programming requirement should be satisfied")
        
        user_overrides["forced_assignments"].add((self.cos126.id, self.prog_req.id))
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        prog_result = results[self.prog_req.id]
        self.assertIn(self.cos126.id, prog_result["courses"], "COS126 should be forced into the Programming requirement")
    
    def test_semester_constraints(self):
        """Test that semester constraints are respected in the flow network."""
        self.prog_req.completed_by_semester = 2
        self.prog_req.save()
        
        requirement_nodes = flatten_req_tree(self.major)
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        
        prog_result = results[self.prog_req.id]
        self.assertNotIn(self.mat201.id, prog_result["courses"])
        eligible_courses = {self.cos126.id, self.cos226.id}
        self.assertTrue(all(c in eligible_courses for c in prog_result["courses"]))
    
    def test_excluded_courses(self):
        """Test that excluded courses are properly handled in the flow network."""
        self.math_req.excluded_course_list.add(self.cos226)
        
        requirement_nodes = flatten_req_tree(self.major)
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        
        math_result = results[self.math_req.id]
        self.assertNotIn(self.cos226.id, math_result["courses"], "COS226 should be excluded from Math requirement")
        self.assertTrue(math_result["satisfied"], "Math requirement should still be satisfied by MAT201")
        self.assertIn(self.mat201.id, math_result["courses"])
    
    def test_double_counting(self):
        """Test double counting behavior between requirements."""
        double_req = self.create_requirement(
            name="Double Counting Requirement",
            min_needed=1,
            max_counted=1,
            double_counting_allowed=True
        )
        double_req.course_list.add(self.cos126)
        self.major.req_list.add(double_req)
        
        requirement_nodes = flatten_req_tree(self.major)
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        
        prog_result = results[self.prog_req.id]
        double_result = results[double_req.id]
        self.assertIn(self.cos126.id, prog_result["courses"], "COS126 should be in Programming requirement")
        self.assertIn(self.cos126.id, double_result["courses"], "COS126 should be in double-counting requirement")
        self.assertTrue(prog_result["satisfied"])
        self.assertTrue(double_result["satisfied"])
    
    # Additional tests.
    def test_empty_network(self):
        """Test behavior when no requirements are provided."""
        requirement_nodes = []
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        self.assertEqual(len(fnet.course_nodes), 0)
        self.assertEqual(len(fnet.requirement_nodes), 0)
        flow = run_flow_solver(fnet)
        self.assertEqual(len(flow), 0)
    
    def test_invalid_course(self):
        """Test handling when a course does not match any requirement."""
        extra_course = self.create_course(self.cos_dept, "999", "XYZ")
        self.create_user_course(self.user, extra_course, semester=1)
        requirement_nodes = flatten_req_tree(self.major)
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        for res in results.values():
            self.assertNotIn(extra_course.id, res["courses"])
    
    def test_multiple_forced_assignments(self):
        """Test forced assignments for multiple courses to the same requirement."""
        user_overrides = {"forced_assignments": {(self.cos126.id, self.prog_req.id), (self.cos226.id, self.prog_req.id)},
                          "req_marked_satisfied": set()}
        requirement_nodes = flatten_req_tree(self.major)
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        prog_result = results[self.prog_req.id]
        self.assertEqual(set(prog_result["courses"]), {self.cos126.id, self.cos226.id})
    
    def test_circular_requirement_reference(self):
        """Test behavior when requirements reference each other to avoid infinite loops."""
        req_a = self.create_requirement(name="Req A", min_needed=1)
        req_b = self.create_requirement(name="Req B", min_needed=1)
        req_a.req_list.add(req_b)
        req_b.req_list.add(req_a)
        major = self.create_major(requirements=[req_a])
        requirement_nodes = flatten_req_tree(major)
        self.assertGreater(len(requirement_nodes), 0)

# !! 4 failures, 3 errors
@override_settings(DATABASES=TEST_DB)
class DataTransformationTest(TestCase, TestDataMixin):
    """Test suite for transforming flow results into frontend-compatible format."""
    
    def setUp(self):
        # Create departments.
        self.cos_dept = self.create_department("COS", "Computer Science")
        self.mat_dept = self.create_department("MAT", "Mathematics")
        
        # Create courses.
        self.cos126 = self.create_course(self.cos_dept, "126", "QR")
        self.cos226 = self.create_course(self.cos_dept, "226", "QR")
        self.mat201 = self.create_course(self.mat_dept, "201", "QR")
        
        # Create user.
        self.user = self.create_user()
        
        # Add courses to user.
        self.uc126 = self.create_user_course(self.user, self.cos126, semester=1)
        self.uc226 = self.create_user_course(self.user, self.cos226, semester=2)
        self.uc201 = self.create_user_course(self.user, self.mat201, semester=3)
        
        # Create degree.
        self.degree = Degree.objects.create(
            code="BSE",
            name="Bachelor of Science in Engineering"
        )
        
        # Create requirements.
        self.prog_req = self.create_requirement(name="Programming", min_needed=2, max_counted=2)
        self.prog_req.course_list.add(self.cos126, self.cos226)
        
        self.math_req = self.create_requirement(name="Math", min_needed=1, max_counted=1)
        self.math_req.course_list.add(self.mat201)
        
        # Create major with requirements.
        self.major = self.create_major(requirements=[self.prog_req, self.math_req])
        self.major.degree.add(self.degree)
        
        # Create minor.
        self.minor_req = self.create_requirement(name="Minor Requirement", min_needed=1, max_counted=1)
        self.minor_req.course_list.add(self.cos126)
        self.minor = self.create_minor(requirements=[self.minor_req])
        
        # Create a mock request.
        self.request = self.create_mock_request()
    
    def test_basic_structure(self):
        """Test that the basic structure of transformed data matches frontend expectations."""
        requirement_nodes = fetch_flattened_requirements({
            "major": {"code": self.major.code},
            "minors": [{"code": self.minor.code}],
            "certificates": []
        })
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        final_data = transform_data_for_frontend(self.request, requirement_nodes, results)
        
        self.assertIn(self.major.code, final_data)
        self.assertIn("Minors", final_data)
        self.assertIn(self.minor.code, final_data["Minors"])
        
        major_data = final_data[self.major.code]
        self.assertIn("Programming", major_data)
        self.assertIn("Math", major_data)
        
        prog_data = major_data["Programming"]
        self.assertIn("satisfied", prog_data)
        self.assertIn("count", prog_data)
        self.assertIn("min_needed", prog_data)
        self.assertIn("req_id", prog_data)
    
    def test_course_data_format(self):
        """Test that course data is properly formatted in the output."""
        requirement_nodes = fetch_flattened_requirements({
            "major": {"code": self.major.code},
            "minors": [],
            "certificates": []
        })
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        final_data = transform_data_for_frontend(self.request, requirement_nodes, results)
        
        prog_data = final_data[self.major.code]["Programming"]
        self.assertIn("settled", prog_data)
        self.assertIn("unsettled", prog_data)
        settled_courses, req_id = prog_data["settled"]
        for course in settled_courses:
            self.assertIn("code", course)
            self.assertIn("id", course)
            self.assertIn("crosslistings", course)
            self.assertIn("manually_settled", course)
    
    def test_manually_satisfied_requirements(self):
        """Test that manually satisfied requirements are properly indicated."""
        self.user.requirements.add(self.math_req)
        requirement_nodes = fetch_flattened_requirements({
            "major": {"code": self.major.code},
            "minors": [],
            "certificates": []
        })
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": {self.math_req.id}}
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        final_data = transform_data_for_frontend(self.request, requirement_nodes, results)
        math_data = final_data[self.major.code]["Math"]
        self.assertTrue(math_data["manually_satisfied"])
        self.assertEqual(math_data["count"], "0")
        self.assertTrue(math_data["satisfied"])
    
    def test_requirement_hierarchy(self):
        """Test that requirement hierarchy is properly maintained in transformed data."""
        parent_req = self.create_requirement(name="Parent Requirement", min_needed=2)
        child_req1 = self.create_requirement(name="Child Requirement 1", min_needed=1)
        child_req2 = self.create_requirement(name="Child Requirement 2", min_needed=1)
        parent_req.req_list.add(child_req1, child_req2)
        child_req1.course_list.add(self.cos126)
        child_req2.course_list.add(self.cos226)
        self.major.req_list.add(parent_req)
        
        requirement_nodes = fetch_flattened_requirements({
            "major": {"code": self.major.code},
            "minors": [],
            "certificates": []
        })
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        final_data = transform_data_for_frontend(self.request, requirement_nodes, results)
        major_data = final_data[self.major.code]
        self.assertIn("Parent Requirement", major_data)
        parent_data = major_data["Parent Requirement"]
        self.assertIn("Child Requirement 1", parent_data)
        self.assertIn("Child Requirement 2", parent_data)
        child1_data = parent_data["Child Requirement 1"]
        child2_data = parent_data["Child Requirement 2"]
        self.assertIn("settled", child1_data)
        self.assertIn("settled", child2_data)
    
    def test_degree_requirements(self):
        """Test that degree requirements are properly included and structured."""
        degree_req = self.create_requirement(name="Degree Requirement", min_needed=1)
        degree_req.course_list.add(self.mat201)
        self.degree.req_list.add(degree_req)
        
        requirement_nodes = fetch_flattened_requirements({
            "major": {"code": self.major.code},
            "minors": [],
            "certificates": []
        })
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        final_data = transform_data_for_frontend(self.request, requirement_nodes, results)
        self.assertIn(self.degree.code, final_data)
        degree_data = final_data[self.degree.code]
        self.assertIn("Degree Requirement", degree_data)
        req_data = degree_data["Degree Requirement"]
        self.assertIn("satisfied", req_data)
        self.assertIn("count", req_data)
        self.assertIn("min_needed", req_data)
    
    def test_string_conversion(self):
        """Test that numeric values are properly converted to strings in the output."""
        requirement_nodes = fetch_flattened_requirements({
            "major": {"code": self.major.code},
            "minors": [],
            "certificates": []
        })
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        final_data = transform_data_for_frontend(self.request, requirement_nodes, results)
        prog_data = final_data[self.major.code]["Programming"]
        self.assertIsInstance(prog_data["satisfied"], str)
        self.assertIsInstance(prog_data["count"], str)
        self.assertIsInstance(prog_data["min_needed"], str)
    
    def test_empty_requirements(self):
        """Test handling of requirements with no eligible courses."""
        empty_req = self.create_requirement(name="Empty Requirement", min_needed=1)
        self.major.req_list.add(empty_req)
        
        requirement_nodes = fetch_flattened_requirements({
            "major": {"code": self.major.code},
            "minors": [],
            "certificates": []
        })
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        empty_data = results[empty_req.id]
        self.assertEqual(empty_data["count"], 0)
        self.assertFalse(empty_data["satisfied"])
        self.assertEqual(empty_data["courses"], [])
        self.assertEqual(empty_data.get("settled_courses", []), [])
    
    def test_transformation_with_certificates(self):
        """Test transformation output when certificate requirements are included."""
        certificate_req = self.create_requirement(name="Certificate Requirement", min_needed=1)
        certificate_req.course_list.add(self.cos126)
        certificate = Certificate.objects.create(code="CERT", name="Test Certificate")
        
        requirement_nodes = fetch_flattened_requirements({
            "major": {"code": self.major.code},
            "minors": [],
            "certificates": [{"code": certificate.code}]
        })
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        final_data = transform_data_for_frontend(self.request, requirement_nodes, results)
        self.assertIn("Certificates", final_data)
        self.assertIn(certificate.code, final_data["Certificates"])
    
    def test_empty_transformation(self):
        """Test that transformation returns an empty dict when no requirements are provided."""
        final_data = transform_data_for_frontend(self.request, [], {})
        self.assertEqual(final_data, {})

# !! 2 failures
@override_settings(DATABASES=TEST_DB)
class ComplexRequirementTreeTest(TestCase, TestDataMixin):
    """Test suite for complex requirement trees with nested requirements and double counting."""
    
    def setUp(self):
        # Create departments.
        self.cos_dept = self.create_department("COS", "Computer Science")
        self.fra_dept = self.create_department("FRE", "French")
        self.eng_dept = self.create_department("ENG", "English")
        self.com_dept = self.create_department("COM", "Comparative Literature")
        
        # Create language courses.
        self.fra101 = self.create_course(self.fra_dept, "101", dist_area="LA")
        self.fra102 = self.create_course(self.fra_dept, "102", dist_area="LA")
        self.fra107 = self.create_course(self.fra_dept, "107", dist_area="LA")
        self.fra207 = self.create_course(self.fra_dept, "207", dist_area="LA")
        self.fra301 = self.create_course(self.fra_dept, "301", dist_area="LA")
        
        # Create COM courses.
        self.com205 = self.create_course(self.com_dept, "205")
        self.com206 = self.create_course(self.com_dept, "206")
        self.com300 = self.create_course(self.com_dept, "300")
        self.com301 = self.create_course(self.com_dept, "301")
        
        # Create literature courses.
        self.eng201 = self.create_course(self.eng_dept, "201", dist_area="LA")
        self.eng202 = self.create_course(self.eng_dept, "202", dist_area="LA")
        
        # Create user.
        self.user = self.create_user()
        
        # Add courses to user.
        self.uc_fra101 = self.create_user_course(self.user, self.fra101, semester=1)
        self.uc_fra102 = self.create_user_course(self.user, self.fra102, semester=2)
        self.uc_fra107 = self.create_user_course(self.user, self.fra107, semester=3)
        self.uc_com205 = self.create_user_course(self.user, self.com205, semester=3)
        self.uc_com206 = self.create_user_course(self.user, self.com206, semester=4)
        self.uc_fra301 = self.create_user_course(self.user, self.fra301, semester=5)
        self.uc_com300 = self.create_user_course(self.user, self.com300, semester=5)
        
        # Create complex requirement structure.
        self.setup_com_requirements()
    
    def setup_com_requirements(self):
        """Create a complex requirement structure similar to COM major."""
        self.ab_degree = self.create_degree("AB", "Bachelor of Arts")
        
        self.foreign_lang_req = self.create_requirement(
            name="Foreign Language",
            min_needed=1,
            max_counted=1,
            double_counting_allowed=True,
            completed_by_semester=4
        )
        self.lang_seq_req = self.create_requirement(
            name="Three Terms of Language",
            min_needed=3,
            max_counted=3,
            double_counting_allowed=True,
            parent=self.foreign_lang_req
        )
        self.lang_seq_req.course_list.add(self.fra101, self.fra102, self.fra107)
        
        self.upper_lang_req = self.create_requirement(
            name="Upper-level Literature Course",
            min_needed=1,
            max_counted=1,
            double_counting_allowed=True,
            parent=self.foreign_lang_req
        )
        self.upper_lang_req.course_list.add(self.fra301)
        
        self.foreign_lang_req.req_list.add(self.lang_seq_req, self.upper_lang_req)
        
        self.intro_req = self.create_requirement(
            name="Introductory Courses",
            min_needed=1,
            max_counted=1,
            double_counting_allowed=True,
            completed_by_semester=4
        )
        self.com_seq_req = self.create_requirement(
            name="COM 205-206",
            min_needed=2,
            max_counted=2,
            parent=self.intro_req
        )
        self.com_seq_req.course_list.add(self.com205, self.com206)
        
        self.dept_req = self.create_requirement(
            name="Departmental Courses",
            min_needed=5,
            max_counted=5,
            double_counting_allowed=True
        )
        self.com_courses_req = self.create_requirement(
            name="Comparative Literature",
            min_needed=2,
            max_counted=2,
            parent=self.dept_req
        )
        self.com_courses_req.course_list.add(self.com205, self.com206, self.com301)
        self.com_courses_req.excluded_course_list.add(self.com300)
        self.junior_sem_req = self.create_requirement(
            name="Junior Seminar",
            min_needed=1,
            max_counted=1,
            parent=self.dept_req
        )
        self.junior_sem_req.course_list.add(self.com300)
        
        self.major = self.create_major(
            code="COM",
            name="Comparative Literature",
            degree=self.ab_degree,
            requirements=[self.foreign_lang_req, self.intro_req, self.dept_req]
        )
    
    def test_prerequisite_satisfaction(self):
        """Test that prerequisites can be satisfied in multiple ways."""
        requirement_nodes = flatten_req_tree(self.major)
        
        print("\n=== Language Requirement Setup ===")
        for node in requirement_nodes:
            print(f"Node: {node['table']} {node['id']} - {node['name']}")
            print(f"  min_needed: {node['min_needed']}")
            print(f"  max_counted: {node['max_counted']}")
            print(f"  double_counting: {node['double_counting_allowed']}")
            print(f"  subreq_ids: {node['subreq_ids']}")
            if node['table'] == 'Requirement':
                print(f"  course_list: {node['course_list']}")
        
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        
        print("\n=== Flow Network Structure ===")
        print(f"Total nodes: {len(fnet.node_to_index)}")
        for composite_key, req_node in fnet.requirement_nodes.items():
            print(f"  {composite_key} -> {req_node}")
        for course_id, (major_node, other_node) in fnet.course_nodes.items():
            print(f"  Course {course_id}: Major node={major_node}, Other node={other_node}")
        for from_node, edges in fnet.graph.items():
            for to_node, capacity in edges.items():
                if capacity > 0:
                    print(f"  {from_node} -> {to_node}: capacity={capacity}")
        
        flow = run_flow_solver(fnet)
        for (u, v), f in flow.items():
            if f > 0:
                print(f"  {u} -> {v}: flow={f}")
        results = interpret_flow_solution(fnet, flow)
        for req_id, result in results.items():
            print(f"Requirement {req_id}: satisfied={result['satisfied']}, count={result['count']}, courses={result['courses']}")
        
        lang_result = results[self.foreign_lang_req.id]
        self.assertTrue(lang_result["satisfied"])
        seq_result = results[self.lang_seq_req.id]
        upper_result = results[self.upper_lang_req.id]
        self.assertTrue(seq_result["satisfied"] or upper_result["satisfied"],
                        "Foreign language should be satisfied by either sequence or upper-level course")
        if seq_result["satisfied"]:
            self.assertEqual(len(seq_result["courses"]), 3)
            self.assertIn(self.fra101.id, seq_result["courses"])
            self.assertIn(self.fra102.id, seq_result["courses"])
            self.assertIn(self.fra107.id, seq_result["courses"])
        else:
            self.assertEqual(len(upper_result["courses"]), 1)
            self.assertIn(self.fra301.id, upper_result["courses"])
    
    def test_nested_double_counting(self):
        """Test nested requirements with double counting enabled."""
        parent_dc = self.create_requirement(name="Parent DC", min_needed=2, double_counting_allowed=True)
        child_dc = self.create_requirement(name="Child DC", min_needed=1, double_counting_allowed=True)
        parent_dc.req_list.add(child_dc)
        child_dc.course_list.add(self.fra101)
        self.major.req_list.add(parent_dc)
        requirement_nodes = flatten_req_tree(self.major)
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        parent_result = results[parent_dc.id]
        child_result = results[child_dc.id]
        self.assertIn(self.fra101.id, child_result["courses"])
        self.assertTrue(parent_result["satisfied"])
    
    def test_no_satisfaction_due_to_semester(self):
        """Test that a requirement is unsatisfied if courses are taken too late."""
        early_req = self.create_requirement(name="Early Req", min_needed=1, completed_by_semester=2)
        early_req.course_list.add(self.fra107)  # Taken in semester 3.
        self.major.req_list.add(early_req)
        requirement_nodes = flatten_req_tree(self.major)
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        early_result = results[early_req.id]
        self.assertFalse(early_result["satisfied"])
    
    def test_multiple_paths_satisfaction(self):
        """Test that multiple subpaths in a prerequisite are handled correctly."""
        req_a = self.create_requirement(name="Req A", min_needed=1)
        req_b = self.create_requirement(name="Req B", min_needed=1)
        self.foreign_lang_req.req_list.add(req_a, req_b)
        req_a.course_list.add(self.fra101)
        req_b.course_list.add(self.fra102)
        requirement_nodes = flatten_req_tree(self.major)
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        a_result = results[req_a.id]
        b_result = results[req_b.id]
        self.assertTrue(a_result["satisfied"] or b_result["satisfied"])

# !! 2 feailures, 1 error
@override_settings(DATABASES=TEST_DB)
class EdgeCaseTest(TestCase, TestDataMixin):
    """Test suite for edge and corner cases."""
    
    def setUp(self):
        """Set up test data for edge cases."""
        self.dept = self.create_department()
        self.course = self.create_course(self.dept, "101")
        self.user = self.create_user()
        self.user_course = self.create_user_course(self.user, self.course)
    
    def test_zero_min_needed(self):
        """Test requirements with min_needed=0."""
        req = self.create_requirement(min_needed=0)
        req.course_list.add(self.course)
        requirement_nodes = flatten_req_tree(req)
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        # Should be satisfied even if no courses are "needed"
        self.assertTrue(results[req.id]["satisfied"])
    
    def test_infinite_max_counted(self):
        """Test requirements with no effective max_counted limit."""
        req = self.create_requirement(max_counted=99999, min_needed=10)
        # Add 10 distinct courses.
        for i in range(10):
            course = self.create_course(self.dept, f"{i+102}")
            req.course_list.add(course)
            self.create_user_course(self.user, course)
        requirement_nodes = flatten_req_tree(req)
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        # All 10 courses should count.
        self.assertEqual(len(results[req.id]["courses"]), 10)
    
    def test_circular_parent_references(self):
        """Test handling of circular parent references."""
        req1 = self.create_requirement(name="Req1")
        req2 = self.create_requirement(name="Req2", parent=req1)
        req3 = self.create_requirement(name="Req3", parent=req2)
        # Introduce circular reference: req1's parent is req3.
        req1.parent = req3
        req1.save()
        with self.assertRaises(Exception):
            flatten_req_tree(req1)
    
    def test_all_courses_excluded(self):
        """Test requirements where all courses are excluded."""
        req = self.create_requirement()
        req.course_list.add(self.course)
        req.excluded_course_list.add(self.course)
        requirement_nodes = flatten_req_tree(req)
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        self.assertFalse(results[req.id]["satisfied"])
        self.assertEqual(len(results[req.id]["courses"]), 0)
    
    def test_empty_requirement(self):
        """Test a requirement with an empty course_list and positive min_needed."""
        req = self.create_requirement(min_needed=1)
        # Do not add any courses.
        requirement_nodes = flatten_req_tree(req)
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        self.assertFalse(results[req.id]["satisfied"])
    
    def test_user_without_courses(self):
        """Test behavior when a user has no courses at all."""
        # Create a new user with no courses.
        new_user = self.create_user(net_id="emptyuser")
        req = self.create_requirement(min_needed=1)
        req.course_list.add(self.course)
        requirement_nodes = flatten_req_tree(req)
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        fnet = build_flow_network(new_user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        self.assertFalse(results[req.id]["satisfied"])
        self.assertEqual(len(results[req.id]["courses"]), 0)
    
    def test_none_max_counted(self):
        """Test that a None value for max_counted is handled as infinite (99999)."""
        req = self.create_requirement(max_counted=None, min_needed=1)
        req.course_list.add(self.course)
        requirement_nodes = flatten_req_tree(req)
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        # max_counted should have been interpreted as 99999 so the course is counted.
        self.assertTrue(results[req.id]["satisfied"])
        self.assertEqual(len(results[req.id]["courses"]), 1)
    
    def test_invalid_forced_assignment(self):
        """Test that a forced assignment referencing a course not taken by the user is ignored."""
        req = self.create_requirement(min_needed=1)
        req.course_list.add(self.course)
        # Create a course not in user's course list.
        external_course = self.create_course(self.dept, "999")
        user_overrides = {"forced_assignments": {(external_course.id, req.id)},
                          "req_marked_satisfied": set()}
        requirement_nodes = flatten_req_tree(req)
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        # The forced assignment should have no effect.
        self.assertFalse(results[req.id]["satisfied"])
    
    def test_duplicate_courses_in_user(self):
        """Test behavior when the user has duplicate entries for the same course."""
        # Create duplicate user course.
        self.create_user_course(self.user, self.course)
        req = self.create_requirement(min_needed=1)
        req.course_list.add(self.course)
        requirement_nodes = flatten_req_tree(req)
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        # The duplicate shouldn't inflate the count if double counting isn't allowed.
        self.assertEqual(results[req.id]["count"], 1)
    
    def test_conflicting_manual_overrides(self):
        """Test that conflicting manual overrides are resolved consistently."""
        req = self.create_requirement(min_needed=1)
        req.course_list.add(self.course)
        # Mark the requirement as manually satisfied.
        user_overrides = {"forced_assignments": {(self.course.id, req.id)},
                          "req_marked_satisfied": {req.id}}
        requirement_nodes = flatten_req_tree(req)
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        # The requirement should be satisfied, and the course should appear only once.
        self.assertTrue(results[req.id]["satisfied"])
        self.assertEqual(len(results[req.id]["courses"]), 1)

@override_settings(DATABASES=TEST_DB)
class PerformanceBenchmarkTest(TestCase, TestDataMixin):
    """Test suite for measuring performance characteristics of the flow network."""
    
    def setUp(self):
        """Set up a large test dataset to stress test performance."""
        # Create departments.
        self.depts = {}
        for code in ["COS", "MAT", "PHY", "CHM", "ENG", "HIS"]:
            self.depts[code] = self.create_department(code)
        
        # Create courses (roughly 100 courses across departments).
        self.courses = {}
        for dept_code, dept in self.depts.items():
            for i in range(1, 20):  # 19 courses per department.
                course = self.create_course(dept, f"{i:03d}")
                self.courses[f"{dept_code}{i:03d}"] = course
        
        # Create user.
        self.user = self.create_user()
        
        # Add 40 courses to user (simulate a full 4-year load; 5 courses per semester).
        course_list = list(self.courses.values())
        for i, course in enumerate(course_list[:40]):
            semester = (i // 5) + 1
            self.create_user_course(self.user, course, semester=semester)
        
        # Create a complex requirement structure for the stress test.
        self.setup_stress_test_requirements()
    
    def setup_stress_test_requirements(self):
        """Create a deep and branching requirement structure to stress test the system."""
        self.degree = self.create_degree()
        
        # Create a deep requirement tree with one root.
        self.root_req = self.create_requirement(
            name="Root",
            min_needed=4,
            max_counted=4
        )
        
        # Level 1 requirements (4 branches).
        self.level1_reqs = []
        for i in range(4):
            req = self.create_requirement(
                name=f"Level1_{i}",
                min_needed=2,
                max_counted=2,
                parent=self.root_req,
                double_counting_allowed=(i % 2 == 0)
            )
            self.level1_reqs.append(req)
        
        # Level 2 requirements: 3 per Level 1.
        self.level2_reqs = []
        for i, parent in enumerate(self.level1_reqs):
            for j in range(3):
                req = self.create_requirement(
                    name=f"Level2_{i}_{j}",
                    min_needed=1,
                    max_counted=2,
                    parent=parent,
                    double_counting_allowed=(j % 2 == 0)
                )
                # Add a batch of 5 courses to each Level 2 requirement.
                start_idx = (i * 3 + j) * 5
                courses = list(self.courses.values())[start_idx:start_idx + 5]
                req.course_list.add(*courses)
                self.level2_reqs.append(req)
        
        # Create a major that includes the entire requirement tree.
        self.major = self.create_major(requirements=[self.root_req])
    
    def test_large_network_performance(self):
        """Test performance with a large number of nodes and edges."""
        import time
        
        # Measure flattening time.
        start_time = time.time()
        requirement_nodes = flatten_req_tree(self.major)
        flatten_time = time.time() - start_time
        
        # Measure network construction time.
        start_time = time.time()
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        build_time = time.time() - start_time
        
        # Measure solve time.
        start_time = time.time()
        flow = run_flow_solver(fnet)
        solve_time = time.time() - start_time
        
        # Measure interpretation time.
        start_time = time.time()
        results = interpret_flow_solution(fnet, flow)
        interpret_time = time.time() - start_time
        
        # Log performance metrics.
        print(f"\nPerformance Metrics:")
        print(f"Flatten time: {flatten_time:.3f}s")
        print(f"Build time: {build_time:.3f}s")
        print(f"Solve time: {solve_time:.3f}s")
        print(f"Interpret time: {interpret_time:.3f}s")
        total_time = flatten_time + build_time + solve_time + interpret_time
        print(f"Total time: {total_time:.3f}s")
        
        # Assert that the total processing time is under a specified bound (e.g., 2 seconds).
        self.assertLess(total_time, 2.0, "Total processing time should be under 2 seconds")
    
    def test_manual_settlement_impact(self):
        """Test the impact of manual settlements on performance."""
        import time
        
        # Run without manual settlements.
        requirement_nodes = flatten_req_tree(self.major)
        start_time = time.time()
        fnet1 = build_flow_network(self.user, requirement_nodes, {
            "forced_assignments": set(),
            "req_marked_satisfied": set()
        })
        flow1 = run_flow_solver(fnet1)
        base_time = time.time() - start_time
        
        # Now add manual settlements for the first 5 Level 2 requirements.
        forced_assignments = set()
        for req in self.level2_reqs[:5]:
            # Take the first course in the requirement.
            course = list(req.course_list.all())[0]
            forced_assignments.add((course.id, req.id))
        
        start_time = time.time()
        fnet2 = build_flow_network(self.user, requirement_nodes, {
            "forced_assignments": forced_assignments,
            "req_marked_satisfied": set()
        })
        flow2 = run_flow_solver(fnet2)
        manual_time = time.time() - start_time
        
        # Manual settlements should not significantly impact processing time.
        time_ratio = manual_time / base_time if base_time > 0 else 1.0
        print(f"\nManual settlements time ratio: {time_ratio:.3f}")
        self.assertLess(time_ratio, 1.5,
                        "Manual settlements should not increase processing time by more than 50%")

@override_settings(DATABASES=TEST_DB)
class OldVsNewBenchmarkTest(TestCase, TestDataMixin):
    """Benchmark the new implementation vs. the old dashboard.requirements approach, with detailed breakdowns."""
    
    def setUp(self):
        # Set up a minimal baseline scenario.
        self.dept = self.create_department("COS", "Computer Science")
        self.course = self.create_course(self.dept, "126", "QR")
        self.user = self.create_user(net_id="benchmark_user")
        self.create_user_course(self.user, self.course, semester=1)
        self.req = self.create_requirement(
            name="Benchmark Requirement",
            min_needed=1,
            max_counted=1
        )
        self.req.course_list.add(self.course)
        self.major = self.create_major(requirements=[self.req])
    
    def test_basic_performance_comparison(self):
        import time

        # --- OLD IMPLEMENTATION ---
        start_old = time.perf_counter()
        old_result = check_user(self.user.net_id, {"code": self.major.code}, [], [])
        old_time = time.perf_counter() - start_old
        
        old_satisfied = old_result.get(self.major.code, {}).get("requirements", {}).get("satisfied", None)
        print("\n[OLD] Basic Output summary:")
        print(f"  - Major '{self.major.code}' satisfied? {old_satisfied}")
        
        # --- NEW IMPLEMENTATION BREAKDOWN ---
        t0 = time.perf_counter()
        requirement_nodes = fetch_flattened_requirements({
            "major": {"code": self.major.code},
            "minors": [],
            "certificates": []
        })
        flatten_time = time.perf_counter() - t0
        
        t1 = time.perf_counter()
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        build_time = time.perf_counter() - t1
        
        t2 = time.perf_counter()
        flow = run_flow_solver(fnet)
        solve_time = time.perf_counter() - t2
        
        t3 = time.perf_counter()
        new_result = interpret_flow_solution(fnet, flow)
        interpret_time = time.perf_counter() - t3
        
        new_time = flatten_time + build_time + solve_time + interpret_time
        
        print("\n[NEW] Basic Performance Breakdown:")
        print(f"  - Flattening time: {flatten_time:.6f}s")
        print(f"  - Network build time: {build_time:.6f}s")
        print(f"  - Solve time: {solve_time:.6f}s")
        print(f"  - Interpretation time: {interpret_time:.6f}s")
        print(f"  => Total new time: {new_time:.6f}s")
        
        num_nodes = len(fnet.node_to_index)
        num_course_nodes = len(fnet.course_nodes)
        num_req_nodes = len(fnet.requirement_nodes)
        total_edges = sum(len(edges) for edges in fnet.graph.values())
        print("\n[NEW] Network structure:")
        print(f"  - Total nodes: {num_nodes}, Course nodes: {num_course_nodes}, Requirement nodes: {num_req_nodes}")
        print(f"  - Total edges: {total_edges}")
        
        new_prog = new_result.get(self.req.id, {})
        new_satisfied = new_prog.get("satisfied", None)
        print("\n[NEW] Basic Output summary:")
        print(f"  - Benchmark Requirement (ID {self.req.id}) satisfied? {new_satisfied}")
        print(f"  - Courses used: {new_prog.get('courses', [])}")
        
        print("\n[Comparison]")
        print(f"  Old time: {old_time:.6f}s")
        print(f"  New time: {new_time:.6f}s")
        if new_time > 0:
            factor = old_time / new_time
            print(f"  New is {factor:.2f}x faster than old")
        else:
            print("  New time negligible.")
        
        self.assertLess(new_time, old_time * 1.5, "New implementation should be competitive with the old one")
        self.assertTrue(old_satisfied, "Old implementation should mark requirement satisfied")
        self.assertEqual(new_satisfied, "true", "New implementation should mark requirement satisfied")
    
    def test_repeated_calls_cache_effect(self):
        """Simulate repeated calls to see if the old implementation benefits from caching."""
        import time
        
        num_calls = 30
        old_times = []
        new_times = []
        
        for i in range(num_calls):
            start_old = time.perf_counter()
            _ = check_user(self.user.net_id, {"code": self.major.code}, [], [])
            old_times.append(time.perf_counter() - start_old)
            
            start_new = time.perf_counter()
            requirement_nodes = fetch_flattened_requirements({
                "major": {"code": self.major.code},
                "minors": [],
                "certificates": []
            })
            user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
            fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
            _ = run_flow_solver(fnet)
            _ = interpret_flow_solution(fnet, _)
            new_times.append(time.perf_counter() - start_new)
        
        avg_old = sum(old_times) / num_calls
        avg_new = sum(new_times) / num_calls
        print("\n[Repeated Calls] Average Old time: {:.6f}s, Average New time: {:.6f}s".format(avg_old, avg_new))
        
        # Expect that repeated calls to the old implementation might be faster due to caching.
        self.assertLess(avg_old, avg_new * 1.5, "Old implementation should benefit from caching on repeated calls")
    
    def test_stress_full_graph_rebuild(self):
        """Stress test: build a very large requirement tree to force a full graph rebuild."""
        import time
        
        # Create many courses and requirements.
        dept = self.create_department("STA", "Statistics")
        courses = [self.create_course(dept, f"{i:03d}") for i in range(1, 101)]
        for course in courses:
            self.create_user_course(self.user, course, semester=1)
        
        # Build a deep requirement tree (chain of 50 requirements).
        prev_req = None
        for i in range(50):
            req = self.create_requirement(name=f"Chain Req {i}", min_needed=1, max_counted=1)
            # Each requirement includes one course from our new list (cycling)
            req.course_list.add(courses[i % len(courses)])
            if prev_req:
                prev_req.req_list.add(req)
            else:
                root_req = req
            prev_req = req
        
        major = self.create_major(requirements=[root_req])
        start_time = time.perf_counter()
        requirement_nodes = flatten_req_tree(major)
        fnet = build_flow_network(self.user, requirement_nodes, {"forced_assignments": set(), "req_marked_satisfied": set()})
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        total_time = time.perf_counter() - start_time
        print("\n[Stress Test] Total processing time: {:.6f}s".format(total_time))
        # In worst-case, ensure it completes in a reasonable amount of time.
        self.assertLess(total_time, 3.0, "Stress test should complete in under 3 seconds")
    
    def test_manual_settlement_vs_full_rebuild(self):
        """Test scenario where manual settlements are applied repeatedly versus a full graph rebuild."""
        import time
        
        # Prepare a scenario with several requirements.
        requirement_nodes = fetch_flattened_requirements({
            "major": {"code": self.major.code},
            "minors": [],
            "certificates": []
        })
        base_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        
        # Time a full graph rebuild (new implementation without manual overrides).
        start_full = time.perf_counter()
        fnet_full = build_flow_network(self.user, requirement_nodes, base_overrides)
        flow_full = run_flow_solver(fnet_full)
        _ = interpret_flow_solution(fnet_full, flow_full)
        full_time = time.perf_counter() - start_full
        
        # Now simulate many manual settlements (old approach might avoid full rebuild via caching)
        forced_assignments = set()
        # For simplicity, force settlement on the same requirement multiple times.
        for i in range(100):
            forced_assignments.add((self.course.id, self.req.id))
        manual_overrides = {"forced_assignments": forced_assignments, "req_marked_satisfied": set()}
        start_manual = time.perf_counter()
        fnet_manual = build_flow_network(self.user, requirement_nodes, manual_overrides)
        flow_manual = run_flow_solver(fnet_manual)
        _ = interpret_flow_solution(fnet_manual, flow_manual)
        manual_time = time.perf_counter() - start_manual
        
        print("\n[Manual vs. Full Rebuild]")
        print(f"  Full rebuild time: {full_time:.6f}s")
        print(f"  Manual settlement rebuild time: {manual_time:.6f}s")
        ratio = manual_time / full_time if full_time > 0 else 1.0
        print(f"  Manual settlement scenario is {ratio:.2f}x slower than full rebuild")
        
        # In our worst-case, we may expect the manual settlement scenario to be slower,
        # but not by an extreme factor.
        self.assertLess(ratio, 2.0, "Manual settlement processing should not exceed full rebuild by more than 2x")

# !! 2 feailures, 2 error
@override_settings(DATABASES=TEST_DB)
class APICompatibilityTest(TestCase, TestDataMixin):
    """Test that the new Windsor API functions return results compatible with the old implementation.
    
    We check that the key structure, types, and overall nested schema match between the old dashboard.requirements
    endpoints and the new Windsor approach. In cases where global optimization differs, we only insist that the keys
    and type signatures are identical.
    """
    
    def setUp(self):
        """Set up test data for API comparison."""
        # Create departments with canonical codes and names.
        self.cos_dept = self.create_department("COS", "Computer Science")
        self.mat_dept = self.create_department("MAT", "Mathematics")
        
        # Create courses with full field details.
        self.cos126 = self.create_course(
            dept=self.cos_dept,
            catalog_number="126",
            dist_area="QR",
            title="Computer Science: An Interdisciplinary Approach",
            crosslistings="COS 126",
            description="Test description",
            guid="COS126",
            course_id="COS-126"
        )
        self.cos226 = self.create_course(
            dept=self.cos_dept,
            catalog_number="226",
            dist_area="QR",
            title="Algorithms and Data Structures",
            crosslistings="COS 226",
            description="Test description",
            guid="COS226",
            course_id="COS-226"
        )
        self.mat201 = self.create_course(
            dept=self.mat_dept,
            catalog_number="201",
            dist_area="QR",
            title="Multivariable Calculus",
            crosslistings="MAT 201",
            description="Test description",
            guid="MAT201",
            course_id="MAT-201"
        )
        
        # Create a degree.
        self.degree = self.create_degree(
            code="BSE",
            name="Bachelor of Science in Engineering",
            description="Test BSE degree"
        )
        
        # Create a user with complete fields.
        self.user = self.create_user(
            net_id="api_test_user",
            class_year=2024,
            email="api_test_user@princeton.edu",
            first_name="API",
            last_name="Test User"
        )
        
        # Create requirements with complete fields.
        self.prog_req = self.create_requirement(
            name="Programming",
            min_needed=2,
            max_counted=2,
            explanation="Programming requirement",
            double_counting_allowed=True,
            completed_by_semester=4,
            dept_list=["COS"],
            dist_req=["QR"]
        )
        self.prog_req.course_list.add(self.cos126, self.cos226)
        
        self.math_req = self.create_requirement(
            name="Math",
            min_needed=1,
            max_counted=1,
            explanation="Math requirement",
            double_counting_allowed=True,
            completed_by_semester=4,
            dept_list=["MAT"],
            dist_req=["QR"]
        )
        self.math_req.course_list.add(self.mat201)
        
        # Create a major.
        self.major = self.create_major(
            code="COS-BSE",
            name="Computer Science (B.S.E.)",
            description="Test major description"
        )
        
        # Save and link everything in order.
        self.degree.save()
        self.prog_req.save()
        self.math_req.save()
        self.major.save()
        self.major.req_list.add(self.prog_req, self.math_req)
        self.major.degree.add(self.degree)
        self.user.major = self.major
        self.user.save()
        
        # Create a mock request with proper headers.
        self.request = self.create_mock_request(net_id=self.user.net_id)
        
        # Import both implementations.
        from hoagieplan.api.dashboard import requirements as old_impl
        from hoagieplan.api.dashboard.windsor_approach import (
            update_requirements as new_update_requirements,
            manually_settle as new_manually_settle,
            mark_satisfied as new_mark_satisfied,
            update_courses as new_update_courses
        )
        self.old_impl = old_impl
        self.new_update_requirements = new_update_requirements
        self.new_manually_settle = new_manually_settle
        self.new_mark_satisfied = new_mark_satisfied
        self.new_update_courses = new_update_courses

    def test_update_requirements_structure(self):
        """Test that update_requirements returns the same top-level structure as the old implementation."""
        request_data = {
            "netId": self.user.net_id,
            "major": {"code": "COS-BSE"},
            "minors": [],
            "certificates": []
        }
        self.request.body = oj.dumps(request_data)
        
        old_result = self.old_impl.update_requirements(self.request)
        new_result = self.new_update_requirements(self.request)
        
        old_content = oj.loads(old_result.content)
        new_content = oj.loads(new_result.content)
        
        print("\n[APICompatibility] Top-level structure comparison:")
        print(f"  Old keys: {sorted(old_content.keys())}")
        print(f"  New keys: {sorted(new_content.keys())}")
        
        self.assertEqual(
            set(old_content.keys()),
            set(new_content.keys()),
            "Top-level keys should match between old and new implementations"
        )
        
        # Check that for the major, the structure is similar.
        major_code = self.major.code
        if major_code in old_content and major_code in new_content:
            old_major = old_content[major_code]
            new_major = new_content[major_code]
            for req_name in old_major:
                self.assertIn(req_name, new_major, f"Requirement '{req_name}' missing in new implementation for major")
                old_req = old_major[req_name]
                new_req = new_major[req_name]
                self.assertEqual(
                    set(old_req.keys()),
                    set(new_req.keys()),
                    f"Keys for requirement '{req_name}' should match"
                )
                # Check that 'settled' and 'unsettled' are lists.
                if "settled" in old_req:
                    self.assertIsInstance(old_req["settled"], list)
                    self.assertIsInstance(new_req["settled"], list)
                if "unsettled" in old_req:
                    self.assertIsInstance(old_req["unsettled"], list)
                    self.assertIsInstance(new_req["unsettled"], list)

    def test_requirement_response_structure(self):
        """Test that individual requirement responses contain the required fields and proper types."""
        request_data = {
            "netId": self.user.net_id,
            "major": {"code": "COS-BSE"},
            "minors": [],
            "certificates": []
        }
        self.request.body = oj.dumps(request_data)
        old_result = self.old_impl.update_requirements(self.request)
        new_result = self.new_update_requirements(self.request)
        old_content = oj.loads(old_result.content)
        new_content = oj.loads(new_result.content)
        
        major_code = self.major.code
        if major_code in old_content and "Programming" in old_content[major_code]:
            old_req = old_content[major_code]["Programming"]
            new_req = new_content[major_code]["Programming"]
            required_fields = {"satisfied", "count", "min_needed", "max_counted",
                               "settled", "unsettled", "manually_satisfied", "req_id"}
            self.assertTrue(required_fields.issubset(set(old_req.keys())),
                            "Old implementation missing required fields in requirement response")
            self.assertTrue(required_fields.issubset(set(new_req.keys())),
                            "New implementation missing required fields in requirement response")
            # Ensure types.
            self.assertIsInstance(old_req["satisfied"], str)
            self.assertIsInstance(new_req["satisfied"], str)
            self.assertIsInstance(old_req["count"], str)
            self.assertIsInstance(new_req["count"], str)
            self.assertIsInstance(old_req["min_needed"], str)
            self.assertIsInstance(new_req["min_needed"], str)
            self.assertIsInstance(old_req["settled"], list)
            self.assertIsInstance(new_req["settled"], list)
            self.assertIsInstance(old_req["unsettled"], list)
            self.assertIsInstance(new_req["unsettled"], list)
    
    def test_course_list_structure(self):
        """Test that settled/unsettled course lists are structured identically."""
        request_data = {
            "netId": self.user.net_id,
            "major": {"code": "COS-BSE"},
            "minors": [],
            "certificates": []
        }
        self.request.body = oj.dumps(request_data)
        old_result = self.old_impl.update_requirements(self.request)
        new_result = self.new_update_requirements(self.request)
        old_content = oj.loads(old_result.content)
        new_content = oj.loads(new_result.content)
        
        major_code = self.major.code
        if major_code in old_content and "Programming" in old_content[major_code]:
            old_req = old_content[major_code]["Programming"]
            new_req = new_content[major_code]["Programming"]
            if old_req.get("settled"):
                old_settled = old_req["settled"][0]  # first element is course list
                new_settled = new_req["settled"][0]
                if old_settled:
                    old_course = old_settled[0]
                    new_course = new_settled[0]
                    course_fields = {"id", "code", "crosslistings", "manually_settled"}
                    self.assertEqual(
                        set(old_course.keys()),
                        set(new_course.keys()),
                        "Settled course fields should match between old and new implementations"
                    )
    
    def test_update_requirements_values(self):
        """Test that update_requirements returns identical values for keys when computed by both implementations.
        
        While the new approach may optimize globally, the key values (such as satisfaction flags and counts)
        must match exactly.
        """
        request_data = {
            "netId": self.user.net_id,
            "major": {"code": "COS-BSE"},
            "minors": [],
            "certificates": []
        }
        self.request.body = oj.dumps(request_data)
        self.major.save()
        self.major.degree.add(self.degree)
        self.major.req_list.add(self.prog_req, self.math_req)
        self.user.major = self.major
        self.user.save()
        
        old_result = self.old_impl.update_requirements(self.request)
        new_result = self.new_update_requirements(self.request)
        old_content = oj.loads(old_result.content)
        new_content = oj.loads(new_result.content)
        
        # For our purposes, require that the major, minors and certificates keys match exactly.
        self.assertEqual(old_content.get(self.major.code), new_content.get(self.major.code),
                         "Major requirements should match exactly between old and new implementations")
        self.assertEqual(old_content.get("Minors"), new_content.get("Minors"),
                         "Minor requirements should match exactly between old and new implementations")
        self.assertEqual(old_content.get("Certificates"), new_content.get("Certificates"),
                         "Certificate requirements should match exactly between old and new implementations")
    
    def test_manually_settle_structure(self):
        """Test that manually_settle returns the same structure as the old implementation."""
        user_course = UserCourses.objects.create(
            user=self.user,
            course=self.cos126,
            semester=1
        )
        request_data = {
            "crosslistings": self.cos126.crosslistings,
            "reqId": self.prog_req.id,
            "settled": True
        }
        self.request.body = oj.dumps(request_data)
        
        old_result = self.old_impl.manually_settle(self.request)
        new_result = self.new_manually_settle(self.request)
        
        old_content = oj.loads(old_result.content)
        new_content = oj.loads(new_result.content)
        self.assertEqual(set(old_content.keys()), set(new_content.keys()),
                         "manually_settle response keys should match between old and new")
    
    def test_manually_settle_values(self):
        """Test that manually_settle produces the same effect on the database as the old implementation."""
        user_course = UserCourses.objects.create(
            user=self.user,
            course=self.cos126,
            semester=1
        )
        request_data = {
            "crosslistings": self.cos126.crosslistings,
            "reqId": self.prog_req.id,
            "settled": True
        }
        self.request.body = oj.dumps(request_data)
        # Settle the requirement using the new implementation.
        self.new_manually_settle(self.request)
        user_course = UserCourses.objects.get(user=self.user, course=self.cos126)
        self.assertIn(self.prog_req, user_course.requirements.all(),
                      "Requirement should be assigned when manually settled (True)")
        
        # Now unset.
        request_data["settled"] = False
        self.request.body = oj.dumps(request_data)
        self.new_manually_settle(self.request)
        user_course = UserCourses.objects.get(user=self.user, course=self.cos126)
        self.assertNotIn(self.prog_req, user_course.requirements.all(),
                         "Requirement should be removed when manually settled (False)")
    
    def test_mark_satisfied_structure(self):
        """Test that mark_satisfied returns the same structure as the old implementation."""
        request_data = {
            "reqId": self.prog_req.id,
            "markedSatisfied": "true"
        }
        self.request.body = oj.dumps(request_data)
        old_result = self.old_impl.mark_satisfied(self.request)
        new_result = self.new_mark_satisfied(self.request)
        
        old_content = oj.loads(old_result.content)
        new_content = oj.loads(new_result.content)
        self.assertEqual(set(old_content.keys()), set(new_content.keys()),
                         "mark_satisfied response keys should match")
    
    def test_mark_satisfied_values(self):
        """Test that mark_satisfied affects the user requirements identically in both implementations."""
        request_data = {
            "reqId": self.prog_req.id,
            "markedSatisfied": "true"
        }
        self.request.body = oj.dumps(request_data)
        self.new_mark_satisfied(self.request)
        self.assertIn(self.prog_req, self.user.requirements.all(),
                      "Requirement should be marked satisfied")
        
        request_data["markedSatisfied"] = "false"
        self.request.body = oj.dumps(request_data)
        self.new_mark_satisfied(self.request)
        self.assertNotIn(self.prog_req, self.user.requirements.all(),
                         "Requirement should be unmarked satisfied")
    
    def test_update_courses_structure(self):
        """Test that update_courses returns the same response structure as the old implementation."""
        user_course = UserCourses.objects.create(
            user=self.user,
            course=self.cos126,
            semester=1
        )
        request_data = {
            "crosslistings": self.cos126.crosslistings,
            "semesterId": "Spring 2024"
        }
        self.request.body = oj.dumps(request_data)
        old_result = self.old_impl.update_courses(self.request)
        new_result = self.new_update_courses(self.request)
        
        old_content = oj.loads(old_result.content)
        new_content = oj.loads(new_result.content)
        self.assertEqual(set(old_content.keys()), set(new_content.keys()),
                         "update_courses response keys should match")
    
    def test_update_courses_values(self):
        """Test that update_courses updates the user's courses identically in both implementations."""
        user_course = UserCourses.objects.create(
            user=self.user,
            course=self.cos126,
            semester=1
        )
        # Test updating the semester.
        request_data = {
            "crosslistings": self.cos126.crosslistings,
            "semesterId": "Spring 2024"
        }
        self.request.body = oj.dumps(request_data)
        self.new_update_courses(self.request)
        user_course = UserCourses.objects.get(user=self.user, course=self.cos126)
        self.assertEqual(user_course.semester, 8, "Course semester should be updated to 8 for Spring 2024")
        
        # Test deletion (moving course to "Search Results").
        request_data = {
            "crosslistings": self.cos126.crosslistings,
            "semesterId": "Search Results"
        }
        self.request.body = oj.dumps(request_data)
        self.new_update_courses(self.request)
        self.assertFalse(
            UserCourses.objects.filter(user=self.user, course=self.cos126).exists(),
            "Course should be deleted when semesterId is 'Search Results'"
        )

# !! 1 failure
@override_settings(DATABASES=TEST_DB)
class IntegrationTest(TestCase, TestDataMixin):
    """Full integration test: from user courses to flow network to frontend data."""
    
    def setUp(self):
        # Create a department and two courses.
        self.dept = self.create_department("COS", "Computer Science")
        self.course1 = self.create_course(self.dept, "101", "QR")
        self.course2 = self.create_course(self.dept, "102", "QR")
        
        # Create a user and add the two courses to the user.
        self.user = self.create_user(net_id="integration_user")
        self.user.save()
        self.create_user_course(self.user, self.course1, semester=1)
        self.create_user_course(self.user, self.course2, semester=2)
        
        # Create two requirements:
        # Req1: non-double counting, satisfied by course1.
        self.req1 = self.create_requirement(
            name="Req1",
            min_needed=1,
            max_counted=1,
            double_counting_allowed=False
        )
        self.req1.course_list.add(self.course1)
        # Req2: double counting allowed, satisfied by course2.
        self.req2 = self.create_requirement(
            name="Req2",
            min_needed=1,
            max_counted=1,
            double_counting_allowed=True
        )
        self.req2.course_list.add(self.course2)
        
        # Create a major linking these requirements.
        self.major = self.create_major(requirements=[self.req1, self.req2])
    
    def test_full_integration(self):
        """Test full integration: from flattened requirements to network solution and frontend data."""
        # Flatten requirement tree.
        requirement_nodes = fetch_flattened_requirements({
            "major": {"code": self.major.code},
            "minors": [],
            "certificates": []
        })
        # Use empty overrides.
        user_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        # Build the flow network and compute the solution.
        fnet = build_flow_network(self.user, requirement_nodes, user_overrides)
        flow = run_flow_solver(fnet)
        results = interpret_flow_solution(fnet, flow)
        
        # Transform results for the frontend.
        request = self.create_mock_request(net_id=self.user.net_id)
        final_data = transform_data_for_frontend(request, requirement_nodes, results)
        
        # Check that the major's data includes both requirements.
        major_data = final_data.get(self.major.code, {})
        self.assertIn("Req1", major_data, "Req1 should be present in the major data")
        self.assertIn("Req2", major_data, "Req2 should be present in the major data")
        # Ensure both requirements are marked as satisfied.
        self.assertTrue(major_data["Req1"]["satisfied"], "Req1 should be satisfied")
        self.assertTrue(major_data["Req2"]["satisfied"], "Req2 should be satisfied")
        
        # Additionally, verify that the output structure matches our expected keys.
        expected_keys = {"satisfied", "count", "min_needed", "max_counted", "settled", "unsettled", "manually_satisfied", "req_id"}
        for req_name in ["Req1", "Req2"]:
            self.assertTrue(expected_keys.issubset(set(major_data[req_name].keys())),
                            f"Requirement {req_name} output must contain all expected keys")


@override_settings(DATABASES=TEST_DB)
class GraphModificationTest(TestCase, TestDataMixin):
    """Test that graph modifications (forced assignments/manual overrides) update the solution correctly."""
    
    def setUp(self):
        # Create a department and two courses.
        self.dept = self.create_department("COS", "Computer Science")
        self.course1 = self.create_course(self.dept, "101", "QR")
        self.course2 = self.create_course(self.dept, "102", "QR")
        self.user = self.create_user(net_id="graph_mod_user")
        self.create_user_course(self.user, self.course1, semester=1)
        self.create_user_course(self.user, self.course2, semester=2)
        
        # Create a requirement that requires both courses.
        self.req = self.create_requirement(
            name="Graph Mod Req",
            min_needed=2,
            max_counted=2,
            double_counting_allowed=False
        )
        self.req.course_list.add(self.course1, self.course2)
        self.major = self.create_major(requirements=[self.req])
    
    def test_forced_assignment_effect(self):
        """Test that adding a forced assignment changes the network solution."""
        # Build network without forced assignments.
        requirement_nodes = fetch_flattened_requirements({
            "major": {"code": self.major.code},
            "minors": [],
            "certificates": []
        })
        base_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        fnet = build_flow_network(self.user, requirement_nodes, base_overrides)
        flow = run_flow_solver(fnet)
        base_results = interpret_flow_solution(fnet, flow)
        
        # Without any forced assignment, check that both courses satisfy the req.
        self.assertEqual(set(base_results[self.req.id]["courses"]), {self.course1.id, self.course2.id})
        
        # Now, force-assign course1 to the requirement.
        forced_overrides = {"forced_assignments": {(self.course1.id, self.req.id)}, "req_marked_satisfied": set()}
        fnet_forced = build_flow_network(self.user, requirement_nodes, forced_overrides)
        flow_forced = run_flow_solver(fnet_forced)
        results_forced = interpret_flow_solution(fnet_forced, flow_forced)
        
        # Check that course1 appears in the settled courses.
        self.assertIn(self.course1.id, results_forced[self.req.id]["courses"],
                      "Forced assignment should ensure course1 appears in the requirement's course list")
    
    def test_manual_overrides_update(self):
        """Test that manual satisfaction (marking a requirement as satisfied) updates the result appropriately."""
        # Mark the requirement as manually satisfied.
        overrides = {"forced_assignments": set(), "req_marked_satisfied": {self.req.id}}
        requirement_nodes = fetch_flattened_requirements({
            "major": {"code": self.major.code},
            "minors": [],
            "certificates": []
        })
        fnet_manual = build_flow_network(self.user, requirement_nodes, overrides)
        flow_manual = run_flow_solver(fnet_manual)
        results_manual = interpret_flow_solution(fnet_manual, flow_manual)
        
        # In manual satisfaction mode, the requirement should be marked satisfied even if courses are not counted.
        self.assertTrue(results_manual[self.req.id]["satisfied"],
                        "Manual satisfaction should mark the requirement as satisfied")
    
    def test_repeated_graph_modification(self):
        """Stress test: repeatedly update forced assignments and ensure the network updates accordingly."""
        requirement_nodes = fetch_flattened_requirements({
            "major": {"code": self.major.code},
            "minors": [],
            "certificates": []
        })
        base_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        # Run the network once without any forced assignments.
        fnet = build_flow_network(self.user, requirement_nodes, base_overrides)
        flow = run_flow_solver(fnet)
        base_results = interpret_flow_solution(fnet, flow)
        base_courses = set(base_results[self.req.id]["courses"])
        
        # Now simulate repeated modifications.
        forced_overrides = {"forced_assignments": set(), "req_marked_satisfied": set()}
        for i in range(5):
            # Alternate forcing course1 and course2.
            if i % 2 == 0:
                forced_overrides["forced_assignments"].add((self.course1.id, self.req.id))
            else:
                forced_overrides["forced_assignments"].add((self.course2.id, self.req.id))
            fnet_mod = build_flow_network(self.user, requirement_nodes, forced_overrides)
            flow_mod = run_flow_solver(fnet_mod)
            mod_results = interpret_flow_solution(fnet_mod, flow_mod)
            mod_courses = set(mod_results[self.req.id]["courses"])
            # Check that at least the forced course appears.
            if i % 2 == 0:
                self.assertIn(self.course1.id, mod_courses)
            else:
                self.assertIn(self.course2.id, mod_courses)
            forced_overrides["forced_assignments"].clear()  # Clear for next iteration


if __name__ == '__main__':
    import django
    django.setup()
    from django.test.runner import DiscoverRunner
    test_runner = DiscoverRunner(verbosity=2)
    failures = test_runner.run_tests(['test_data_flow'])
    if failures:
        print("\n❌ Some tests failed!")
    else:
        print("\n✅ All tests passed!")
