import os
import sys
import ujson as json
import django
import logging
import collections
import time
import copy
from pathlib import Path
from django.db.models import Prefetch

logging.basicConfig(level=logging.INFO)
sys.path.append(str(Path('../').resolve()))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from compass.models import (
    Course,
    Department,
    Degree,
    Major,
    Minor,
    Certificate,
    CustomUser,
    UserCourses,
    Requirement,
    CourseComments,
    CourseEvaluations,
)
import constants


# Have a custom check_requirements recursive function for minors. Can
# return a huge dict that says how close to completion each minor is

# courses = [[{"inst" : something, "semester_number" : 1},
# {"id" : 72967, "semester_number" : 1}, ...], [], [], [], [], [], [], []]
# other fields: possible_reqs, reqs_satisfied, reqs_double_counted,
# num_settleable

# req is supposed to be the yaml data. Need a req dict to keep:
# req instance
# satisfied: whether the req is satisfied or not
# settled: courses that were settled to this req (course ids)
# unsettled: courses that were not settled to this req (course ids)
# req_list

# Is it better to keep reqs on the server (i.e. variable in this file)
# or is it better to have a UserRequirements table?

# Need a function that gets user id and creates courses matrix with
# everything that _init_courses has

# Django model instances are cached so this should be at least as
# efficient as TigerPath code


def cumulative_time(func):
    def wrapper(*args, **kwargs):
        if not hasattr(wrapper, 'total_time'):
            wrapper.total_time = 0
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        wrapper.total_time += end_time - start_time
        return result

    wrapper.total_time = 0
    return wrapper


def ensure_list(x):
    if isinstance(x, list):
        return x
    elif isinstance(x, str):
        return [x]
    else:
        return []


@cumulative_time
def check_user(net_id, major, minors, certificates):
    output = {}

    user_inst = CustomUser.objects.get(net_id=net_id)
    user_courses = create_courses(user_inst)

    if major is not None:
        major_code = major['code']
        degree_code = None

        if major_code in constants.AB_MAJORS:
            degree_code = 'AB'
        elif major_code in constants.BSE_MAJORS:
            degree_code = 'BSE'
        if degree_code:
            output[degree_code] = {}
            formatted_req = check_requirements(
                user_inst, 'Degree', degree_code, user_courses
            )
            output[degree_code]['requirements'] = formatted_req

        output[major_code] = {}
        if major_code != 'Undeclared':
            formatted_req = check_requirements(
                user_inst, 'Major', major_code, user_courses
            )
        else:
            formatted_req = {'code': 'Undeclared', 'satisfied': True}
        output[major_code]['requirements'] = formatted_req

    output['Minors'] = {}
    for minor in minors:
        minor = minor['code']
        output['Minors'][minor] = {}
        formatted_req = check_requirements(user_inst, 'Minor', minor, user_courses)
        output['Minors'][minor]['requirements'] = formatted_req
    
    output['Certificates'] = {}
    for certificate in certificates:
        certificate = certificate['code']
        output['Certificates'][certificate] = {}
        formatted_req = check_requirements(user_inst, 'Certificate', certificate, user_courses)
        output['Certificates'][certificate]['requirements'] = formatted_req

    # print(f"create_courses: {create_courses.total_time} seconds")
    # print(f"check_requirements: {check_requirements.total_time} seconds")
    # print(f"_init_courses: {_init_courses.total_time} seconds")
    # print(f"_init_req: {_init_req.total_time} seconds")
    # print(f"assign_settled_courses_to_reqs: {assign_settled_courses_to_reqs.total_time} seconds")
    # print(f"mark_possible_reqs: {mark_possible_reqs.total_time} seconds")
    # print(f"mark_dist: {mark_dist.total_time} seconds")
    # print(f"mark_courses: {mark_courses.total_time} seconds")
    # print(f"mark_all: {mark_all.total_time} seconds")
    # print(f"mark_settled: {mark_settled.total_time} seconds")
    # print(f"add_course_lists_to_req: {add_course_lists_to_req.total_time} seconds")
    # print(f"format_req_output: {format_req_output.total_time} seconds")

    return output


@cumulative_time
def create_courses(user_inst):
    courses = [[] for i in range(8)]
    course_insts = UserCourses.objects.select_related('user').filter(user=user_inst)
    for course_inst in course_insts:
        course = {
            'id': course_inst.course.id,
            'manually_settled': False,
            'distribution_area_short': course_inst.course.distribution_area_short,
            'crosslistings': course_inst.course.crosslistings,
            'dept_code': course_inst.course.department.code,
            'cat_num': course_inst.course.catalog_number,
        }
        if course_inst.requirement_id is not None:
            course['settled'] = [course_inst.requirement_id]
            course['manually_settled'] = True
        courses[course_inst.semester - 1].append(course)
    return courses


