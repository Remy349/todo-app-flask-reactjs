from dataclasses import dataclass

from todo_api.application.ports import PasswordHasher, TokenService, UnitOfWorkFactory
from todo_api.domain.errors import InvalidCredentialsError


@dataclass(frozen=True, slots=True)
class SignInInput:
    email: str
    password: str


@dataclass(frozen=True, slots=True)
class SignInOutput:
    token: str


class SignIn:
    def __init__(
        self, *, uow: UnitOfWorkFactory, hasher: PasswordHasher, tokens: TokenService
    ) -> None:
        self._uow = uow
        self._hasher = hasher
        self._tokens = tokens

    def execute(self, data: SignInInput) -> SignInOutput:
        with self._uow() as uow:
            user = uow.users.get_by_email(data.email)
            if user is None or not self._hasher.verify(data.password, user.password_hash):
                raise InvalidCredentialsError("Incorrect credentials")
            assert user.id is not None
            return SignInOutput(token=self._tokens.create(user.id))
