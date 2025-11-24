from django.core.management.base import BaseCommand
from hoagieplan.tests import requirements_test


# To run: python manage.py test_requirements
class Command(BaseCommand):
    """Command to run the testing script for requirements checking."""

    help = "Run the requirement checking testing script"

    def handle(self, *args, **kwargs):
        """Handle the command to run the requirement checking script."""
        requirements_test.main()