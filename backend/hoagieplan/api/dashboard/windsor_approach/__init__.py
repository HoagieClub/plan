import orjson as oj
import numpy as np
from collections import defaultdict
from scipy.sparse import csr_matrix
from scipy.sparse.csgraph import maximum_flow
from django.http import JsonResponse
from typing import Dict, List, Tuple, Set
from hoagieplan.models import (
    CustomUser, Major, Minor, Degree, Certificate, Requirement, UserCourses, Course
)
from hoagieplan.api.profile.info import fetch_user_info
from hoagieplan.logger import logger


def ensure_list(value):
    if isinstance(value, list):
        return value
    return [value] if isinstance(value, str) else []


def parse_semester(semester_str: str, class_year: int) -> int:
    season, year_str = semester_str.split(" ")
    year = int(year_str)
    # Returns a semester index (defaulting to 8 as maximum)
    return 8 - ((class_year - year) * 2 - (1 if season.lower() == "fall" else 0))


def flatten_requirement_tree(requirement_obj, visited=None) -> List[Dict]:
    """
    Recursively flattens a requirement or program object (e.g., Major, Degree)
    into a list of nodes with key metadata while avoiding cycles.
    """
    if visited is None:
        visited = set()
    if requirement_obj in visited:
        return []
    visited.add(requirement_obj)

    node = {
        "id": requirement_obj.id,
        "name": requirement_obj.name,
        "sub_requirement_ids": [],
        "table": requirement_obj._meta.db_table,
        "min_required": getattr(requirement_obj, "min_needed", 1),
        "max_counted": getattr(requirement_obj, "max_counted", 1) or 99999,
        "double_counting_allowed": bool(getattr(requirement_obj, "double_counting_allowed", False)),
        "completed_by_semester": getattr(requirement_obj, "completed_by_semester", 8),
        "department_list": [],
        "distribution_requirements": [],
        "course_list": [],
        "excluded_course_list": [],
        "explanation": getattr(requirement_obj, "explanation", None)
    }
    if node["table"] == "Requirement":
        node["course_list"] = list(requirement_obj.course_list.values_list("id", flat=True))
        node["excluded_course_list"] = list(requirement_obj.excluded_course_list.values_list("id", flat=True))
        if requirement_obj.dept_list:
            node["department_list"] = ensure_list(oj.loads(requirement_obj.dept_list))
        if requirement_obj.dist_req:
            node["distribution_requirements"] = ensure_list(oj.loads(requirement_obj.dist_req))
    elif node["table"] in ["Major", "Degree", "Minor", "Certificate"]:
        node["code"] = getattr(requirement_obj, "code", None)

    flattened_nodes = [node]

    if hasattr(requirement_obj, "req_list"):
        for sub_req in requirement_obj.req_list.all():
            sub_nodes = flatten_requirement_tree(sub_req, visited)
            flattened_nodes.extend(sub_nodes)
            if sub_nodes:
                node["sub_requirement_ids"].append(sub_nodes[0]["id"])

    return flattened_nodes


def get_flattened_requirements(user_info) -> List[Dict]:
    nodes = []
    if (major_info := user_info.get("major")) and (major_code := major_info["code"]) != "Undeclared":
        major_obj = Major.objects.get(code=major_code)
        major_nodes = flatten_requirement_tree(major_obj)
        nodes.extend(major_nodes)
        for degree_obj in major_obj.degree.all():
            degree_nodes = flatten_requirement_tree(degree_obj)
            nodes.extend(degree_nodes)
            if major_nodes and degree_nodes:
                major_nodes[0]["parent_degree"] = degree_nodes[0]["id"]
    for minor_info in user_info.get("minors", []):
        minor_obj = Minor.objects.get(code=minor_info["code"])
        minor_nodes = flatten_requirement_tree(minor_obj)
        for node in minor_nodes:
            node["program_type"] = "Minor"
        nodes.extend(minor_nodes)
    for cert_info in user_info.get("certificates", []):
        cert_obj = Certificate.objects.get(code=cert_info["code"])
        cert_nodes = flatten_requirement_tree(cert_obj)
        for node in cert_nodes:
            node["program_type"] = "Certificate"
        nodes.extend(cert_nodes)
    return nodes


