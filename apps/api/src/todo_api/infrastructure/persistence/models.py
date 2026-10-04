from datetime import UTC, datetime

from sqlalchemy import Enum as SaEnum
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from todo_api.domain.enums import TaskStatus
from todo_api.infrastructure.persistence.database import db


class UserModel(db.Model):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)
    email: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)
    password: Mapped[str] = mapped_column(String(300), nullable=False)

    tasks = relationship("TaskModel", back_populates="user", cascade="all, delete-orphan")


class TagModel(db.Model):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(20), nullable=False, index=True, unique=True)

    tasks = relationship("TaskModel", back_populates="tag", cascade="all, delete-orphan")


class TaskModel(db.Model):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    content: Mapped[str] = mapped_column(String(600), nullable=False)
    status: Mapped[TaskStatus] = mapped_column(
        SaEnum(TaskStatus), nullable=False, default=TaskStatus.PENDING
    )
    due_date: Mapped[datetime] = mapped_column(nullable=True)
    is_archived: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(index=True, default=lambda: datetime.now(UTC))

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    user = relationship("UserModel", back_populates="tasks")

    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id"), nullable=False)
    tag = relationship("TagModel", back_populates="tasks")
