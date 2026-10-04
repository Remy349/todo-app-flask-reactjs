class DomainError(Exception):
    """An expected business failure. `code` is stable and part of the API contract."""

    code = "DOMAIN_ERROR"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class NotFoundError(DomainError):
    code = "NOT_FOUND"


class ConflictError(DomainError):
    code = "CONFLICT"


class ValidationError(DomainError):
    code = "VALIDATION_ERROR"


class AuthenticationError(DomainError):
    code = "AUTHENTICATION_ERROR"


class TaskNotFoundError(NotFoundError):
    code = "TASK_NOT_FOUND"


class TagNotFoundError(NotFoundError):
    code = "TAG_NOT_FOUND"


class UserNotFoundError(NotFoundError):
    code = "USER_NOT_FOUND"


class UserAlreadyExistsError(ConflictError):
    code = "USER_ALREADY_EXISTS"


class TagAlreadyExistsError(ConflictError):
    code = "TAG_ALREADY_EXISTS"


class InvalidCredentialsError(AuthenticationError):
    code = "INVALID_CREDENTIALS"
