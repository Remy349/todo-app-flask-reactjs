"""Use-case test template: plain Python, fakes only, no Flask and no SQLAlchemy."""

import pytest

from tests.support.fakes import FakeUnitOfWorkFactory
from todo_api.application.use_cases.create_task import CreateTask, CreateTaskInput
from todo_api.domain.entities import Tag
from todo_api.domain.enums import TaskStatus
from todo_api.domain.errors import TagNotFoundError, ValidationError


def a_create_task_input(**overrides) -> CreateTaskInput:
    defaults = {
        "user_id": 1,
        "title": "Write tests",
        "content": "Some content",
        "status": TaskStatus.PENDING,
        "tag_id": 1,
        "due_date": None,
    }
    return CreateTaskInput(**{**defaults, **overrides})


def test_creates_an_active_task_with_the_tag_name():
    uow = FakeUnitOfWorkFactory()
    uow.tags.add(Tag(id=None, name="work"))

    CreateTask(uow=uow).execute(a_create_task_input())

    tasks = uow.tasks.list_active_for_user(1)
    assert len(tasks) == 1
    task = tasks[0]
    assert task.id is not None
    assert task.is_archived is False
    assert task.tag_name == "work"
    assert uow.uow.commits == 1


def test_blank_title_is_a_validation_error():
    uow = FakeUnitOfWorkFactory()
    uow.tags.add(Tag(id=None, name="work"))

    with pytest.raises(ValidationError):
        CreateTask(uow=uow).execute(a_create_task_input(title="   "))

    assert uow.tasks.list_active_for_user(1) == []
    assert uow.uow.commits == 0


def test_unknown_tag_is_not_found():
    uow = FakeUnitOfWorkFactory()

    with pytest.raises(TagNotFoundError):
        CreateTask(uow=uow).execute(a_create_task_input(tag_id=999))

    assert uow.tasks.list_active_for_user(1) == []
