from todo_api.application.ports import UnitOfWorkFactory
from todo_api.domain.errors import UserNotFoundError


class DeleteAccount:
    def __init__(self, *, uow: UnitOfWorkFactory) -> None:
        self._uow = uow

    def execute(self, user_id: int) -> None:
        with self._uow() as uow:
            user = uow.users.get_by_id(user_id)
            if user is None:
                raise UserNotFoundError("User not found")
            uow.users.delete(user)
            uow.commit()
