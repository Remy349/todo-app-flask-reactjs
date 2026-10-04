from dataclasses import dataclass
from datetime import UTC, datetime

from todo_api.application.ports import UnitOfWorkFactory
from todo_api.domain.entities import Task
from todo_api.domain.enums import TaskStatus
from todo_api.domain.errors import TagNotFoundError, ValidationError


@dataclass(frozen=True, slots=True)
class CreateTaskInput:
    user_id: int
    title: str
    content: str
    status: TaskStatus
    tag_id: int
    due_date: datetime | None


class CreateTask:
    def __init__(self, *, uow: UnitOfWorkFactory) -> None:
        self._uow = uow

    def execute(self, data: CreateTaskInput) -> None:
        with self._uow() as uow:
            if not data.title.strip():
                raise ValidationError("Title cannot be empty")
            if uow.tags.get_by_id(data.tag_id) is None:
                raise TagNotFoundError("Tag not found")

            task = Task(
                id=None,
                title=data.title,
                content=data.content,
                status=data.status,
                due_date=data.due_date,
                is_archived=False,
                created_at=datetime.now(UTC),
                user_id=data.user_id,
                tag_id=data.tag_id,
                tag_name=None,
            )
            uow.tasks.add(task)
            uow.commit()
