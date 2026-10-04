from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from todo_api.domain.entities import Tag, Task, User
from todo_api.domain.errors import ConflictError, TaskNotFoundError, ValidationError
from todo_api.infrastructure.persistence.mappers import (
    tag_to_domain,
    tag_to_model,
    task_to_domain,
    task_to_model,
    user_to_domain,
    user_to_model,
)
from todo_api.infrastructure.persistence.models import TagModel, TaskModel, UserModel


class SqlAlchemyUserRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_by_id(self, user_id: int) -> User | None:
        row = self._session.scalar(select(UserModel).where(UserModel.id == user_id))
        return user_to_domain(row) if row is not None else None

    def get_by_email(self, email: str) -> User | None:
        row = self._session.scalar(select(UserModel).where(UserModel.email == email))
        return user_to_domain(row) if row is not None else None

    def get_by_username(self, username: str) -> User | None:
        row = self._session.scalar(select(UserModel).where(UserModel.username == username))
        return user_to_domain(row) if row is not None else None

    def add(self, user: User) -> None:
        self._session.add(user_to_model(user))
        try:
            self._session.flush()
        except IntegrityError as err:
            raise ConflictError("User already registered") from err

    def delete(self, user: User) -> None:
        model = self._session.get(UserModel, user.id)
        if model is not None:
            self._session.delete(model)


class SqlAlchemyTagRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list(self, limit: int) -> list[Tag]:
        rows = self._session.scalars(select(TagModel).limit(limit)).all()
        return [tag_to_domain(row) for row in rows]

    def get_by_id(self, tag_id: int) -> Tag | None:
        row = self._session.scalar(select(TagModel).where(TagModel.id == tag_id))
        return tag_to_domain(row) if row is not None else None

    def get_by_name(self, name: str) -> Tag | None:
        row = self._session.scalar(select(TagModel).where(TagModel.name == name))
        return tag_to_domain(row) if row is not None else None

    def add(self, tag: Tag) -> None:
        self._session.add(tag_to_model(tag))
        try:
            self._session.flush()
        except IntegrityError as err:
            raise ConflictError("Tag already registered") from err


class SqlAlchemyTaskRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_active_for_user(self, user_id: int) -> list[Task]:
        return self._list_for_user(user_id, is_archived=False)

    def list_archived_for_user(self, user_id: int) -> list[Task]:
        return self._list_for_user(user_id, is_archived=True)

    def get_for_user(self, task_id: int, user_id: int) -> Task | None:
        row = self._session.scalar(
            select(TaskModel).where(TaskModel.id == task_id, TaskModel.user_id == user_id)
        )
        return task_to_domain(row) if row is not None else None

    def add(self, task: Task) -> None:
        self._session.add(task_to_model(task))
        try:
            self._session.flush()
        except IntegrityError as err:
            # With SQLite foreign keys enabled, a missing user/tag reference lands
            # here instead of silently storing an orphan row.
            raise ValidationError("Task references an unknown user or tag") from err

    def update(self, task: Task) -> None:
        model = self._session.get(TaskModel, task.id)
        if model is None:
            raise TaskNotFoundError("Task not found")
        model.title = task.title
        model.content = task.content
        model.status = task.status
        model.due_date = task.due_date
        model.is_archived = task.is_archived

    def delete(self, task: Task) -> None:
        model = self._session.get(TaskModel, task.id)
        if model is not None:
            self._session.delete(model)

    def _list_for_user(self, user_id: int, *, is_archived: bool) -> list[Task]:
        statement = (
            select(TaskModel, TagModel.name.label("tag_name"))
            .join(TagModel, TaskModel.tag_id == TagModel.id)
            .where(TaskModel.user_id == user_id, TaskModel.is_archived.is_(is_archived))
        )
        return [
            task_to_domain(task, tag_name) for task, tag_name in self._session.execute(statement)
        ]
