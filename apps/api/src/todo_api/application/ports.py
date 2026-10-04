from __future__ import annotations

from types import TracebackType
from typing import Protocol, Self

from todo_api.domain.entities import Tag, Task, User


class UserRepository(Protocol):
    def get_by_id(self, user_id: int) -> User | None: ...

    def get_by_email(self, email: str) -> User | None: ...

    def get_by_username(self, username: str) -> User | None: ...

    def add(self, user: User) -> None:
        """Insert a new user (flush). Raises ConflictError on a unique violation."""
        ...

    def delete(self, user: User) -> None: ...


class TagRepository(Protocol):
    def list(self, limit: int) -> list[Tag]: ...

    def get_by_id(self, tag_id: int) -> Tag | None: ...

    def get_by_name(self, name: str) -> Tag | None: ...

    def add(self, tag: Tag) -> None:
        """Insert a new tag (flush). Raises ConflictError on a unique violation."""
        ...


class TaskRepository(Protocol):
    def list_active_for_user(self, user_id: int) -> list[Task]: ...

    def list_archived_for_user(self, user_id: int) -> list[Task]: ...

    def get_for_user(self, task_id: int, user_id: int) -> Task | None: ...

    def add(self, task: Task) -> None:
        """Insert a new task (flush). Raises ValidationError on a constraint violation."""
        ...

    def update(self, task: Task) -> None: ...

    def delete(self, task: Task) -> None: ...


class UnitOfWork(Protocol):
    """One transaction. Leaving the block without `commit()` rolls back."""

    @property
    def users(self) -> UserRepository: ...

    @property
    def tags(self) -> TagRepository: ...

    @property
    def tasks(self) -> TaskRepository: ...

    def commit(self) -> None: ...

    def __enter__(self) -> Self: ...

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None: ...


class UnitOfWorkFactory(Protocol):
    def __call__(self) -> UnitOfWork: ...


class PasswordHasher(Protocol):
    def hash(self, password: str) -> str: ...

    def verify(self, password: str, password_hash: str) -> bool: ...


class TokenService(Protocol):
    def create(self, user_id: int) -> str: ...
