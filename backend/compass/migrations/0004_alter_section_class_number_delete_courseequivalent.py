# Generated by Django 4.2.11 on 2024-04-05 07:34

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('compass', '0003_customuser_requirements'),
    ]

    operations = [
        migrations.AlterField(
            model_name='section',
            name='class_number',
            field=models.IntegerField(db_index=True, null=True),
        ),
        migrations.DeleteModel(
            name='CourseEquivalent',
        ),
    ]