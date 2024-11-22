from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from flaskr.db import db


class TagModel(db.Model):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True, unique=True
    )

    tasks = relationship(
        "TaskModel", back_populates="tag", cascade="all, delete-orphan"
    )
