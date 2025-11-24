from datetime import datetime
from hoagieplan.models import CustomUser
import jwt
from rest_framework import authentication, exceptions
from django.conf import settings
import requests
from jwt.algorithms import RSAAlgorithm

class Auth0JWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return None

        if not auth_header.startswith("Bearer "):
            raise exceptions.AuthenticationFailed("Invalid token header")

        token = auth_header.split(" ")[1]
        try:
            # Verify and decode the token
            payload = self.verify_token(token)

            # Get or create user based on Auth0 sub (subject)
            auth0_id = payload["sub"]

            net_id = auth0_id.split("|")[2].split("@")[0]
            first_name = payload.get("https://hoagie.io/name", "").split(" ")[0]
            last_name = payload.get("https://hoagie.io/name", "").split(" ")[-1]
            email = auth0_id.split("|")[2]

            user_inst, created = CustomUser.objects.get_or_create(
                email=email,
                defaults={
                    "role": "student",
                    "net_id": "",
                    "first_name": "",
                    "last_name": "",
                    "class_year": datetime.now().year + 1,
                },
            )
            if created:
                user_inst.first_name = first_name
                user_inst.last_name = last_name
                user_inst.net_id = net_id
                user_inst.username = net_id
                user_inst.save()
            else:
                # Necessary for the CAS to Auth0 migration, changes net_id to alias
                email_prefix = email.split("@")[0]
                user_inst.net_id = email_prefix
                user_inst.username = email_prefix
                user_inst.save()

            return (user_inst, payload)

        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed("Token has expired")
        except jwt.InvalidTokenError as e:
            raise exceptions.AuthenticationFailed(f"Invalid token: {str(e)}")
        except Exception as e:
            raise exceptions.AuthenticationFailed(f"Authentication failed: {str(e)}")

    def verify_token(self, token):
        # Get Auth0 public keys
        jwks_url = f"https://{settings.AUTH0_DOMAIN}/.well-known/jwks.json"
        jwks = requests.get(jwks_url).json()

        # Decode token header to get key id
        unverified_header = jwt.get_unverified_header(token)

        # Find the right key
        rsa_key = None
        for key in jwks["keys"]:
            if key["kid"] == unverified_header["kid"]:
                # Convert JWK to PEM format
                rsa_key = RSAAlgorithm.from_jwk(key)
                break

        if rsa_key is None:
            raise exceptions.AuthenticationFailed("Unable to find appropriate key")

        # Verify and decode token
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=settings.AUTH0_ALGORITHMS,
            audience=settings.AUTH0_AUDIENCE,
            issuer=f"https://{settings.AUTH0_DOMAIN}/",
        )

        return payload