def get_user_courses(user: CustomUser) -> List[Dict]:
    return [{
        "id": uc.course.id,
        "dept_code": uc.course.department.code if uc.course.department else None,
        "distribution_area": uc.course.distribution_area_short or "",
        "semester_index": uc.semester or 8,
        "crosslistings": uc.course.crosslistings,
        "manually_settled_req_ids": list(uc.requirements.values_list("id", flat=True))
    } for uc in UserCourses.objects.select_related("course__department").filter(user=user)]


class FlowNetwork:
    INF = 99999

    def __init__(self):
        self.graph = defaultdict(dict)
        self.node_index_map = {}
        self.index_node_map = {}
        self.next_index = 0
        self.requirement_node_map = {}
        self.course_node_map = {}
        self.requirement_minimums = {}
        self.source_label = "source"
        self.sink_label = "sink"
        self._initialize_source_sink()
        self.user = None

    def _initialize_source_sink(self):
        self.register_node(self.source_label)
        self.register_node(self.sink_label)
        self.node_index_map[self.source_label] = 0
        self.node_index_map[self.sink_label] = 1
        self.index_node_map[0] = self.source_label
        self.index_node_map[1] = self.sink_label
        self.next_index = 2

    def register_node(self, label: str):
        if label not in self.graph:
            self.graph[label] = {}
            self.node_index_map[label] = self.next_index
            self.index_node_map[self.next_index] = label
            self.next_index += 1

    def add_edge(self, source_label: str, target_label: str, capacity: int):
        self.register_node(source_label)
        self.register_node(target_label)
        self.graph[source_label][target_label] = capacity
        if source_label not in self.graph[target_label]:
            self.graph[target_label][source_label] = 0

    def add_course_nodes(self, course_id: int):
        primary_node = f"course_{course_id}_primary"
        secondary_node = f"course_{course_id}_secondary"
        self.course_node_map[course_id] = (primary_node, secondary_node)
        self.add_edge(self.source_label, primary_node, 1)
        self.add_edge(self.source_label, secondary_node, self.INF)

    def add_requirement_node(self, req: Dict, overrides: Dict):
        req_key = f"{req['table']}_{req['id']}"
        req_label = f"req_{req['id']}"
        self.requirement_node_map[req_key] = req_label
        self.register_node(req_label)
        min_required = 0 if is_marked_satisfied(req["id"], overrides) else req["min_needed"]
        self.requirement_minimums[req_label] = min_required

    def connect_course_to_requirement(self, course_id: int, req: Dict):
        primary_node, secondary_node = self.course_node_map[course_id]
        req_label = self.requirement_node_map[f"{req['table']}_{req['id']}"]
        if req.get("double_counting_allowed", False):
            self.add_edge(primary_node, req_label, self.INF)
            self.add_edge(secondary_node, req_label, self.INF)
        else:
            self.add_edge(primary_node, req_label, 1)

    def build_capacity_matrix(self) -> np.ndarray:
        num_nodes = len(self.node_index_map)
        capacity_matrix = np.zeros((num_nodes, num_nodes), dtype=np.int32)
        for from_label, edges in self.graph.items():
            for to_label, cap in edges.items():
                if cap in [None, float('inf')]:
                    cap = self.INF
                capacity_matrix[self.node_index_map[from_label], self.node_index_map[to_label]] = int(cap)
        return capacity_matrix

    def compute_maximum_flow(self) -> Dict[Tuple[str, str], int]:
        capacity_sparse = csr_matrix(self.build_capacity_matrix())
        flow_result = maximum_flow(capacity_sparse, 0, 1, method="dinic").flow.toarray()
        flow_dict = {}
        for i in range(flow_result.shape[0]):
            for j in range(flow_result.shape[1]):
                if flow_result[i, j] > 0:
                    from_node = self.index_node_map[i]
                    to_node = self.index_node_map[j]
                    flow_dict[(from_node, to_node)] = int(flow_result[i, j])
        return flow_dict


