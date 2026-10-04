from todo_api.application.ports import UnitOfWorkFactory
from todo_api.domain.entities import User


class GetUser:
    def __init__(self, *, uow: UnitOfWorkFactory) -> None:
        self._uow = uow

    def execute(self, user_id: int) -> User | None:
        with self._uow() as uow:
            return uow.users.get_by_id(user_id)
