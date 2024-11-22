from enum import Enum
from sqlalchemy import ForeignKey, String, Enum as SaEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from flaskr.db import db
from datetime import datetime, timezone


class TaskStatus(Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class TaskModel(db.Model):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    content: Mapped[str] = mapped_column(String(600), nullable=False)
    status: Mapped[TaskStatus] = mapped_column(
        SaEnum(TaskStatus), nullable=False, default=TaskStatus.PENDING
    )
    created_at: Mapped[datetime] = mapped_column(
        index=True, default=lambda: datetime.now(timezone.utc)
    )

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    user = relationship("UserModel", back_populates="tasks")

    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id"), nullable=False)
    tag = relationship("TagModel", back_populates="tasks")
