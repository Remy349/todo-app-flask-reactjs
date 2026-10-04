from dataclasses import dataclass
from datetime import datetime

from todo_api.domain.enums import TaskStatus


@dataclass(frozen=True, slots=True)
class User:
    id: int | None
    username: str
    email: str
    password_hash: str


@dataclass(frozen=True, slots=True)
class Tag:
    id: int | None
    name: str


@dataclass(frozen=True, slots=True)
class Task:
    id: int | None
    title: str
    content: str
    status: TaskStatus
    due_date: datetime | None
    is_archived: bool
    created_at: datetime
    user_id: int
    tag_id: int
    tag_name: str | None = None