def is_course_eligible(course: Dict, req: Dict) -> bool:
    if req.get("excluded_course_list") and course["id"] in req["excluded_course_list"]:
        return False
    if req.get("completed_by_semester") is not None and course.get("semester_index", 8) > req["completed_by_semester"]:
        return False
    if req.get("course_list") and course["id"] in req["course_list"]:
        return True
    if req.get("department_list") and course.get("dept_code") in req["department_list"]:
        return True
    if req.get("distribution_requirements") and (dist := course.get("distribution_area")):
        for area in dist.split(" or "):
            if area in req["distribution_requirements"]:
                return True
    return False


def was_course_manually_settled(course_id: int, req_id: int, overrides: Dict) -> bool:
    return (course_id, req_id) in overrides.get("forced_assignments", set())


def is_marked_satisfied(req_id: int, overrides: Dict) -> bool:
    return req_id in overrides.get("req_marked_satisfied", set())


def build_flow_network(user: CustomUser, requirements: List[Dict], overrides: Dict) -> FlowNetwork:
    """
    Build a flow network from the user's courses and flattened requirements.
    """
    network = FlowNetwork()
    network.user = user
    if not requirements:
        return network

    for req in requirements:
        network.add_requirement_node(req, overrides)

    courses = get_user_courses(user)
    for course in courses:
        network.add_course_nodes(course["id"])

    for course in courses:
        for req in requirements:
            if not is_marked_satisfied(req["id"], overrides) and is_course_eligible(course, req):
                network.connect_course_to_requirement(course["id"], req)

    for req in requirements:
        req_key = f"{req['table']}_{req['id']}"
        req_node = network.requirement_node_map[req_key]
        network.add_edge(req_node, network.sink_label, req.get("max_counted") or FlowNetwork.INF)

    return network


def run_flow_solver(network: FlowNetwork) -> Dict[Tuple[str, str], int]:
    return network.compute_maximum_flow()


def interpret_flow_results(network: FlowNetwork, flow: Dict[Tuple[str, str], int]) -> Dict:
    results = {}
    for req_key, req_node in network.requirement_node_map.items():
        req_id = int(req_key.split('_')[1])
        minimum_required = network.requirement_minimums.get(req_node, 1)
        total_assigned, assigned_courses = 0, set()
        for node_label, edges in network.graph.items():
            if req_node in edges:
                flow_value = flow.get((node_label, req_node), 0)
                total_assigned += flow_value
                if node_label.startswith("course_"):
                    try:
                        assigned_courses.add(int(node_label.split("_")[1]))
                    except Exception:
                        pass
        results[req_id] = {
            "req_id": req_id,
            "satisfied": total_assigned >= minimum_required,
            "count": total_assigned,
            "min_needed": minimum_required,
            "courses": list(assigned_courses)
        }
    return results


def prepare_frontend_data(request, requirements: List[Dict], flow_results: Dict) -> Dict:
    nodes_by_id = {node["id"]: node for node in requirements}
    frontend_output = {}

    # Process Majors
    for node in requirements:
        if node["table"] == "Major":
            major_code = node["code"]
            sub_requirements = {}
            for sub_req_id in node.get("sub_requirement_ids", []):
                sub_node = nodes_by_id.get(sub_req_id)
                if sub_node:
                    req_result = flow_results.get(sub_node["id"], {"satisfied": False})
                    sub_requirements[sub_node["name"]] = {
                        "req_id": sub_node["id"],
                        "satisfied": str(req_result["satisfied"]).lower(),
                    }
            frontend_output[major_code] = sub_requirements

    # Process Degrees
    degrees = {}
    for node in requirements:
        if node["table"] == "Degree":
            degrees[node["code"]] = {
                "req_id": node["id"],
                "satisfied": str(flow_results.get(node["id"], {"satisfied": False})["satisfied"]).lower()
            }
    frontend_output["Degrees"] = degrees

    # Process Minors
    minors = {}
    for node in requirements:
        if node["table"] == "Minor":
            minors[node["code"]] = {
                "req_id": node["id"],
                "satisfied": str(flow_results.get(node["id"], {"satisfied": False})["satisfied"]).lower()
            }
    frontend_output["Minors"] = minors

    # Process Certificates
    certificates = {}
    for node in requirements:
        if node["table"] == "Certificate":
            certificates[node["code"]] = {
                "req_id": node["id"],
                "satisfied": str(flow_results.get(node["id"], {"satisfied": False})["satisfied"]).lower()
            }
    frontend_output["Certificates"] = certificates

    return frontend_output
