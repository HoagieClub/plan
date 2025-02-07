from rest_framework import serializers
from .models import (
    Course,
    Section,
    ClassMeeting,
    CalendarConfiguration,
    ScheduleSelection,
    SemesterConfiguration,
)


class ClassMeetingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassMeeting
        fields = (
            "meeting_number",
            "start_time",
            "end_time",
            "room",
            "days",
            "building_name",
        )


class SectionSerializer(serializers.ModelSerializer):
    # Nested ClassMeetingSerializer to include meeting details in the section data
    class_meetings = ClassMeetingSerializer(many=True, read_only=True)
    instructor_name = serializers.CharField(source="instructor.name", read_only=True)

    class Meta:
        model = Section
        fields = (
            "class_number",
            "class_type",
            "class_section",
            "track",
            "seat_reservations",
            "instructor_name",
            "capacity",
            "status",
            "enrollment",
            "class_meetings",
        )


class CourseSerializer(serializers.ModelSerializer):
    # Nested SectionSerializer to include section details in the course data
    sections = SectionSerializer(many=True, read_only=True)
    department_code = serializers.CharField(source="department.code", read_only=True)

    class Meta:
        model = Course
        fields = (
            "guid",
            "course_id",
            "catalog_number",
            "title",
            "description",
            "drop_consent",
            "add_consent",
            "web_address",
            "transcript_title",
            "long_title",
            "distribution_area_long",
            "distribution_area_short",
            "reading_writing_assignment",
            "grading_basis",
            "reading_list",
            "department_code",
            "sections",
            "crosslistings",
        )


# Calendar (temporary serializer)
class CalendarClassMeetingSerializer(serializers.ModelSerializer):
    start_time = serializers.TimeField(format="%H:%M")
    end_time = serializers.TimeField(format="%H:%M")

    class Meta:
        model = ClassMeeting
        fields = (
            "section_id",
            "meeting_number",
            "start_time",
            "end_time",
            "days",
            "room",
            "building_name",
        )


# May be deprecated due to new serializers below?
class CalendarSectionSerializer(serializers.ModelSerializer):
    class_meetings = CalendarClassMeetingSerializer(
        source="classmeeting_set", many=True, read_only=True
    )

    class Meta:
        model = Section
        fields = (
            "class_number",
            "class_section",
            "class_type",
            "instructor",
            "class_meetings",
        )


class ScheduleSelectionSerializer(serializers.ModelSerializer):
    section_details = serializers.SerializerMethodField()

    def get_section_details(self, obj):
        return {
            "id": obj.section.id,
            "course": {
                "guid": obj.section.course.guid,
                "title": obj.section.course.title,
                "catalog_number": obj.section.course.catalog_number,
                "distribution_area_name": obj.section.course.distribution_area_name,
                "distribution_area_short": obj.section.course.distribution_area_short,
                "grading_basis": obj.section.course.grading_basis,
            },
            "section_number": obj.section.section_number,
            "class_meetings": [
                {
                    "id": meeting.id,
                    "days": meeting.days,
                    "start_time": meeting.start_time,
                    "end_time": meeting.end_time,
                    "start_date": meeting.start_date,
                    "end_date": meeting.end_date,
                }
                for meeting in obj.section.class_meetings.all()
            ],
        }

    class Meta:
        model = ScheduleSelection
        fields = ["id", "section_details", "index", "name", "is_active"]


class SemesterConfigurationSerializer(serializers.ModelSerializer):
    schedule_selections = ScheduleSelectionSerializer(many=True, read_only=True)

    class Meta:
        model = SemesterConfiguration
        fields = ["id", "term", "schedule_selections"]


class CalendarConfigurationSerializer(serializers.ModelSerializer):
    semester_configurations = SemesterConfigurationSerializer(many=True, read_only=True)

    class Meta:
        model = CalendarConfiguration
        fields = ["id", "user", "name", "semester_configurations"]
        read_only_fields = ["id", "user"]
        