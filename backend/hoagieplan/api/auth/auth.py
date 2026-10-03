from datetime import datetime
from hoagieplan.models import CustomUser
import jwt
from rest_framework import authentication, exceptions
from django.conf import settings
import requests
from jwt.algorithms import RSAAlgorithm
from django.core.cache import cache


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
				if user_inst.net_id != email_prefix or user_inst.username != email_prefix:
					user_inst.net_id = email_prefix
					user_inst.username = email_prefix
					user_inst.save(update_fields=["net_id", "username"])

			return (user_inst, payload)

		except jwt.ExpiredSignatureError:
			raise exceptions.AuthenticationFailed("Token has expired") from None
		except jwt.InvalidTokenError:
			raise exceptions.AuthenticationFailed("Invalid token") from None
		except Exception:
			raise exceptions.AuthenticationFailed("Authentication failed") from None

	def verify_token(self, token):
		# Get Auth0 public keys (cached to avoid HTTP round-trip on every request)
		jwks_url = f"https://{settings.AUTH0_DOMAIN}/.well-known/jwks.json"
		jwks = cache.get("auth0_jwks")
		if jwks is None:
			jwks = requests.get(jwks_url).json()
			cache.set("auth0_jwks", jwks, timeout=3600)

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
