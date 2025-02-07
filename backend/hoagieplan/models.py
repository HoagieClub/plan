from django.contrib.auth.models import AbstractUser
from django.db import models

# ----------------------------------------------------------------------#

# Choices for degree_type
DEGREE_TYPE_CHOICES = (
    ("AB", "Bachelor of Arts"),
    ("BSE", "Bachelor of Science in Engineering"),
)

# Mapping from semester number to semester name
TIMELINE_CHOICES = (
    (1, "freshman fall"),
    (2, "freshman spring"),
    (3, "sophomore fall"),
    (4, "sophomore spring"),
    (5, "junior fall"),
    (6, "junior spring"),
    (7, "senior fall"),
    (8, "senior spring"),
)

# ----------------------------------------------------------------------#


class Department(models.Model):
    code = models.CharField(max_length=4, unique=True, db_index=True, null=True)
    name = models.CharField(max_length=100, db_index=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "Department"


class Degree(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=10, db_index=True, null=True)
    code = models.CharField(max_length=10, db_index=True, null=True)
    description = models.TextField(db_index=True, null=True)
    urls = models.JSONField(db_index=True, null=True)
    max_counted = models.IntegerField(db_index=True, null=True)
    min_needed = models.IntegerField(db_index=True, default=1)

    class Meta:
        db_table = "Degree"


class Major(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=150, db_index=True, null=True)
    code = models.CharField(max_length=10, db_index=True, null=True)
    degree = models.ManyToManyField("Degree")
    description = models.TextField(db_index=True, null=True)
    urls = models.JSONField(db_index=True, null=True)
    max_counted = models.IntegerField(db_index=True, null=True)
    min_needed = models.IntegerField(db_index=True, default=1)

    class Meta:
        db_table = "Major"


class Minor(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=150, db_index=True, null=True)
    code = models.CharField(max_length=10, db_index=True, null=True)
    description = models.TextField(db_index=True, null=True)
    excluded_majors = models.ManyToManyField("Major")
    excluded_minors = models.ManyToManyField("Minor")
    urls = models.JSONField(db_index=True, null=True)
    apply_by_semester = models.IntegerField(default=6)
    max_counted = models.IntegerField(db_index=True, null=True)
    min_needed = models.IntegerField(db_index=True, default=1)

    class Meta:
        db_table = "Minor"


class Certificate(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=150, db_index=True, null=True)
    code = models.CharField(max_length=10, db_index=True, null=True)
    description = models.TextField(db_index=True, null=True)
    excluded_majors = models.ManyToManyField("Major")
    urls = models.JSONField(db_index=True, null=True)
    apply_by_semester = models.IntegerField(default=8)
    max_counted = models.IntegerField(db_index=True, null=True)
    min_needed = models.IntegerField(db_index=True, default=1)
    # to help with phasing out certificates
    # filter out for new users, keep for existing users pursuing it
    active_until = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "Certificate"


# ----------------------------------------------------------------------#


class Instructor(models.Model):
    emplid = models.CharField(max_length=50, unique=True, db_index=True, null=True)
    first_name = models.CharField(max_length=100, db_index=True, null=True)
    last_name = models.CharField(max_length=100, db_index=True, null=True)
    full_name = models.CharField(max_length=255, null=True)

    class Meta:
        db_table = "Instructor"

    def __str__(self):
        return self.full_name


class AcademicTerm(models.Model):
    term_code = models.CharField(max_length=10, db_index=True, unique=True, null=True)
    suffix = models.CharField(max_length=10, db_index=True)  # e.g., "F2023"
    start_date = models.DateField(null=True)
    end_date = models.DateField(null=True)

    class Meta:
        db_table = "AcademicTerm"

    def __str__(self):
        return self.term_code


class Course(models.Model):
    department = models.ForeignKey(Department, on_delete=models.CASCADE, null=True)
    guid = models.CharField(max_length=50, db_index=True, null=True)
    course_id = models.CharField(max_length=15, db_index=True, null=True)
    catalog_number = models.CharField(max_length=10, db_index=True, null=True)
    title = models.CharField(max_length=150, db_index=True, null=True)
    crosslistings = models.CharField(max_length=150, db_index=True, null=True)
    description = models.TextField(db_index=True, null=True)
    drop_consent = models.CharField(max_length=1, db_index=True, blank=True, null=True)
    add_consent = models.CharField(max_length=1, db_index=True, blank=True, null=True)
    web_address = models.URLField(max_length=255, db_index=True, blank=True, null=True)
    transcript_title = models.CharField(max_length=150, blank=True, null=True)
    long_title = models.CharField(max_length=250, db_index=True, blank=True, null=True)
    distribution_area_long = models.CharField(max_length=150, db_index=True, blank=True, null=True)
    distribution_area_short = models.CharField(max_length=10, db_index=True, blank=True, null=True)
    reading_writing_assignment = models.TextField(blank=True, db_index=True, null=True)
    grading_basis = models.CharField(max_length=5, blank=True, db_index=True, null=True)
    reading_list = models.TextField(blank=True, db_index=True, null=True)

    class Meta:
        db_table = "Course"

    def __str__(self):
        return self.title


class Section(models.Model):
    CLASS_TYPE_CHOICES = [
        ("Seminar", "Seminar"),
        ("Lecture", "Lecture"),
        ("Precept", "Precept"),
        ("Unknown", "Unknown"),
        ("Class", "Class"),
        ("Studio", "Studio"),
        ("Drill", "Drill"),
        ("Lab", "Lab"),
        ("Ear training", "Ear training"),
    ]

    course = models.ForeignKey(Course, on_delete=models.CASCADE, null=True)
    class_number = models.IntegerField(db_index=True, null=True)
    class_type = models.CharField(max_length=50, choices=CLASS_TYPE_CHOICES, db_index=True, default="")
    class_section = models.CharField(max_length=10, db_index=True, null=True)
    term = models.ForeignKey(AcademicTerm, on_delete=models.CASCADE, db_index=True, null=True)
    track = models.CharField(max_length=5, db_index=True, null=True)
    seat_reservations = models.CharField(max_length=1, db_index=True, null=True)
    instructor = models.ForeignKey(Instructor, on_delete=models.SET_NULL, null=True)
    capacity = models.IntegerField(db_index=True, null=True)
    status = models.CharField(max_length=10, db_index=True, null=True)
    enrollment = models.IntegerField(db_index=True, default=0)

    class Meta:
        db_table = "Section"

    def __str__(self):
        section_title = self.course.title if self.course else "None"
        term_code = self.term.term_code if self.term else "None"
        return f"{section_title} - {term_code}"


class ClassMeeting(models.Model):
    section = models.ForeignKey(Section, on_delete=models.CASCADE, null=True)
    meeting_number = models.PositiveIntegerField(db_index=True, null=True)
    start_time = models.TimeField(db_index=True, null=True)
    end_time = models.TimeField(db_index=True, null=True)
    room = models.CharField(max_length=50, db_index=True, null=True)
    days = models.CharField(max_length=20, db_index=True, null=True)
    building_name = models.CharField(max_length=255, db_index=True, null=True)

    class Meta:
        db_table = "ClassMeeting"

    def __str__(self):
        return f"{self.section} - {self.start_time} to {self.end_time}"


class ClassYearEnrollment(models.Model):
    section = models.ForeignKey(Section, on_delete=models.CASCADE, db_index=True, null=True)
    class_year = models.IntegerField(null=True)
    enrl_seats = models.IntegerField(null=True)

    class Meta:
        db_table = "ClassYearEnrollment"


# ----------------------------------------------------------------------#


class Requirement(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=150, db_index=True, null=True)
    max_counted = models.IntegerField(default=1, db_index=True)
    min_needed = models.IntegerField(default=1, db_index=True)
    explanation = models.TextField(db_index=True, null=True)
    double_counting_allowed = models.BooleanField(db_index=True, null=True)
    max_common_with_major = models.IntegerField(db_index=True, default=0)
    pdfs_allowed = models.IntegerField(db_index=True, default=0)
    min_grade = models.FloatField(db_index=True, default=0.0)
    completed_by_semester = models.IntegerField(db_index=True, default=8)
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        related_name="req_list",
        null=True,
    )
    degree = models.ForeignKey(
        "Degree",
        on_delete=models.CASCADE,
        related_name="req_list",
        null=True,
    )
    major = models.ForeignKey(
        "Major",
        on_delete=models.CASCADE,
        related_name="req_list",
        null=True,
    )
    minor = models.ForeignKey(
        "Minor",
        on_delete=models.CASCADE,
        related_name="req_list",
        null=True,
    )
    certificate = models.ForeignKey(
        "Certificate",
        on_delete=models.CASCADE,
        related_name="req_list",
        null=True,
    )
    course_list = models.ManyToManyField("Course", db_index=True, related_name="satisfied_by")
    dept_list = models.JSONField(db_index=True, null=True)
    excluded_course_list = models.ManyToManyField("Course", related_name="not_satisfied_by")
    dist_req = models.JSONField(db_index=True, null=True)
    num_courses = models.IntegerField(db_index=True, null=True)

    class Meta:
        db_table = "Requirement"


