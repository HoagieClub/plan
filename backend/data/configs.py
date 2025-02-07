import os
import requests
import base64
from dotenv import load_dotenv

STUDENT_APP_BASE_URL = "https://api.princeton.edu:443/student-app"
ACTIVE_DIRECTORY_BASE_URL = "https://api.princeton.edu:443/active-directory/1.0.5"

load_dotenv()


class Configs:
    def __init__(self):
        self.CONSUMER_KEY = os.environ.get("CONSUMER_KEY")
        self.CONSUMER_SECRET = os.environ.get("CONSUMER_SECRET")
        self.COURSES_TERMS = "/courses/terms"
        self.COURSES_COURSES = "/courses/courses"
        self.COURSES_SEATS = "/courses/seats"
        self.COURSES_RESSEATS = "/courses/resseats"
        self.COURSES_DETAILS = "/courses/details"
        self.USERS_FULL = "/users/full"
        self.DEPARTMENT = "/departments"
        self.REFRESH_TOKEN_URL = "https://api.princeton.edu:443/token"
        self._refreshToken(grant_type="client_credentials")

    def get_base_url(self, endpoint):
        return (
            ACTIVE_DIRECTORY_BASE_URL if "users/" in endpoint else STUDENT_APP_BASE_URL
        )

    def _refreshToken(self, **kwargs):
        headers = {
            "Authorization": "Basic "
            + base64.b64encode(
                f"{self.CONSUMER_KEY}:{self.CONSUMER_SECRET}".encode("utf-8")
            ).decode("utf-8")
        }
        with requests.post(
            self.REFRESH_TOKEN_URL, data=kwargs, headers=headers
        ) as resp:
            response = resp.json()
            self.ACCESS_TOKEN = response["access_token"]
