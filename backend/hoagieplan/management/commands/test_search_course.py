from django.core.management.base import BaseCommand
from backend.hoagieplan.tests import search_courses_test

class Command(BaseCommand):
    """Command to run the course search testing script."""

    help = "Run the course search testing script"

    def handle(self, *args, **kwargs):
        """Handle the command to run the course search testing script."""
        search_courses_test.main()