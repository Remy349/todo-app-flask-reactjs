from todo_api.application.ports import UnitOfWorkFactory
from todo_api.domain.errors import TaskNotFoundError


class DeleteTask:
    def __init__(self, *, uow: UnitOfWorkFactory) -> None:
        self._uow = uow

    def execute(self, task_id: int, user_id: int) -> None:
        with self._uow() as uow:
            task = uow.tasks.get_for_user(task_id, user_id)
            if task is None:
                raise TaskNotFoundError("Task not found")
            uow.tasks.delete(task)
            uow.commit()
