from todo_api.application.ports import UnitOfWorkFactory
from todo_api.domain.entities import Task


class ListTasks:
    def __init__(self, *, uow: UnitOfWorkFactory) -> None:
        self._uow = uow

    def execute(self, user_id: int) -> list[Task]:
        with self._uow() as uow:
            return uow.tasks.list_active_for_user(user_id)
