from types import TracebackType
from typing import Self

from sqlalchemy.orm import Session, sessionmaker

from todo_api.application.ports import UnitOfWorkFactory
from todo_api.infrastructure.persistence.repositories import (
    SqlAlchemyTagRepository,
    SqlAlchemyTaskRepository,
    SqlAlchemyUserRepository,
)


class SqlAlchemyUnitOfWork:
    """One session and one transaction per `with` block. Create a new instance per use case call."""

    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self._session_factory = session_factory

    def __enter__(self) -> Self:
        self._session = self._session_factory()
        self.users = SqlAlchemyUserRepository(self._session)
        self.tags = SqlAlchemyTagRepository(self._session)
        self.tasks = SqlAlchemyTaskRepository(self._session)
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        self._session.rollback()  # no-op after commit; discards everything otherwise
        self._session.close()

    def commit(self) -> None:
        self._session.commit()


def make_uow_factory(session_factory: sessionmaker[Session]) -> UnitOfWorkFactory:
    return lambda: SqlAlchemyUnitOfWork(session_factory)
