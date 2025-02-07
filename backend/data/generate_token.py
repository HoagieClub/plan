import base64
import os


def generate_encoded_token(consumer_key, consumer_secret):
    """Generate the encoded token for API authentication using the given consumer key and consumer secret.
    """
    token_string = f"{consumer_key}:{consumer_secret}"
    encoded_token = base64.b64encode(token_string.encode()).decode()
    return encoded_token


if __name__ == "__main__":
    consumer_key = os.environ.get("CONSUMER_KEY")
    consumer_secret = os.environ.get("CONSUMER_SECRET")
    encoded_token = generate_encoded_token(consumer_key, consumer_secret)
    # For security reasons, we will not print the encoded token here.
    # Future developers, add a print statement to reveal the token locally.