@cumulative_time
def check_requirements(user_inst, table, code, courses):
    """
    Returns information about the requirements satisfied by the courses
    given in course_ids.

    :param table: the table containing the root of the requirement tree
    :param id: primary key in table
    :type req_file: string
    :type courses: 2D array of dictionaries.
    :returns: Whether the requirements are satisfied
    :returns: The list of courses with info about the requirements they satisfy
    :returns: A simplified json with info about how much of each requirement is satisfied
    :rtype: (bool, dict, dict)
    """

    req = cached_init_req(user_inst, table, code)
    manually_satisfied_reqs = list(user_inst.requirements.values_list('id', flat=True))
    courses = _init_courses(courses)
    mark_possible_reqs(req, courses)
    assign_settled_courses_to_reqs(req, courses, manually_satisfied_reqs)
    add_course_lists_to_req(req, courses)
    # formatted_courses = format_courses_output(courses)
    formatted_req = format_req_output(req, courses, manually_satisfied_reqs)
    return formatted_req


# These fields could be in the UserCourses table by default
# possible_reqs, reqs_satisfied, reqs_double_counted would be ManyToManyFields
@cumulative_time
def _init_courses(courses):
    if not courses:
        courses = [[] for i in range(8)]
    else:
        courses = copy.deepcopy(courses)
    for sem in courses:
        for course in sem:
            course['possible_reqs'] = []
            course['reqs_satisfied'] = []
            course[
                'reqs_double_counted'
            ] = []  # reqs satisfied for which double counting allowed
            course[
                'num_settleable'
            ] = 0  # number of reqs to which can be settled. autosettled if 1
            if 'settled' not in course or course['settled'] is None:
                course['settled'] = []
    return courses


# cache this: -2.5s. Also, do this at start up.
# TODO: Turn course lists back into sets
@cumulative_time
def cached_init_req(user_inst, table, code):
    req_dict = user_inst.req_dict
    root_id = code + ', ' + table
    if req_dict:
        req_dict = json.loads(req_dict)
        if root_id in req_dict:
            return req_dict[root_id]

        req_inst = prefetch_req_inst(table, code)
        req = _init_req(req_inst)
        req_dict[root_id] = req

        user_inst.req_dict = json.dumps(req_dict)
        user_inst.save()
        return req

    req_dict = {}
    req_inst = prefetch_req_inst(table, code)
    req = _init_req(req_inst)
    req_dict[root_id] = req

    user_inst.req_dict = json.dumps(req_dict)
    user_inst.save()

    return req


@cumulative_time
def _init_req(req_inst):
    req = serialize_req_inst(req_inst)

    if (
        hasattr(req_inst, '_prefetched_objects_cache')
        and 'req_list' in req_inst._prefetched_objects_cache
    ):
        sub_reqs = req_inst._prefetched_objects_cache['req_list']
    else:
        sub_reqs = req_inst.req_list.all()

    if sub_reqs:
        req['req_list'] = [_init_req(sub_req_inst) for sub_req_inst in sub_reqs]

    if req['table'] == 'Requirement':
        if (
            hasattr(req_inst, '_prefetched_objects_cache')
            and 'course_list' in req_inst._prefetched_objects_cache
            and 'excluded_course_list' in req_inst._prefetched_objects_cache
        ):
            courses = req_inst._prefetched_objects_cache['course_list']
            excluded_courses = req_inst._prefetched_objects_cache[
                'excluded_course_list'
            ]
        else:
            courses = req_inst.course_list.all()
            excluded_courses = req_inst.excluded_course_list.all()

        req['course_list'] = [course_inst.id for course_inst in courses]
        if len(req['course_list']) == 0:
            req.pop('course_list')

        req['excluded_course_list'] = [
            course_inst.id for course_inst in excluded_courses
        ]
        if len(req['excluded_course_list']) == 0:
            req.pop('excluded_course_list')

    return req


@cumulative_time
def serialize_req_inst(req_inst):
    req = {
        'id': getattr(req_inst, 'id', None),
        'name': getattr(req_inst, 'name', None),
        'code': getattr(req_inst, 'code', None),
        'max_counted': getattr(req_inst, 'max_counted', None),
        'min_needed': getattr(req_inst, 'min_needed', None),
        'double_counting_allowed': getattr(req_inst, 'double_counting_allowed', False),
        'max_common_with_major': getattr(req_inst, 'max_common_with_major', None),
        'completed_by_semester': getattr(req_inst, 'completed_by_semester', None),
        'dept_list': getattr(req_inst, 'dept_list', None),
        'dist_req': getattr(req_inst, 'dist_req', None),
        'num_courses': getattr(req_inst, 'num_courses', None),
        'table': req_inst._meta.db_table,
        'settled': [],
        'unsettled': [],
        'count': 0,
    }
    if req['dept_list'] is not None:
        req['dept_list'] = json.loads(req['dept_list'])
    if req['dist_req'] is not None:
        req['dist_req'] = ensure_list(json.loads(req['dist_req']))

    return req


