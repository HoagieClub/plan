import csv
import orjson as oj
import os
import sys
import time
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from tqdm import tqdm
from webdriver_manager.chrome import ChromeDriverManager

sys.path.append(str(Path("../").resolve()))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()
from hoagieplan.models import Course

load_dotenv()

EVALS_CSV = "./evals.csv"


def fetch_courses() -> list[tuple[str, str]]:
    """Fetch unique course IDs and academic terms from the Course model.

    :return: A list of tuples containing course_id and term.
    """
    courses: list[str] = Course.objects.all().values_list("guid", flat=True)
    course_data: list[tuple[str, str]] = [(course[:4], course[4:]) for course in courses]
    return list(set(course_data))


def authenticate(scraper: webdriver.Remote) -> None:
    """Authenticate the scraper into the course evaluation portal.

    :param scraper: Selenium WebDriver instance.
    """
    login_url: str = "https://registrarapps.princeton.edu/course-evaluation"
    scraper.get(login_url)
    scraper.find_element(By.ID, "username").send_keys(os.getenv("CAS_USERNAME"))
    scraper.find_element(By.ID, "password").send_keys(os.getenv("CAS_PASSWORD"))
    login_button = scraper.find_element(By.CSS_SELECTOR, "button.mdc-button.mdc-button--raised.btn.btn-primary")
    login_button.click()

    # Wait for login to complete. Need to do Duo push authentication.
    login_buffer: int = 10
    for remaining in range(login_buffer, 0, -1):
        sys.stdout.write("\r")
        sys.stdout.write("Waiting for login to complete: {:2d} seconds remaining.\n".format(remaining))
        sys.stdout.flush()
        time.sleep(1)

    # Wait for authentication to complete
    time.sleep(2)

    # Click the "Trust Browser" button
    if scraper.title != "Course Evaluation Results":
        trust_button_button = scraper.find_element(By.ID, "trust-browser-button")
        trust_button_button.click()
        print("Trust browser button clicked. Waiting for login to complete...")

    time.sleep(2)
    sys.stdout.write("\rLogin attempt complete.                            \n")


def scrape_scores(soup: BeautifulSoup) -> dict[str, float]:
    """Extract scores from a BeautifulSoup object.

    :param soup: BeautifulSoup object containing the HTML content.
    :return: Dictionary of scores.
    """
    scores: dict[str, float] = {}
    data_bar_chart = soup.find("div", class_="data-bar-chart")
    if data_bar_chart:
        scores_data: list[dict[str, str]] = oj.loads(data_bar_chart["data-bar-chart"])
        for item in scores_data:
            scores[item["key"]] = float(item["value"])
    return scores


def scrape_comments(soup: BeautifulSoup) -> list[str]:
    """Extract comments from a BeautifulSoup object.

    :param soup: BeautifulSoup object containing the HTML content.
    :return: List of comments.
    """
    return [comment.get_text(strip=True) for comment in soup.find_all("div", class_="comment")]


def save(data: str, term: str, course_id: str) -> None:
    """Append data to evals.csv file or create it if it doesn't exist.

    :param data: HTML content as a string.
    :param term: Term identifier.
    :param course_id: Course identifier.
    """
    webpage = BeautifulSoup(data, "html.parser")
    if webpage.title and webpage.title.string != "Course Evaluation Results":
        print(f"Invalid session cookie or page structure changed for course ID {course_id} in term {term}")
        return

    _scores = scrape_scores(webpage)
    _comments = scrape_comments(webpage)
    fieldnames = ["course_id", "term", "scores", "comments"]

    # Use a consistent file name; check if it needs a header row.
    evals_csv = "./evals.csv"
    file_exists = os.path.isfile(evals_csv)  # Check if file already exists

    with open(evals_csv, "a", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames)
        if not file_exists:  # Write header only if the file does not exist
            writer.writeheader()

        # Ensure scores and comments are properly formatted as JSON strings
        scores = oj.dumps(_scores).decode("utf-8").replace("\\/", "/")[1:-1]
        comments = oj.dumps(_comments).decode("utf-8").replace("\\/", "/")[1:-1]
        writer.writerow(
            {
                "course_id": course_id,
                "term": term,
                "scores": scores,
                "comments": comments,
            }
        )


def scrape(scraper: webdriver.Remote, term: str, course_id: str) -> None:
    """Scrape course evaluation data for a specific term and course ID.

    :param term: Term identifier.
    :param course_id: Course identifier.
    """
    scraper.get(f"https://registrarapps.princeton.edu/course-evaluation?courseinfo={course_id}&terminfo={term}")
    content: str = scraper.page_source
    save(content, term, course_id)


# Usage: python fetch_evals.py
# Need to go Duo push authentication when the script is ran.
def main() -> None:
    # Can multithread or parallelize this in the future to make it faster
    options: Options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    service: Service = Service(ChromeDriverManager().install())
    service.start()
    scraper: webdriver.Remote = webdriver.Chrome(service = service, options=options)
    authenticate(scraper)

    start_time: float = time.time()

    courses: list[tuple[str, str]] = fetch_courses()
    total_courses: int = len(courses)

    with tqdm(total=total_courses, desc="Scraping Course Evaluations...", ncols=100) as pbar:
        for term, course_id in courses:
            try:
                scrape(scraper, term, course_id)
            except Exception as e:
                print(f"Error scraping {course_id} for term {term}: {e}")
            pbar.update(1)

    scraper.quit()
    end_time: float = time.time()
    elapsed_time: float = end_time - start_time
    print(f"Completed in {elapsed_time:.2f} seconds")


if __name__ == "__main__":
    main()