# --------------------------------------------------------------------------------------#


class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ("admin", "Administrator"),
        ("student", "Student"),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="student")
    major = models.ForeignKey(Major, on_delete=models.CASCADE, null=True)
    minors = models.ManyToManyField(Minor)
    certificates = models.ManyToManyField(Certificate)
    requirements = models.ManyToManyField(
        "Requirement",
        related_name="users",
        blank=True,
    )  # for manually marked requirements
    req_dict = models.JSONField(null=True)
    
    # TODO: This field is deprecated (Django's default username serves the same purpose)
    net_id = models.CharField(max_length=20, unique=True, null=True, blank=True)
    # TODO: Refactor backend code to use username instead of net_id

    email = models.EmailField(max_length=100, null=True, blank=True)
    first_name = models.CharField(max_length=100, null=True, blank=True)
    last_name = models.CharField(max_length=100, null=True, blank=True)
    class_year = models.IntegerField(null=True, blank=True)
    seen_tutorial = models.BooleanField(default=False, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "CustomUser"
        
        # Hacky way to prevent alias bugs
        # TODO: Find a more controlled/deterministic way to identify username/NetID from Auth0
        constraints = [
            models.UniqueConstraint(
                fields=["email", "username"],
                name="unique_email_username_combination"
            )
        ]


class UserCourses(models.Model):
    STATUS_CHOICES = (
        ("planned", "Planned"),
        ("in-progress", "In Progress"),
        ("completed", "Completed"),
    )

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, db_index=True, null=True)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, db_index=True, null=True)
    semester = models.IntegerField(choices=TIMELINE_CHOICES, db_index=True, null=True)
    requirement = models.ForeignKey(Requirement, on_delete=models.CASCADE, db_index=True, null=True)

    class Meta:
        db_table = "UserCourses"