@cumulative_time
def prefetch_req_inst(table, code):
    req_inst = None

    if table == 'Degree':
        req_inst = Degree.objects.prefetch_related(
            Prefetch(
                'req_list',
                queryset=Requirement.objects.prefetch_related(
                    Prefetch('req_list', queryset=Requirement.objects.all())
                ),
            )
        ).get(code=code)
    elif table == 'Major':
        req_inst = Major.objects.prefetch_related(
            Prefetch(
                'req_list',
                queryset=Requirement.objects.prefetch_related(
                    Prefetch('req_list', queryset=Requirement.objects.all()),
                    'course_list',
                    'excluded_course_list',
                ),
            )
        ).get(code=code)
    elif table == 'Minor':
        req_inst = Minor.objects.prefetch_related(
            Prefetch(
                'req_list',
                queryset=Requirement.objects.prefetch_related(
                    Prefetch('req_list', queryset=Requirement.objects.all()),
                    'course_list',
                    'excluded_course_list',
                ),
            )
        ).get(code=code)
    elif table == 'Certificate':
        req_inst = Certificate.objects.prefetch_related(
            Prefetch(
                'req_list',
                queryset=Requirement.objects.prefetch_related(
                    Prefetch('req_list', queryset=Requirement.objects.all()),
                    'course_list',
                    'excluded_course_list',
                ),
            )
        ).get(code=code)

    return req_inst


@cumulative_time
def assign_settled_courses_to_reqs(req, courses, manually_satisfied_reqs):
    """
    Assigns only settled courses and those that can only satify one requirement,
    and updates the appropriate counts.
    """

    old_deficit = req['min_needed'] - req['count']
    if req['max_counted']:
        old_available = req['max_counted'] - req['count']
    else:
        old_available = 0

    was_satisfied = old_deficit <= 0
    newly_satisfied = 0
    if 'req_list' in req:
        for sub_req in req['req_list']:
            newly_satisfied_added = assign_settled_courses_to_reqs(
                sub_req, courses, manually_satisfied_reqs
            )
            if sub_req['id'] in manually_satisfied_reqs:
                newly_satisfied_added = sub_req['max_counted']
            newly_satisfied += newly_satisfied_added
    elif req['double_counting_allowed']:
        newly_satisfied = mark_all(req, courses)
    elif ('course_list' in req) or req['dept_list']:
        newly_satisfied = mark_settled(req, courses)
    elif req['dist_req']:
        newly_satisfied = mark_settled(req, courses)
    elif req['num_courses']:
        newly_satisfied = check_degree_progress(req, courses)
    else:
        # for papers, IW, where there are no leaf nodes
        newly_satisfied = 1

    req['count'] += newly_satisfied
    new_deficit = req['min_needed'] - req['count']
    if (not was_satisfied) and (new_deficit <= 0):
        if req['max_counted'] is None:
            return req['count']
        else:
            return min(req['max_counted'], req['count'])
    elif was_satisfied and (new_deficit <= 0):
        if req['max_counted'] is None:
            return newly_satisfied
        else:
            return min(old_available, newly_satisfied)
    else:
        return 0


@cumulative_time
def mark_possible_reqs(req, courses):
    """
    Finds all the requirements that each course can satisfy.
    """
    if 'req_list' in req:
        for sub_req in req['req_list']:
            mark_possible_reqs(sub_req, courses)
    else:
        if ('course_list' in req) or req['dept_list']:
            mark_courses(req, courses)
        if req['dist_req']:
            mark_dist(req, courses)


# This could be done in SQL
# In UserCourses, get courses where distribution_area_short in json.loads(req["inst"].dist_req)
# Do operations on search hits
@cumulative_time
def mark_dist(req, courses):
    num_marked = 0
    for sem in courses:
        for course in sem:
            if req['id'] in course['possible_reqs']:  # already used
                continue
            course_dist = course['distribution_area_short']
            if not course_dist:
                continue

            course_dist = course_dist.split(' or ')
            dist_req = req['dist_req']
            ok = 0

            for area in course_dist:
                if area in req['dist_req']:
                    ok = 1
                    break

            if ok == 1:
                num_marked += 1
                course['possible_reqs'].append(req['id'])
            if not req['double_counting_allowed']:
                course['num_settleable'] += 1
    return num_marked


