import sqlalchemy as sa
import sqlalchemy.orm as so
from flaskr.extensions import db


class UserModel(db.Model):
    __tablename__ = "users"

    id: so.Mapped[int] = so.mapped_column(primary_key=True)
    username: so.Mapped[str] = so.mapped_column(
        sa.String(20), nullable=False, unique=True, index=True
    )
    email: so.Mapped[str] = so.mapped_column(
        sa.String(120), nullable=False, unique=True, index=True
    )
    password: so.Mapped[str] = so.mapped_column(sa.String(300), nullable=False)
