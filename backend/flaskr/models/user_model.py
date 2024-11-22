from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from flaskr.db import db


class UserModel(db.Model):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(
        String(20), nullable=False, unique=True, index=True
    )
    email: Mapped[str] = mapped_column(
        String(120), nullable=False, unique=True, index=True
    )
    password: Mapped[str] = mapped_column(String(300), nullable=False)

    tasks = relationship(
        "TaskModel", back_populates="user", cascade="all, delete-orphan"
    )
