import csv
import orjson as oj
import os
import sys
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from tqdm import tqdm
from webdriver_manager.chrome import ChromeDriverManager

sys.path.append(str(Path("../").resolve()))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()
from hoagieplan.models import Course

load_dotenv()

EVALS_CSV = "./evals.csv"
EVALS_URL = "https://registrarapps.princeton.edu/course-evaluation"
NUM_WORKERS = 16
MAX_RETRIES = 3

csv_lock = threading.Lock()


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
    scraper.get(EVALS_URL)
    scraper.find_element(By.ID, "username").send_keys(os.getenv("CAS_USERNAME"))
    scraper.find_element(By.ID, "password").send_keys(os.getenv("CAS_PASSWORD"))
    login_button = WebDriverWait(scraper, 10).until(
        EC.element_to_be_clickable((By.ID, "submitBtn"))
    )
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
    _scores = scrape_scores(webpage)
    _comments = scrape_comments(webpage)
    fieldnames = ["course_id", "term", "scores", "comments"]

    # Ensure scores and comments are properly formatted as JSON strings
    scores = oj.dumps(_scores).decode("utf-8").replace("\\/", "/")[1:-1]
    comments = oj.dumps(_comments).decode("utf-8").replace("\\/", "/")[1:-1]

    with csv_lock:
        file_exists = os.path.isfile(EVALS_CSV)
        with open(EVALS_CSV, "a", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames)
            if not file_exists:
                writer.writeheader()
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
    for attempt in range(MAX_RETRIES):
        scraper.get(f"{EVALS_URL}?courseinfo={course_id}&terminfo={term}")
        content: str = scraper.page_source
        webpage = BeautifulSoup(content, "html.parser")
        if webpage.title and webpage.title.string == "Course Evaluation Results":
            save(content, term, course_id)
            return
        if attempt < MAX_RETRIES - 1:
            print(f"Attempt {attempt + 1} failed for {course_id} in term {term}. Retrying...")
            time.sleep(2 ** attempt)
    print(f"Failed to scrape {course_id} for term {term} after {MAX_RETRIES} attempts")


_driver_path: str | None = None


def create_driver() -> webdriver.Chrome:
    """Create a headless Chrome WebDriver instance."""
    global _driver_path
    if _driver_path is None:
        _driver_path = ChromeDriverManager().install()
    options: Options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    service: Service = Service(_driver_path)
    return webdriver.Chrome(service=service, options=options)


def create_worker_driver(cookies: list[dict]) -> webdriver.Chrome:
    """Create a new browser and inject session cookies from the authenticated browser."""
    driver = create_driver()
    driver.get(EVALS_URL)
    for cookie in cookies:
        try:
            driver.add_cookie(cookie)
        except Exception:
            pass
    return driver


def worker(worker_id: int, driver: webdriver.Chrome, course_chunk: list[tuple[str, str]], pbar: tqdm) -> None:
    """Worker function that scrapes evals for course_chunk with driver."""
    print(f"Worker {worker_id} starting with {len(course_chunk)} courses", flush=True)
    try:
        for i, (term, course_id) in enumerate(course_chunk):
            try:
                scrape(driver, term, course_id)
            except Exception as e:
                print(f"Error scraping {course_id} for term {term}: {e}")
            pbar.update(1)
    finally:
        print(f"Worker {worker_id} finished, quitting driver", flush=True)
        driver.quit()


# Usage: python fetch_evals.py
# Note: Need to do Duo push authentication when the script is ran.
def main() -> None:

    start_time: float = time.time()
    auth_driver = create_driver()
    authenticate(auth_driver)

    # Extract cookies to share with worker browsers
    cookies = auth_driver.get_cookies()

    # Create worker browsers with shared cookies
    print(f"Creating {NUM_WORKERS} workers in parallel...", flush=True)
    t = time.time()
    with ThreadPoolExecutor(max_workers=NUM_WORKERS) as pool:
        workers = list(pool.map(lambda _: create_worker_driver(cookies), range(NUM_WORKERS)))
    print(f"All {NUM_WORKERS} workers created in {time.time() - t:.1f}s", flush=True)
    auth_driver.quit()

    # Split courses into chunks for each worker
    courses: list[tuple[str, str]] = fetch_courses()
    total_courses: int = len(courses)

    chunk_size = (total_courses + NUM_WORKERS - 1) // NUM_WORKERS
    chunks = [courses[i:i + chunk_size] for i in range(0, total_courses, chunk_size)]

    print(f"Scraping with {len(chunks)} workers.")
    with tqdm(total=total_courses, desc="Scraping Course Evaluations...", ncols=100) as pbar:
        with ThreadPoolExecutor(max_workers=len(chunks)) as executor:
            futures = []
            for i in range(len(chunks)):
                f = executor.submit(worker, i + 1, workers[i], chunks[i], pbar)
                futures.append(f)
            for future in as_completed(futures):
                future.result()

    end_time: float = time.time()
    elapsed_time: float = end_time - start_time
    print(f"Completed in {elapsed_time:.2f} seconds")


if __name__ == "__main__":
    main()