# This only assigns settleable requirements to courses, and not the
# other way around.
@cumulative_time
def mark_courses(req, courses):
    num_marked = 0
    for sem_num, sem in enumerate(courses):
        if sem_num + 1 > req['completed_by_semester']:
            continue
        for course in sem:
            if req['id'] in course['possible_reqs']:  # already used
                continue
            if 'excluded_course_list' in req:
                if course['id'] in req['excluded_course_list']:
                    continue
            if req['dept_list']:
                for code in req['dept_list']:
                    if code == course['dept_code']:
                        num_marked += 1
                        course['possible_reqs'].append(req['id'])
                        if not req['double_counting_allowed']:
                            course['num_settleable'] += 1
                        break
            if 'course_list' in req:
                if course['id'] in req['course_list']:
                    num_marked += 1
                    course['possible_reqs'].append(req['id'])
                    if not req['double_counting_allowed']:
                        course['num_settleable'] += 1
    return num_marked


@cumulative_time
def mark_all(req, courses):
    """
    Finds and marks all courses in 'courses' that satisfy a requirement where
    double counting is allowed.
    """
    num_marked = 0
    for sem in courses:
        for course in sem:
            if req['id'] in course['possible_reqs']:
                num_marked += 1
                course['reqs_double_counted'].append(req['id'])
    return num_marked


@cumulative_time
def mark_settled(req, courses):
    """
    Finds and marks all courses in 'courses' that have been settled to
    this requirement.
    """
    num_marked = 0
    for sem in courses:
        for course in sem:
            if len(course['reqs_satisfied']) > 0:  # already used in some subreq
                continue
            if len(course['settled']) > 0:
                for p in course['settled']:  # go through the settled requirement ids
                    if (p == req['id']) and (
                        p in course['possible_reqs']
                    ):  # course was settled into this requirement
                        num_marked += 1
                        course['reqs_satisfied'].append(p)
                        break
            # or course is manually settled to this req...
            elif (course['num_settleable'] == 1) and (
                req['id'] in course['possible_reqs']
            ):
                num_marked += 1
                course['reqs_satisfied'].append(req['id'])
                course['settled'].append(req['id'])
    return num_marked


@cumulative_time
def check_degree_progress(req, courses):
    """
    Checks whether the correct number of courses have been completed by the
    end of semester number 'by_semester' (1-8)
    """
    by_semester = req['completed_by_semester']
    num_courses = 0
    if by_semester is None or by_semester > len(courses):
        by_semester = len(courses)
    for i in range(by_semester):
        num_courses += len(courses[i])
    return num_courses


@cumulative_time
def add_course_lists_to_req(req, courses):
    """
    Add course lists for each requirement that either
    (a) has no subrequirements, or
    (b) has hidden subrequirements
    """
    if 'req_list' in req:
        for sub_req in req['req_list']:
            add_course_lists_to_req(sub_req, courses)
    req['settled'] = []
    req['unsettled'] = []
    for sem in courses:
        for course in sem:
            if (req['table'] == 'Requirement') and req['double_counting_allowed']:
                if len(course['reqs_double_counted']) > 0:
                    for req_id in course['reqs_double_counted']:
                        if req_id == req['id']:
                            req['settled'].append(course['id'])
                            ## add to reqs_satisfied because couldn't be added in _assign_settled_courses_to_reqs()
                            course['reqs_satisfied'].append(req['id'])
            elif len(course['settled']) > 0:
                for req_id in course['settled']:
                    if req_id == req['id']:
                        req['settled'].append(course['id'])
            else:
                for req_id in course['possible_reqs']:
                    if req_id == req['id']:
                        req['unsettled'].append(course['id'])
                        break


