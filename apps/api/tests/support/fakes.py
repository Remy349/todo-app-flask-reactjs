"""In-memory implementations of the application ports.

No Flask, no SQLAlchemy: use cases can be tested with these fakes alone.
They mirror the adapter semantics that matter (unique keys, per-user task
filtering, tag name populated on listing) without a database.
"""

from __future__ import annotations

import copy
from dataclasses import replace
from types import TracebackType
from typing import Self

from todo_api.domain.entities import Tag, Task, User
from todo_api.domain.errors import ConflictError, TaskNotFoundError


class InMemoryUserRepository:
    def __init__(self) -> None:
        self.rows: dict[int, User] = {}
        self._next_id = 1

    def get_by_id(self, user_id: int) -> User | None:
        return self.rows.get(user_id)

    def get_by_email(self, email: str) -> User | None:
        return next((user for user in self.rows.values() if user.email == email), None)

    def get_by_username(self, username: str) -> User | None:
        return next((user for user in self.rows.values() if user.username == username), None)

    def add(self, user: User) -> None:
        if (
            self.get_by_username(user.username) is not None
            or self.get_by_email(user.email) is not None
        ):
            raise ConflictError("User already registered")
        user_id = user.id if user.id is not None else self._next_id
        self._next_id = max(self._next_id, user_id + 1)
        self.rows[user_id] = replace(user, id=user_id)

    def delete(self, user: User) -> None:
        self.rows.pop(user.id, None)


class InMemoryTagRepository:
    def __init__(self) -> None:
        self.rows: dict[int, Tag] = {}
        self._next_id = 1

    def list(self, limit: int) -> list[Tag]:
        return list(self.rows.values())[:limit]

    def get_by_id(self, tag_id: int) -> Tag | None:
        return self.rows.get(tag_id)

    def get_by_name(self, name: str) -> Tag | None:
        return next((tag for tag in self.rows.values() if tag.name == name), None)

    def add(self, tag: Tag) -> None:
        if self.get_by_name(tag.name) is not None:
            raise ConflictError("Tag already registered")
        tag_id = tag.id if tag.id is not None else self._next_id
        self._next_id = max(self._next_id, tag_id + 1)
        self.rows[tag_id] = replace(tag, id=tag_id)


class InMemoryTaskRepository:
    def __init__(self, tags: InMemoryTagRepository | None = None) -> None:
        self.rows: dict[int, Task] = {}
        self._tags = tags or InMemoryTagRepository()
        self._next_id = 1

    def bind_tags(self, tags: InMemoryTagRepository) -> None:
        """Point tag lookups at the tags of the current transaction staging area."""
        self._tags = tags

    def list_active_for_user(self, user_id: int) -> list[Task]:
        return [
            self._with_tag_name(task)
            for task in self.rows.values()
            if task.user_id == user_id and not task.is_archived
        ]

    def list_archived_for_user(self, user_id: int) -> list[Task]:
        return [
            self._with_tag_name(task)
            for task in self.rows.values()
            if task.user_id == user_id and task.is_archived
        ]

    def get_for_user(self, task_id: int, user_id: int) -> Task | None:
        task = self.rows.get(task_id)
        if task is None or task.user_id != user_id:
            return None
        return task

    def add(self, task: Task) -> None:
        task_id = task.id if task.id is not None else self._next_id
        self._next_id = max(self._next_id, task_id + 1)
        self.rows[task_id] = replace(task, id=task_id)

    def update(self, task: Task) -> None:
        if task.id not in self.rows:
            raise TaskNotFoundError("Task not found")
        self.rows[task.id] = replace(task)

    def delete(self, task: Task) -> None:
        self.rows.pop(task.id, None)

    def _with_tag_name(self, task: Task) -> Task:
        tag = self._tags.get_by_id(task.tag_id)
        return replace(task, tag_name=tag.name if tag is not None else None)


class FakeStore:
    """Committed state shared by every unit of work created by a factory."""

    def __init__(self) -> None:
        self.users = InMemoryUserRepository()
        self.tags = InMemoryTagRepository()
        self.tasks = InMemoryTaskRepository(tags=self.tags)


class FakeUnitOfWork:
    """Stages writes and applies them only on commit, like a real transaction."""

    def __init__(self, store: FakeStore | None = None) -> None:
        self._store = store or FakeStore()
        self.commits = 0
        self._stage_from_store()

    def _stage_from_store(self) -> None:
        self._users = copy.deepcopy(self._store.users)
        self._tags = copy.deepcopy(self._store.tags)
        self._tasks = copy.deepcopy(self._store.tasks)
        self._tasks.bind_tags(self._tags)

    def __call__(self) -> Self:
        return self  # acts as its own UnitOfWorkFactory

    def __enter__(self) -> Self:
        self._stage_from_store()
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        pass  # uncommitted staging copies are simply dropped

    def commit(self) -> None:
        self._store.users = self._users
        self._store.tags = self._tags
        self._store.tasks = self._tasks
        self.commits += 1

    @property
    def users(self) -> InMemoryUserRepository:
        return self._users

    @property
    def tags(self) -> InMemoryTagRepository:
        return self._tags

    @property
    def tasks(self) -> InMemoryTaskRepository:
        return self._tasks

    @property
    def committed_users(self) -> InMemoryUserRepository:
        return self._store.users

    @property
    def committed_tags(self) -> InMemoryTagRepository:
        return self._store.tags

    @property
    def committed_tasks(self) -> InMemoryTaskRepository:
        return self._store.tasks


class FakeUnitOfWorkFactory:
    """Returns the same FakeUnitOfWork so committed state survives across use case calls."""

    def __init__(self) -> None:
        self.uow = FakeUnitOfWork()

    def __call__(self) -> FakeUnitOfWork:
        return self.uow

    @property
    def users(self) -> InMemoryUserRepository:
        return self.uow.committed_users

    @property
    def tags(self) -> InMemoryTagRepository:
        return self.uow.committed_tags

    @property
    def tasks(self) -> InMemoryTaskRepository:
        return self.uow.committed_tasks
