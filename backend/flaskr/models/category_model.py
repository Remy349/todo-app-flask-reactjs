from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from flaskr.extensions import db
from sqlalchemy import ForeignKey, Integer, DateTime, String


class CategoryModel(db.Model):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    category_name: Mapped[str] = mapped_column(String(60), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    # ForeignKey

    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    # Relationships

    user = relationship("UserModel", back_populates="categories")

    def __repr__(self):
        return f"""
            category:
                id: {self.id},
                category_name: {self.category_name}
        """
