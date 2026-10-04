from dataclasses import dataclass

from todo_api.application.ports import PasswordHasher, UnitOfWorkFactory
from todo_api.domain.entities import User
from todo_api.domain.errors import UserAlreadyExistsError


@dataclass(frozen=True, slots=True)
class CreateUserInput:
    username: str
    email: str
    password: str


class CreateUser:
    def __init__(self, *, uow: UnitOfWorkFactory, hasher: PasswordHasher) -> None:
        self._uow = uow
        self._hasher = hasher

    def execute(self, data: CreateUserInput) -> None:
        with self._uow() as uow:
            if uow.users.get_by_username(data.username) is not None:
                raise UserAlreadyExistsError("Username already registered")
            if uow.users.get_by_email(data.email) is not None:
                raise UserAlreadyExistsError("Email already registered")

            user = User(
                id=None,
                username=data.username,
                email=data.email,
                password_hash=self._hasher.hash(data.password),
            )
            uow.users.add(user)
            uow.commit()
