# Generated by Django 4.2.7 on 2023-12-11 08:48

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('compass', '0008_remove_customuser_manually_settled_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='usercourses',
            old_name='settled',
            new_name='requirement',
        ),
    ]