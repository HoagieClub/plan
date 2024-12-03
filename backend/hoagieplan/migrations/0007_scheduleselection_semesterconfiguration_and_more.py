# Generated by Django 4.2.13 on 2024-08-30 18:51

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("hoagieplan", "0006_calendarconfiguration_calendarselection_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="ScheduleSelection",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("index", models.PositiveSmallIntegerField()),
                ("name", models.CharField(blank=True, db_index=True, max_length=100)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("section", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="hoagieplan.section")),
            ],
            options={
                "db_table": "ScheduleSelection",
            },
        ),
        migrations.CreateModel(
            name="SemesterConfiguration",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "SemesterConfiguration",
            },
        ),
        migrations.AlterUniqueTogether(
            name="calendarselection",
            unique_together=None,
        ),
        migrations.RemoveField(
            model_name="calendarselection",
            name="configuration",
        ),
        migrations.RemoveField(
            model_name="calendarselection",
            name="section",
        ),
        migrations.AlterModelOptions(
            name="calendarconfiguration",
            options={},
        ),
        migrations.AlterUniqueTogether(
            name="calendarconfiguration",
            unique_together=set(),
        ),
        migrations.AlterField(
            model_name="calendarconfiguration",
            name="name",
            field=models.CharField(blank=True, db_index=True, max_length=100),
        ),
        migrations.AlterUniqueTogether(
            name="calendarconfiguration",
            unique_together={("user", "name")},
        ),
        migrations.DeleteModel(
            name="CalendarFilter",
        ),
        migrations.DeleteModel(
            name="CalendarSelection",
        ),
        migrations.AddField(
            model_name="semesterconfiguration",
            name="calendar_configuration",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="semester_configurations",
                to="hoagieplan.calendarconfiguration",
            ),
        ),
        migrations.AddField(
            model_name="semesterconfiguration",
            name="term",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="semester_configurations",
                to="hoagieplan.academicterm",
            ),
        ),
        migrations.AddField(
            model_name="scheduleselection",
            name="semester_configuration",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="schedule_selections",
                to="hoagieplan.semesterconfiguration",
            ),
        ),
        migrations.RemoveField(
            model_name="calendarconfiguration",
            name="index",
        ),
        migrations.RemoveField(
            model_name="calendarconfiguration",
            name="term",
        ),
        migrations.AlterUniqueTogether(
            name="semesterconfiguration",
            unique_together={("calendar_configuration", "term")},
        ),
        migrations.AlterUniqueTogether(
            name="scheduleselection",
            unique_together={("semester_configuration", "section", "index")},
        ),
    ]
