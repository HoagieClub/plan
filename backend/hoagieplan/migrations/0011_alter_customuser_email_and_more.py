# Generated by Django 5.1.1 on 2024-12-02 18:01

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
        ('hoagieplan', '0010_alter_customuser_seen_tutorial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customuser',
            name='email',
            field=models.EmailField(blank=True, max_length=100, null=True),
        ),
        migrations.AddConstraint(
            model_name='customuser',
            constraint=models.UniqueConstraint(fields=('email', 'username'), name='unique_email_username_combination'),
        ),
    ]