class CalendarConfiguration(models.Model):
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="calendar_configurations",
        null=True,
        blank=True,
        db_index=True,
    )
    name = models.CharField(max_length=100, db_index=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "name")
        db_table = "CalendarConfiguration"

    def __str__(self):
        return f"{self.user.username}: {self.name}"


class SemesterConfiguration(models.Model):
    calendar_configuration = models.ForeignKey(
        CalendarConfiguration,
        on_delete=models.CASCADE,
        related_name="semester_configurations",
        db_index=True,
    )
    term = models.ForeignKey(
        AcademicTerm,
        on_delete=models.CASCADE,
        related_name="semester_configurations",
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("calendar_configuration", "term")
        db_table = "SemesterConfiguration"

    def __str__(self):
        return f"{self.calendar_configuration}: {self.term.suffix}"


class ScheduleSelection(models.Model):
    semester_configuration = models.ForeignKey(
        SemesterConfiguration,
        on_delete=models.CASCADE,
        related_name="schedule_selections",
        db_index=True,
    )
    section = models.ForeignKey(Section, on_delete=models.CASCADE, db_index=True)
    index = models.PositiveSmallIntegerField()
    name = models.CharField(max_length=100, db_index=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ScheduleSelection"
        unique_together = ("semester_configuration", "section", "index")


class CourseEvaluations(models.Model):
    course_guid = models.CharField(max_length=15, db_index=True, null=True)
    quality_of_course = models.FloatField(null=True)
    quality_of_lectures = models.FloatField(null=True)
    quality_of_readings = models.FloatField(null=True)
    quality_of_written_assignments = models.FloatField(null=True)
    recommend_to_other_students = models.FloatField(null=True)
    quality_of_language = models.FloatField(null=True)
    quality_of_classes = models.FloatField(null=True)
    quality_of_the_classes = models.FloatField(null=True)
    quality_of_seminar = models.FloatField(null=True)
    quality_of_precepts = models.FloatField(null=True)
    quality_of_laboratories = models.FloatField(null=True)
    quality_of_studios = models.FloatField(null=True)
    quality_of_ear_training = models.FloatField(null=True)
    overall_course_quality_rating = models.FloatField(null=True)
    overall_quality_of_the_course = models.FloatField(null=True)
    interest_in_subject_matter = models.FloatField(null=True)
    overall_quality_of_the_lecture = models.FloatField(null=True)
    papers_and_problem_sets = models.FloatField(null=True)
    readings = models.FloatField(null=True)
    oral_presentation_skills = models.FloatField(null=True)
    workshop_structure = models.FloatField(null=True)
    written_work = models.FloatField(null=True)

    class Meta:
        db_table = "CourseEvaluations"

    def __str__(self):
        return f"Evaluation for {self.course.name} - {self.term.name}"


class CourseComments(models.Model):
    course_guid = models.CharField(max_length=15, db_index=True, null=True)
    comment = models.TextField(null=True)

    class Meta:
        db_table = "CourseComments"

    def __str__(self):
        return f"{self.comment}"


# ----------------------------------------------------------------------#
