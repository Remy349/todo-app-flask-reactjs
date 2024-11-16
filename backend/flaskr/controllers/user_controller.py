from flask_smorest import abort
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from flaskr.db import db
from flaskr.models.user_model import UserModel


class UserController:
    @staticmethod
    def get_all():
        return db.session.execute(select(UserModel)).scalars().all()

    @staticmethod
    def get_by_id(user_id):
        try:
            return db.session.execute(
                select(UserModel).where(UserModel.id == user_id)
            ).scalar_one()
        except NoResultFound:
            abort(404, message="User not found")

    @staticmethod
    def create(data):
        pass

    @staticmethod
    def delete(user_id):
        try:
            user = db.session.execute(
                select(UserModel).where(UserModel.id == user_id)
            ).scalar_one()

            db.session.delete(user)
            db.session.commit()
        except:
            abort(404, message="User not found")
