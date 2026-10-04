from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session, sessionmaker

from todo_api.application.use_cases.create_tag import CreateTag
from todo_api.application.use_cases.create_task import CreateTask
from todo_api.application.use_cases.create_user import CreateUser
from todo_api.application.use_cases.delete_account import DeleteAccount
from todo_api.application.use_cases.delete_task import DeleteTask
from todo_api.application.use_cases.get_user import GetUser
from todo_api.application.use_cases.list_archived_tasks import ListArchivedTasks
from todo_api.application.use_cases.list_tags import ListTags
from todo_api.application.use_cases.list_tasks import ListTasks
from todo_api.application.use_cases.sign_in import SignIn
from todo_api.application.use_cases.toggle_archive import ToggleArchive
from todo_api.application.use_cases.update_task import UpdateTask
from todo_api.infrastructure.persistence.unit_of_work import make_uow_factory
from todo_api.infrastructure.security.jwt_service import FlaskJwtTokenService
from todo_api.infrastructure.security.password_hasher import WerkzeugPasswordHasher


@dataclass(frozen=True, slots=True)
class Container:
    """Built once at startup; holds the use cases wired to concrete adapters."""

    sign_in: SignIn
    create_user: CreateUser
    get_user: GetUser
    delete_account: DeleteAccount
    list_tags: ListTags
    create_tag: CreateTag
    create_task: CreateTask
    list_tasks: ListTasks
    list_archived_tasks: ListArchivedTasks
    update_task: UpdateTask
    delete_task: DeleteTask
    toggle_archive: ToggleArchive


def build_container(session_factory: sessionmaker[Session]) -> Container:
    uow = make_uow_factory(session_factory)
    hasher = WerkzeugPasswordHasher()
    tokens = FlaskJwtTokenService()

    return Container(
        sign_in=SignIn(uow=uow, hasher=hasher, tokens=tokens),
        create_user=CreateUser(uow=uow, hasher=hasher),
        get_user=GetUser(uow=uow),
        delete_account=DeleteAccount(uow=uow),
        list_tags=ListTags(uow=uow),
        create_tag=CreateTag(uow=uow),
        create_task=CreateTask(uow=uow),
        list_tasks=ListTasks(uow=uow),
        list_archived_tasks=ListArchivedTasks(uow=uow),
        update_task=UpdateTask(uow=uow),
        delete_task=DeleteTask(uow=uow),
        toggle_archive=ToggleArchive(uow=uow),
    )
