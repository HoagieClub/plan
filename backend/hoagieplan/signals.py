from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Course
from .documents import CourseDocument


@receiver(post_save, sender=Course)
def update_document(sender, **kwargs):
    instance = kwargs["instance"]
    CourseDocument().update(instance)


@receiver(post_delete, sender=Course)
def delete_document(sender, **kwargs):
    instance = kwargs["instance"]
    CourseDocument().delete(instance, ignore=404)
