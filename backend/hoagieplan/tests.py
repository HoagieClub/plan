"""Test suite for Hoagie Plan's backend.

Docs: https://docs.djangoproject.com/en/5.1/topics/testing/overview/
"""

# TODO: This file needs to be updated, e.g. we no longer have a net_id field for CustomUsers
import sys
from colorama import init, Fore, Style
from django.test import TestCase
from .models import (
    CustomUser,
    CalendarConfiguration,
    SemesterConfiguration,
    ScheduleSelection,
    AcademicTerm,
    Section,
    Course,
    Department,
)

init(autoreset=True)


class Logger:
    @staticmethod
    def _log(color, style, msg):
        sys.stdout.write(f"{style}{color}{msg}\n")
        sys.stdout.flush()

    @staticmethod
    def info(msg):
        Logger._log(Fore.WHITE, Style.NORMAL, msg)

    @staticmethod
    def success(msg):
        Logger._log(Fore.GREEN, Style.BRIGHT, msg)

    @staticmethod
    def warn(msg):
        Logger._log(Fore.YELLOW, Style.NORMAL, msg)

    @staticmethod
    def error(msg):
        Logger._log(Fore.RED, Style.BRIGHT, msg)

    @staticmethod
    def header(msg):
        Logger._log(Fore.CYAN, Style.BRIGHT, f"\n{msg}")


class Commands:
    @staticmethod
    def create_user(username, email, first_name, last_name, class_year):
        return CustomUser.objects.create_user(
            username=username,
            email=email,
            password="password",
            role="student",
            net_id=username,
            first_name=first_name,
            last_name=last_name,
            class_year=class_year,
        )

    @staticmethod
    def create_term(term_code, suffix, start_date, end_date):
        return AcademicTerm.objects.create(
            term_code=term_code,
            suffix=suffix,
            start_date=start_date,
            end_date=end_date,
        )

    @staticmethod
    def create_department(name):
        return Department.objects.create(name=name)

    @staticmethod
    def create_course(dept, guid, course_id, catalog_number, title, description, web_address):
        return Course.objects.create(
            department=dept,
            guid=guid,
            course_id=course_id,
            catalog_number=catalog_number,
            title=title,
            description=description,
            web_address=web_address,
        )

    @staticmethod
    def create_section(course, class_number, class_type, class_section, term, capacity, status, enrollment):
        return Section.objects.create(
            course=course,
            class_number=class_number,
            class_type=class_type,
            class_section=class_section,
            term=term,
            capacity=capacity,
            status=status,
            enrollment=enrollment,
        )

    @staticmethod
    def create_calendar_config(user, name, index):
        return CalendarConfiguration.objects.create(
            user=user,
            name=name,
            index=index,
        )

    @staticmethod
    def create_semester_config(calendar_config, term):
        return SemesterConfiguration.objects.create(
            calendar_configuration=calendar_config,
            term=term,
        )

    @staticmethod
    def create_schedule(semester_config, section, index, name, is_active=True):
        return ScheduleSelection.objects.create(
            semester_configuration=semester_config,
            section=section,
            index=index,
            name=name,
            is_active=is_active,
        )


class BasicCalendarTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.commands = Commands()
        cls.user1 = cls.commands.create_user("mn4560", "mn4560@princeton.edu", "Windsor", "Nguyen", 2025)
        cls.user2 = cls.commands.create_user("gc5512", "gc5512@princeton.edu", "George", "Chiriac", 2025)
        cls.term = cls.commands.create_term("1252", "F2024", "2024-09-03", "2024-12-15")
        cls.department = cls.commands.create_department("Computer Science")
        cls.course = cls.commands.create_course(
            cls.department,
            "COS-333-2024-fall",
            "COS333",
            "333",
            "Advanced Programming Techniques",
            "This course teaches advanced programming techniques.",
            "https://www.cs.princeton.edu/courses/archive/fall24/cos333/",
        )
        cls.section = cls.commands.create_section(cls.course, 12345, "Lecture", "L01", cls.term, 100, "Open", 0)

    def setUp(self):
        Logger.success("SetUp completed: Test environment prepared.")

    def test_create_edit_schedules(self):
        Logger.header("Test: Create and Edit Schedules")
        calendar_config1 = self.commands.create_calendar_config(self.user1, "User1 Config", 0)
        semester_config1 = self.commands.create_semester_config(calendar_config1, self.term)
        schedule1 = self.commands.create_schedule(semester_config1, self.section, 0, "User1 Schedule")
        Logger.warn(f"Created initial schedule: {schedule1.name}")

        schedule1.name = "User1 Updated Schedule"
        schedule1.save()
        Logger.warn(f"Updated schedule name to: {schedule1.name}")

        updated_schedule = ScheduleSelection.objects.get(id=schedule1.id)
        Logger.warn(f"Retrieved updated schedule: {updated_schedule.name}")
        self.assertEqual(updated_schedule.name, "User1 Updated Schedule")
        Logger.success("Test completed successfully")

    def test_multiple_users_schedules(self):
        Logger.header("Test: Multiple Users Create Schedules Without Conflict")
        calendar_config1 = self.commands.create_calendar_config(self.user1, "User1 Config", 0)
        semester_config1 = self.commands.create_semester_config(calendar_config1, self.term)
        self.commands.create_schedule(semester_config1, self.section, 0, "User1 Schedule")
        Logger.warn("Created schedule for User 1")

        calendar_config2 = self.commands.create_calendar_config(self.user2, "User2 Config", 0)
        semester_config2 = self.commands.create_semester_config(calendar_config2, self.term)
        self.commands.create_schedule(semester_config2, self.section, 0, "User2 Schedule")
        Logger.warn("Created schedule for User 2")

        user1_schedules = ScheduleSelection.objects.filter(semester_configuration=semester_config1).count()
        user2_schedules = ScheduleSelection.objects.filter(semester_configuration=semester_config2).count()
        Logger.warn(f"User 1 schedules: {user1_schedules}, User 2 schedules: {user2_schedules}")
        self.assertEqual(user1_schedules, 1)
        self.assertEqual(user2_schedules, 1)
        Logger.success("Test completed successfully")

    def test_edit_others_schedules(self):
        Logger.header("Test: Users Cannot Edit Each Other's Schedules")
        calendar_config1 = self.commands.create_calendar_config(self.user1, "User1 Config", 0)
        semester_config1 = self.commands.create_semester_config(calendar_config1, self.term)
        schedule1 = self.commands.create_schedule(semester_config1, self.section, 0, "User1 Schedule")
        Logger.warn(f"Created schedule for User 1: {schedule1.name}")

        Logger.warn("Attempting to edit User 1's schedule as User 2...")
        try:
            ScheduleSelection.objects.get(
                semester_configuration__calendar_configuration__user=self.user2, id=schedule1.id
            )
            self.fail("User 2 should not be able to access User 1's schedule")
        except ScheduleSelection.DoesNotExist:
            Logger.success("Expected: ScheduleSelection.DoesNotExist")
        Logger.success("Test completed successfully")

    def test_delete_own_schedules(self):
        Logger.header("Test: Users Can Delete Their Schedules")
        calendar_config1 = self.commands.create_calendar_config(self.user1, "User1 Config", 0)
        semester_config1 = self.commands.create_semester_config(calendar_config1, self.term)
        schedule1 = self.commands.create_schedule(semester_config1, self.section, 0, "User1 Schedule")
        Logger.warn(f"Created schedule for User 1: {schedule1.name}")

        schedule1.delete()
        Logger.warn("Deleted User 1's schedule")

        remaining = ScheduleSelection.objects.filter(semester_configuration=semester_config1).count()
        Logger.warn(f"Remaining schedules for User 1: {remaining}")
        self.assertEqual(remaining, 0)
        Logger.success("Test completed successfully")

    def test_delete_others_schedules(self):
        Logger.header("Test: Users Cannot Delete Each Others Schedules")
        calendar_config1 = self.commands.create_calendar_config(self.user1, "User1 Config", 0)
        semester_config1 = self.commands.create_semester_config(calendar_config1, self.term)
        schedule1 = self.commands.create_schedule(semester_config1, self.section, 0, "User1 Schedule")
        Logger.warn(f"Created schedule for User 1: {schedule1.name}")

        Logger.warn("Attempting to delete User 1's schedule as User 2...")
        try:
            ScheduleSelection.objects.get(
                semester_configuration__calendar_configuration__user=self.user2, id=schedule1.id
            ).delete()
            self.fail("User 2 should not be able to delete User 1's schedule")
        except ScheduleSelection.DoesNotExist:
            Logger.success("Expected: ScheduleSelection.DoesNotExist")
        Logger.success("Test completed successfully")
