from dataclasses import dataclass

from todo_api.application.ports import UnitOfWorkFactory
from todo_api.domain.entities import Tag
from todo_api.domain.errors import TagAlreadyExistsError


@dataclass(frozen=True, slots=True)
class CreateTagInput:
    name: str


class CreateTag:
    def __init__(self, *, uow: UnitOfWorkFactory) -> None:
        self._uow = uow

    def execute(self, data: CreateTagInput) -> None:
        with self._uow() as uow:
            if uow.tags.get_by_name(data.name) is not None:
                raise TagAlreadyExistsError("Tag already registered")
            uow.tags.add(Tag(id=None, name=data.name))
            uow.commit()
