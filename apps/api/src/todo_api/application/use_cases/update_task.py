from dataclasses import dataclass, replace
from datetime import datetime

from todo_api.application.ports import UnitOfWorkFactory
from todo_api.domain.enums import TaskStatus
from todo_api.domain.errors import TaskNotFoundError, ValidationError


@dataclass(frozen=True, slots=True)
class UpdateTaskInput:
    task_id: int
    user_id: int
    title: str
    content: str
    status: TaskStatus
    due_date: datetime | None
    update_due_date: bool


class UpdateTask:
    def __init__(self, *, uow: UnitOfWorkFactory) -> None:
        self._uow = uow

    def execute(self, data: UpdateTaskInput) -> None:
        with self._uow() as uow:
            if not data.title.strip():
                raise ValidationError("Title cannot be empty")

            task = uow.tasks.get_for_user(data.task_id, data.user_id)
            if task is None:
                raise TaskNotFoundError("Task not found")

            updated = replace(
                task,
                title=data.title,
                content=data.content,
                status=data.status,
                due_date=data.due_date if data.update_due_date else task.due_date,
            )
            uow.tasks.update(updated)
            uow.commit()
