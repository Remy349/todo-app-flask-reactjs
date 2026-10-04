from todo_api.application.ports import UnitOfWorkFactory
from todo_api.domain.entities import Tag

TAGS_LIMIT = 15


class ListTags:
    def __init__(self, *, uow: UnitOfWorkFactory) -> None:
        self._uow = uow

    def execute(self) -> list[Tag]:
        with self._uow() as uow:
            return uow.tags.list(limit=TAGS_LIMIT)
