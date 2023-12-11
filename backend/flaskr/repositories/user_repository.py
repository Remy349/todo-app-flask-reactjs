from sqlalchemy import select
from flaskr.extensions import db
from flaskr.models.user_model import UserModel


class UserRepository:
    def get_user_by_id(self, user_id):
        return db.get_or_404(UserModel, user_id)

    def get_user_by_email(self, email):
        return db.session.execute(
            select(UserModel).where(UserModel.email.like(email))
        ).scalar_one_or_none()

    def create_user(self, user):
        db.session.add(user)
        db.session.commit()

        return user
