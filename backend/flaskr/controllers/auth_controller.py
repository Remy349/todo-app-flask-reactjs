from flask_jwt_extended import create_access_token
from flask_smorest import abort
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from flaskr.db import db
from flaskr.models.user_model import UserModel
from flaskr.utils import check_password


class AuthController:
    @staticmethod
    def sign_in(data):
        try:
            user_registered = db.session.execute(
                select(UserModel).where(UserModel.email == data["email"])
            ).scalar_one_or_none()

            if (
                user_registered is None
                or check_password(user_registered.password, data["password"]) is False
            ):
                abort(401, message="Incorrect credentials")

            token = create_access_token(identity=str(user_registered.id))

            return {"token": token}
        except SQLAlchemyError:
            db.session.rollback()
            abort(500, message="Internal server error while sign in")
