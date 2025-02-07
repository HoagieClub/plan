from typing import Dict, Any
import requests
from configs import Configs


class ReqLib:
    def __init__(self):
        self.configs = Configs()

    def _make_request(self, endpoint: str, **kwargs: Any) -> requests.Response:
        base_url = self.configs.get_base_url(endpoint)
        url = f"{base_url}{endpoint}"
        headers = {
            "Authorization": f"Bearer {self.configs.ACCESS_TOKEN}",
            "Accept": "application/json",
        }
        attempts = 0
        max_attempts = 5

        while attempts < max_attempts:
            try:
                req = requests.get(url, params=kwargs, headers=headers, timeout=20)
                req.raise_for_status()

                return req
            except requests.exceptions.Timeout:
                print(f"req_lib.py: Request timed out. Attempting again... ({attempts + 1}/{max_attempts})")
                attempts += 1
                if attempts == max_attempts:
                    print("req_lib.py: Maximum retry attempts reached. Request failed due to timeout.")
                    break
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 401 and attempts == 0:
                    self.configs._refreshToken(grant_type="client_credentials")
                    attempts += 1
                else:
                    raise
            except requests.exceptions.RequestException as e:
                print(f"An error occurred: {e}")
                break

        return None

    def getJSON(self, endpoint: str, **kwargs: Any) -> Dict:
        req = self._make_request(endpoint, **kwargs)
        if req is not None:
            try:
                req.raise_for_status()
                return req.json()
            except requests.HTTPError:
                print("req_lib.py: HTTPError, {e}")
                pass
            except json.JSONDecodeError:
                print("req_lib.py: JSONDecodeError")
                pass
        else:
            return None
