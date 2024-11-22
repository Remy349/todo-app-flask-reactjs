from flask_jwt_extended import get_jwt_identity
from flask_smorest import abort
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound, SQLAlchemyError
from flaskr.db import db
from flaskr.models.user_model import UserModel
from flaskr.utils import generate_password


class UserController:
    @staticmethod
    def get_all():
        try:
            return db.session.execute(select(UserModel)).scalars().all()
        except SQLAlchemyError:
            abort(500, message="Internal server error while fetching users")

    @staticmethod
    def get_by_id(user_id):
        try:
            return db.session.execute(
                select(UserModel).where(UserModel.id == user_id)
            ).scalar_one()
        except NoResultFound:
            abort(404, message="User not found")
        except SQLAlchemyError:
            abort(500, message="Internal server error while fetching user")

    @staticmethod
    def create(data):
        try:
            user_registered = db.session.execute(
                select(UserModel).where(
                    (UserModel.username == data["username"])
                    | (UserModel.email == data["email"])
                )
            ).scalar_one_or_none()

            if user_registered:
                if user_registered.username == data["username"]:
                    abort(409, message="Username already registered")
                if user_registered.email == data["email"]:
                    abort(409, message="Email already registered")

            new_user = UserModel(**data)

            new_user.password = generate_password(data["password"])

            db.session.add(new_user)
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            abort(500, message="Internal server error while creating user")

    @staticmethod
    def delete():
        try:
            user_id = get_jwt_identity()

            user = db.session.execute(
                select(UserModel).where(UserModel.id == user_id)
            ).scalar_one()

            db.session.delete(user)
            db.session.commit()
        except NoResultFound:
            abort(404, message="User not found")
        except SQLAlchemyError:
            db.session.rollback()
            abort(500, message="Internal server error while deleting user")
