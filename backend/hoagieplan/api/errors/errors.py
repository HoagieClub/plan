class UserProfileNotFoundError(Exception):
    """Exception raised when the user profile is not found or cannot be updated from an external source.
    """

    def __init__(self, message: str, user_id: str = None):
        super().__init__(message)
        self.user_id = user_id
        self.message = message

    def __str__(self):
        return f"UserProfileNotFoundError: {self.message} for user_id={self.user_id}"


class UserProfileUpdateError(Exception):
    """Exception raised for errors that occur when attempting to update the user profile in the database.
    """

    def __init__(self, message: str, user_id: str = None, errors: dict = None):
        super().__init__(message)
        self.user_id = user_id
        self.errors = errors
        self.message = message

    def __str__(self):
        error_details = (
            ", ".join(f"{key}: {value}" for key, value in self.errors.items())
            if self.errors
            else "No details"
        )
        return f"UserProfileUpdateError: {self.message} for user_id={self.user_id}. Errors: {error_details}"


class CASAuthenticationException(Exception):
    """Exception raised when there is a failure in the CAS authentication process.
    """

    def __init__(self, message: str, details: str = None):
        super().__init__(message)
        self.details = details
        self.message = message

    def __str__(self):
        return f'CASAuthenticationException: {self.message}. Details: {self.details if self.details else "No additional details provided."}'
