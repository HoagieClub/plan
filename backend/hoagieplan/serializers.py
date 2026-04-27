from rest_framework import serializers

from .models import CalendarConfiguration, CalendarEvent, ClassMeeting, Course, Section


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
	class_meetings = ClassMeetingSerializer(source="classmeeting_set", many=True, read_only=True)

	class Meta:
		model = Section
		fields = (
			"id",
			"class_number",
			"class_type",
			"class_section",
			"track",
			"seat_reservations",
			"capacity",
			"status",
			"enrollment",
			"class_meetings",
		)


class CourseSerializer(serializers.ModelSerializer):
	# TODO: this SectionSerializer isn't linked up properly (it should have
	# source="section_set") but we don't use the section data so I'm not fixing it yet
	sections = SectionSerializer(many=True, read_only=True)
	department_code = serializers.CharField(source="department.code", read_only=True)
	instructors = serializers.StringRelatedField(many=True, read_only=True)

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
			"quality_of_course",
			"instructors",
		)


# Calendar (temporary serializer)
class CalendarClassMeetingSerializer(serializers.ModelSerializer):
	start_time = serializers.TimeField()
	end_time = serializers.TimeField()

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
	class_meetings = CalendarClassMeetingSerializer(source="classmeeting_set", many=True, read_only=True)

	class Meta:
		model = Section
		fields = (
			"class_number",
			"class_section",
			"class_type",
			"class_meetings",
		)


class CalendarEventSerializer(serializers.ModelSerializer):
	calendar = serializers.IntegerField(source="calendar_configuration.id", read_only=True)
	course = CourseSerializer(read_only=True)
	section = SectionSerializer(read_only=True)

	class Meta:
		model = CalendarEvent
		fields = [
			"id",
			"calendar",
			"course",
			"section",
			"start_time",
			"end_time",
			"start_column_index",
			"is_active",
			"needs_choice",
			"is_chosen",
		]


class CalendarConfigurationSerializer(serializers.ModelSerializer):
	calendar_events = CalendarEventSerializer(many=True, read_only=True)

	class Meta:
		model = CalendarConfiguration
		fields = ["id", "user", "name", "term", "calendar_events"]
		read_only_fields = ["id", "user"]