@cumulative_time
def format_req_output(req, courses, manually_satisfied_reqs):
    """
    Enforce the type and order of fields in the req output
    """
    output = collections.OrderedDict()
    if req['table'] != 'Requirement' and req['code']:
        output['code'] = req['code']
    if req['table'] == 'Requirement' and req['name']:
        output['name'] = req['name']
    output['req_id'] = req['id']
    output['manually_satisfied'] = req['id'] in manually_satisfied_reqs
    output['satisfied'] = str(
        (req['min_needed'] - req['count'] <= 0) or output['manually_satisfied']
    )
    output['count'] = str(req['count'])
    output['min_needed'] = str(req['min_needed'])
    output['max_counted'] = req['max_counted']
    if 'req_list' in req:  # internal node. recursively call on children
        req_list = {}
        for i, subreq in enumerate(req['req_list']):
            child = format_req_output(subreq, courses, manually_satisfied_reqs)
            if child is not None:
                if 'code' in child:
                    code = child.pop('code')
                    req_list[code] = child
                elif 'name' in child:
                    name = child.pop('name')
                    req_list[name] = child
                else:
                    req_list[f'Subrequirement {i + 1}'] = child
        if req_list:
            output['subrequirements'] = req_list
    if ('settled' in req) and ('req_list' not in req):
        settled = []
        for semester in courses:
            for course in semester:
                if course['id'] in req['settled']:
                    course_output = {
                        'code': course['dept_code'] + ' ' + course['cat_num'],
                        'id': course['id'],
                        'crosslistings': course['crosslistings'],
                        'manually_settled': course['manually_settled'],
                    }
                    settled.append(course_output)
        output['settled'] = [settled, req['id']]
    if ('unsettled' in req) and ('req_list' not in req):
        unsettled = []
        for semester in courses:
            for course in semester:
                if course['id'] in req['unsettled']:
                    course_output = {
                        'code': course['dept_code'] + ' ' + course['cat_num'],
                        'crosslistings': course['crosslistings'],
                        'id': course['id'],
                        'manually_settled': course['manually_settled'],
                    }
                    unsettled.append(course_output)
        output['unsettled'] = [unsettled, req['id']]
    return output


# ---------------------------- FETCH COURSE COMMENTS ----------------------------------#


# dept is the department code (string) and num is the catalog number (int)
# returns dictionary containing relevant info
def get_course_comments(dept, num):
    dept = str(dept)
    num = str(num)
    try:
        dept_code = Department.objects.filter(code=dept).first().id
        try:
            this_course_id = (
                Course.objects.filter(department__id=dept_code, catalog_number=num)
                .first()
                .guid
            )
            this_course_id = this_course_id[4:]
            try:
                comments = list(
                    CourseComments.objects.filter(course_guid__endswith=this_course_id)
                )
                li = []
                for commentobj in comments:
                    if 2 <= len(commentobj.comment) <= 2000:
                        li.append(commentobj.comment)
                li = list(dict.fromkeys(li))
                cleaned_li = []
                for element in li:
                    element = element.replace('\\"', '"')
                    element = element.replace('it?s', "it's")
                    element = element.replace('?s', "'s")
                    element = element.replace('?r', "'r")
                    if element[0] == '[' and element[len(element) - 1] == ']':
                        element = element[1 : len(element) - 1]

                    cleaned_li.append(element)

                dictresult = {}
                dictresult['reviews'] = cleaned_li

                try:
                    quality_of_course = (
                        CourseEvaluations.objects.filter(
                            course_guid__endswith=this_course_id
                        )
                        .first()
                        .quality_of_course
                    )
                    dictresult['rating'] = quality_of_course

                except CourseEvaluations.DoesNotExist:
                    return dictresult

                return dictresult

            except CourseComments.DoesNotExist:
                return None
        except Course.DoesNotExist:
            return None
    except Department.DoesNotExist:
        return None


# ---------------------------- FETCH COURSE DETAILS -----------------------------------#


# dept is the department code (string) and num is the catalog number (int)
# returns dictionary containing relevant info
def get_course_info(crosslistings):
    try:
        course = (
            Course.objects.select_related('department')
            .filter(crosslistings__icontains=crosslistings)
            .order_by('-guid')[0]
        )
        # if course.course_id:
        # instructor = "None"
        # try:
        #    instructor = Section.objects.filter(course_id=13248).first()
        # except Section.DoesNotExist:
        #    instructor = "Information Unavailable"
        # get relevant info and put it in a dictionary
        course_dict = {}
        if course.title:
            course_dict['Title'] = course.title
        if course.description:
            course_dict['Description'] = course.description
        if course.distribution_area_short:
            course_dict['Distribution Area'] = course.distribution_area_short
        # if instructor:
        #    course_dict["Professor"] = instructor
        if course.reading_list:
            clean_reading_list = course.reading_list
            clean_reading_list = clean_reading_list.replace('//', ', by ')
            clean_reading_list = clean_reading_list.replace(';', '; ')
            course_dict['Reading List'] = clean_reading_list
        if course.reading_writing_assignment:
            course_dict[
                'Reading / Writing Assignments'
            ] = course.reading_writing_assignment
        if course.grading_basis:
            course_dict['Grading Basis'] = course.grading_basis
        return course_dict

    except Course.DoesNotExist:
        return None


def main():
    pass


if __name__ == '__main__':
    main()