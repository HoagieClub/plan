# Generated by Django 4.2.8 on 2023-12-13 10:21

from django.conf import settings
import django.contrib.auth.models
import django.contrib.auth.validators
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.CreateModel(
            name="CustomUser",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("password", models.CharField(max_length=128, verbose_name="password")),
                (
                    "last_login",
                    models.DateTimeField(blank=True, null=True, verbose_name="last login"),
                ),
                (
                    "is_superuser",
                    models.BooleanField(
                        default=False,
                        help_text="Designates that this user has all permissions without explicitly assigning them.",
                        verbose_name="superuser status",
                    ),
                ),
                (
                    "username",
                    models.CharField(
                        error_messages={"unique": "A user with that username already exists."},
                        help_text="Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.",
                        max_length=150,
                        unique=True,
                        validators=[django.contrib.auth.validators.UnicodeUsernameValidator()],
                        verbose_name="username",
                    ),
                ),
                (
                    "is_staff",
                    models.BooleanField(
                        default=False,
                        help_text="Designates whether the user can log into this admin site.",
                        verbose_name="staff status",
                    ),
                ),
                (
                    "is_active",
                    models.BooleanField(
                        default=True,
                        help_text="Designates whether this user should be treated as active. Unselect this instead of deleting accounts.",
                        verbose_name="active",
                    ),
                ),
                (
                    "date_joined",
                    models.DateTimeField(default=django.utils.timezone.now, verbose_name="date joined"),
                ),
                (
                    "role",
                    models.CharField(
                        choices=[("admin", "Administrator"), ("student", "Student")],
                        default="student",
                        max_length=20,
                    ),
                ),
                (
                    "net_id",
                    models.CharField(blank=True, max_length=20, null=True, unique=True),
                ),
                (
                    "email",
                    models.EmailField(blank=True, max_length=100, null=True, unique=True),
                ),
                ("first_name", models.CharField(blank=True, max_length=100, null=True)),
                ("last_name", models.CharField(blank=True, max_length=100, null=True)),
                ("class_year", models.IntegerField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "groups",
                    models.ManyToManyField(
                        blank=True,
                        help_text="The groups this user belongs to. A user will get all permissions granted to each of their groups.",
                        related_name="user_set",
                        related_query_name="user",
                        to="auth.group",
                        verbose_name="groups",
                    ),
                ),
            ],
            options={
                "db_table": "CustomUser",
            },
            managers=[
                ("objects", django.contrib.auth.models.UserManager()),
            ],
        ),
        migrations.CreateModel(
            name="AcademicTerm",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "term_code",
                    models.CharField(db_index=True, max_length=10, null=True, unique=True),
                ),
                ("suffix", models.CharField(db_index=True, max_length=10)),
                ("start_date", models.DateField(null=True)),
                ("end_date", models.DateField(null=True)),
            ],
            options={
                "db_table": "AcademicTerm",
            },
        ),
        migrations.CreateModel(
            name="Certificate",
            fields=[
                ("id", models.AutoField(primary_key=True, serialize=False)),
                ("name", models.CharField(db_index=True, max_length=150, null=True)),
                ("code", models.CharField(db_index=True, max_length=10, null=True)),
                ("description", models.TextField(db_index=True, null=True)),
                ("urls", models.JSONField(db_index=True, null=True)),
                ("apply_by_semester", models.IntegerField(default=8)),
                ("max_counted", models.IntegerField(db_index=True, null=True)),
                ("min_needed", models.IntegerField(db_index=True, default=1)),
                ("active_until", models.DateField(blank=True, null=True)),
            ],
            options={
                "db_table": "Certificate",
            },
        ),
        migrations.CreateModel(
            name="Course",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("guid", models.CharField(db_index=True, max_length=50, null=True)),
                (
                    "course_id",
                    models.CharField(db_index=True, max_length=15, null=True),
                ),
                (
                    "catalog_number",
                    models.CharField(db_index=True, max_length=10, null=True),
                ),
                ("title", models.CharField(db_index=True, max_length=150, null=True)),
                ("description", models.TextField(db_index=True, null=True)),
                (
                    "drop_consent",
                    models.CharField(blank=True, db_index=True, max_length=1, null=True),
                ),
                (
                    "add_consent",
                    models.CharField(blank=True, db_index=True, max_length=1, null=True),
                ),
                (
                    "web_address",
                    models.URLField(blank=True, db_index=True, max_length=255, null=True),
                ),
                (
                    "transcript_title",
                    models.CharField(blank=True, max_length=150, null=True),
                ),
                (
                    "long_title",
                    models.CharField(blank=True, db_index=True, max_length=250, null=True),
                ),
                (
                    "distribution_area_long",
                    models.CharField(blank=True, db_index=True, max_length=150, null=True),
                ),
                (
                    "distribution_area_short",
                    models.CharField(blank=True, db_index=True, max_length=10, null=True),
                ),
                (
                    "reading_writing_assignment",
                    models.TextField(blank=True, db_index=True, null=True),
                ),
                (
                    "grading_basis",
                    models.CharField(blank=True, db_index=True, max_length=5, null=True),
                ),
                (
                    "reading_list",
                    models.TextField(blank=True, db_index=True, null=True),
                ),
            ],
            options={
                "db_table": "Course",
            },
        ),
        migrations.CreateModel(
            name="CourseComments",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "course_guid",
                    models.CharField(db_index=True, max_length=15, null=True),
                ),
                ("comment", models.TextField(null=True)),
            ],
            options={
                "db_table": "CourseComments",
            },
        ),
        migrations.CreateModel(
            name="CourseEvaluations",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "course_guid",
                    models.CharField(db_index=True, max_length=15, null=True),
                ),
                ("quality_of_course", models.FloatField(null=True)),
                ("quality_of_lectures", models.FloatField(null=True)),
                ("quality_of_readings", models.FloatField(null=True)),
                ("quality_of_written_assignments", models.FloatField(null=True)),
                ("recommend_to_other_students", models.FloatField(null=True)),
                ("quality_of_language", models.FloatField(null=True)),
                ("quality_of_classes", models.FloatField(null=True)),
                ("quality_of_the_classes", models.FloatField(null=True)),
                ("quality_of_seminar", models.FloatField(null=True)),
                ("quality_of_precepts", models.FloatField(null=True)),
                ("quality_of_laboratories", models.FloatField(null=True)),
                ("quality_of_studios", models.FloatField(null=True)),
                ("quality_of_ear_training", models.FloatField(null=True)),
                ("overall_course_quality_rating", models.FloatField(null=True)),
                ("overall_quality_of_the_course", models.FloatField(null=True)),
                ("interest_in_subject_matter", models.FloatField(null=True)),
                ("overall_quality_of_the_lecture", models.FloatField(null=True)),
                ("papers_and_problem_sets", models.FloatField(null=True)),
                ("readings", models.FloatField(null=True)),
                ("oral_presentation_skills", models.FloatField(null=True)),
                ("workshop_structure", models.FloatField(null=True)),
                ("written_work", models.FloatField(null=True)),
            ],
            options={
                "db_table": "CourseEvaluations",
            },
        ),
        migrations.CreateModel(
            name="Degree",
            fields=[
                ("id", models.AutoField(primary_key=True, serialize=False)),
                ("name", models.CharField(db_index=True, max_length=10, null=True)),
                ("code", models.CharField(db_index=True, max_length=10, null=True)),
                ("description", models.TextField(db_index=True, null=True)),
                ("urls", models.JSONField(db_index=True, null=True)),
                ("max_counted", models.IntegerField(db_index=True, null=True)),
                ("min_needed", models.IntegerField(db_index=True, default=1)),
            ],
            options={
                "db_table": "Degree",
            },
        ),
        migrations.CreateModel(
            name="Department",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "code",
                    models.CharField(db_index=True, max_length=4, null=True, unique=True),
                ),
                ("name", models.CharField(db_index=True, max_length=100, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "Department",
            },
        ),
        migrations.CreateModel(
            name="Instructor",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "emplid",
                    models.CharField(db_index=True, max_length=50, null=True, unique=True),
                ),
                (
                    "first_name",
                    models.CharField(db_index=True, max_length=100, null=True),
                ),
                (
                    "last_name",
                    models.CharField(db_index=True, max_length=100, null=True),
                ),
                ("full_name", models.CharField(max_length=255, null=True)),
            ],
            options={
                "db_table": "Instructor",
            },
        ),
        migrations.CreateModel(
            name="Major",
            fields=[
                ("id", models.AutoField(primary_key=True, serialize=False)),
                ("name", models.CharField(db_index=True, max_length=150, null=True)),
                ("code", models.CharField(db_index=True, max_length=10, null=True)),
                ("description", models.TextField(db_index=True, null=True)),
                ("urls", models.JSONField(db_index=True, null=True)),
                ("max_counted", models.IntegerField(db_index=True, null=True)),
                ("min_needed", models.IntegerField(db_index=True, default=1)),
                ("degree", models.ManyToManyField(to="hoagieplan.degree")),
            ],
            options={
                "db_table": "Major",
            },
        ),
        migrations.CreateModel(
            name="Minor",
            fields=[
                ("id", models.AutoField(primary_key=True, serialize=False)),
                ("name", models.CharField(db_index=True, max_length=150, null=True)),
                ("code", models.CharField(db_index=True, max_length=10, null=True)),
                ("description", models.TextField(db_index=True, null=True)),
                ("urls", models.JSONField(db_index=True, null=True)),
                ("apply_by_semester", models.IntegerField(default=6)),
                ("max_counted", models.IntegerField(db_index=True, null=True)),
                ("min_needed", models.IntegerField(db_index=True, default=1)),
                ("excluded_majors", models.ManyToManyField(to="hoagieplan.major")),
                ("excluded_minors", models.ManyToManyField(to="hoagieplan.minor")),
            ],
            options={
                "db_table": "Minor",
            },
        ),
        migrations.CreateModel(
            name="Requirement",
            fields=[
                ("id", models.AutoField(primary_key=True, serialize=False)),
                ("name", models.CharField(db_index=True, max_length=150, null=True)),
                ("max_counted", models.IntegerField(db_index=True, default=1)),
                ("min_needed", models.IntegerField(db_index=True, default=1)),
                ("explanation", models.TextField(db_index=True, null=True)),
                (
                    "double_counting_allowed",
                    models.BooleanField(db_index=True, null=True),
                ),
                (
                    "max_common_with_major",
                    models.IntegerField(db_index=True, default=0),
                ),
                ("pdfs_allowed", models.IntegerField(db_index=True, default=0)),
                ("min_grade", models.FloatField(db_index=True, default=0.0)),
                (
                    "completed_by_semester",
                    models.IntegerField(db_index=True, default=8),
                ),
                ("dept_list", models.JSONField(db_index=True, null=True)),
                ("dist_req", models.JSONField(db_index=True, null=True)),
                ("num_courses", models.IntegerField(db_index=True, null=True)),
                (
                    "certificate",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="req_list",
                        to="hoagieplan.certificate",
                    ),
                ),
                (
                    "course_list",
                    models.ManyToManyField(db_index=True, related_name="satisfied_by", to="hoagieplan.course"),
                ),
                (
                    "degree",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="req_list",
                        to="hoagieplan.degree",
                    ),
                ),
                (
                    "excluded_course_list",
                    models.ManyToManyField(related_name="not_satisfied_by", to="hoagieplan.course"),
                ),
                (
                    "major",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="req_list",
                        to="hoagieplan.major",
                    ),
                ),
                (
                    "minor",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="req_list",
                        to="hoagieplan.minor",
                    ),
                ),
                (
                    "parent",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="req_list",
                        to="hoagieplan.requirement",
                    ),
                ),
            ],
            options={
                "db_table": "Requirement",
            },
        ),
        migrations.CreateModel(
            name="UserCourses",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "semester",
                    models.IntegerField(
                        choices=[
                            (1, "freshman fall"),
                            (2, "freshman spring"),
                            (3, "sophomore fall"),
                            (4, "sophomore spring"),
                            (5, "junior fall"),
                            (6, "junior spring"),
                            (7, "senior fall"),
                            (8, "senior spring"),
                        ],
                        db_index=True,
                        null=True,
                    ),
                ),
                (
                    "course",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        to="hoagieplan.course",
                    ),
                ),
                (
                    "requirement",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        to="hoagieplan.requirement",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "UserCourses",
            },
        ),
        migrations.CreateModel(
            name="Section",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "class_number",
                    models.IntegerField(db_index=True, null=True, unique=True),
                ),
                (
                    "class_type",
                    models.CharField(
                        choices=[
                            ("Seminar", "Seminar"),
                            ("Lecture", "Lecture"),
                            ("Precept", "Precept"),
                            ("Unknown", "Unknown"),
                            ("Class", "Class"),
                            ("Studio", "Studio"),
                            ("Drill", "Drill"),
                            ("Lab", "Lab"),
                            ("Ear training", "Ear training"),
                        ],
                        db_index=True,
                        default="",
                        max_length=50,
                    ),
                ),
                (
                    "class_section",
                    models.CharField(db_index=True, max_length=10, null=True),
                ),
                ("track", models.CharField(db_index=True, max_length=5, null=True)),
                (
                    "seat_reservations",
                    models.CharField(db_index=True, max_length=1, null=True),
                ),
                ("capacity", models.IntegerField(db_index=True, null=True)),
                ("status", models.CharField(db_index=True, max_length=10, null=True)),
                ("enrollment", models.IntegerField(db_index=True, default=0)),
                (
                    "course",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        to="hoagieplan.course",
                    ),
                ),
                (
                    "instructor",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="hoagieplan.instructor",
                    ),
                ),
                (
                    "term",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        to="hoagieplan.academicterm",
                    ),
                ),
            ],
            options={
                "db_table": "Section",
            },
        ),
        migrations.CreateModel(
            name="CourseEquivalent",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "equivalence_type",
                    models.CharField(
                        choices=[
                            ("CROSS_LIST", "Cross-Listing"),
                            ("REQUIREMENT", "Requirement Fulfillment"),
                        ],
                        default="REQUIREMENT",
                        max_length=12,
                    ),
                ),
                (
                    "equivalent_course",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="equivalents",
                        to="hoagieplan.course",
                    ),
                ),
                (
                    "primary_course",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="primary_equivalents",
                        to="hoagieplan.course",
                    ),
                ),
            ],
            options={
                "db_table": "CourseEquivalent",
            },
        ),
        migrations.AddField(
            model_name="course",
            name="department",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to="hoagieplan.department",
            ),
        ),
        migrations.CreateModel(
            name="ClassYearEnrollment",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("class_year", models.IntegerField(null=True)),
                ("enrl_seats", models.IntegerField(null=True)),
                (
                    "section",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        to="hoagieplan.section",
                    ),
                ),
            ],
            options={
                "db_table": "ClassYearEnrollment",
            },
        ),
        migrations.CreateModel(
            name="ClassMeeting",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "meeting_number",
                    models.PositiveIntegerField(db_index=True, null=True),
                ),
                ("start_time", models.TimeField(db_index=True, null=True)),
                ("end_time", models.TimeField(db_index=True, null=True)),
                ("room", models.CharField(db_index=True, max_length=50, null=True)),
                ("days", models.CharField(db_index=True, max_length=20, null=True)),
                (
                    "building_name",
                    models.CharField(db_index=True, max_length=255, null=True),
                ),
                (
                    "section",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        to="hoagieplan.section",
                    ),
                ),
            ],
            options={
                "db_table": "ClassMeeting",
            },
        ),
        migrations.AddField(
            model_name="certificate",
            name="excluded_majors",
            field=models.ManyToManyField(to="hoagieplan.major"),
        ),
        migrations.AddField(
            model_name="customuser",
            name="major",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to="hoagieplan.major",
            ),
        ),
        migrations.AddField(
            model_name="customuser",
            name="minors",
            field=models.ManyToManyField(to="hoagieplan.minor"),
        ),
        migrations.AddField(
            model_name="customuser",
            name="user_permissions",
            field=models.ManyToManyField(
                blank=True,
                help_text="Specific permissions for this user.",
                related_name="user_set",
                related_query_name="user",
                to="auth.permission",
                verbose_name="user permissions",
            ),
        ),
    ]
