"""URL configuration for the hoagieplan project.

The `urlpatterns` list routes URLs to views, allowing different sections of the
site to be accessed via HTTP requests. This file connects URL patterns with
corresponding views, ensuring the right logic is executed for each route.

For more information, please see the Django URL dispatcher documentation at:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/

Copyright © 2021-2025 Hoagie Club and affiliates.

This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree or at

    https://github.com/hoagieclub/plan/LICENSE.

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""

from django.contrib import admin
from django.urls import path

from hoagieplan import ical_generator
from hoagieplan.api.auth import csrf
from hoagieplan.api.calendar import configuration
from hoagieplan.api.calendar.calendar_configuration_view import CalendarConfigurationView
from hoagieplan.api.calendar.calendar_event_view import CalendarEventView
from hoagieplan.api.dashboard import details, requirements, search, upload
from hoagieplan.api.profile import info, tutorial

urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),
    # CSRF Token for approving POST requests
    path("csrf/", csrf.csrf_token_view, name="csrf"),
    # Profile
    path("profile/", info.profile, name="profile"),
    path("profile/get_user/", info.get_user, name="get_user"),
    path("profile/update/", info.update_profile, name="update_profile"),
    path("profile/class-year/", info.update_class_year, name="update_class_year"),
    # Tutorial
    path("tutorial/get-status/", tutorial.get_status, name="get_tutorial_status"),
    path("tutorial/set-status/", tutorial.set_status, name="set_tutorial_status"),
    # Dashboard
    path("search/", search.search_courses, name="search"),
    path("fetch_courses/", info.get_user_courses, name="fetch_courses"),
    path("update_courses/", requirements.update_courses, name="update_courses"),
    path("update_transcript_courses/", requirements.update_transcript_courses, name="update_transcript_courses"),
    path("manually_settle/", requirements.manually_settle, name="manually_settle"),
    path("mark_satisfied/", requirements.mark_satisfied, name="mark_satisfied"),
    path("update_requirements/", requirements.update_requirements, name="update_requirements"),
    path("requirement_info/", requirements.requirement_info, name="requirement_info"),
    path("course/details/", details.course_details, name="course_details"),
    path("course/comments/", details.course_comments_view, name="course_comments"),
    path("upload/", upload.upload_file, name="upload_file"),
    # Calendar
    path(
        "fetch_calendar_classes/<str:term>/<str:course_id>/",
        configuration.FetchCalendarClasses.as_view(),
        name="fetch_calendar_classes",
    ),
    path("export-calendar/", ical_generator.export_calendar_view, name="export_calendar"),
    path("calendars/<int:term>/", CalendarConfigurationView.as_view(), name="calendars"),
    path(
        "calendar_events/<str:calendar_name>/<int:term>/",
        CalendarEventView.as_view(),
        name="calendar_events",
    ),
]
