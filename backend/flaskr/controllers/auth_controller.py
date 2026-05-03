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
            email = data.get("email", "").lower().strip()
            password = data.get("password", "")

            user_registered = db.session.execute(
                select(UserModel).where(UserModel.email == email)
            ).scalar_one_or_none()

            if not user_registered:
                abort(401, message="Incorrect credentials")

            if not check_password(user_registered.password, password):
                abort(401, message="Incorrect credentials")

            token = create_access_token(
                identity=str(user_registered.id),
                additional_claims={"role": user_registered.role},
            )

            return {
                "token": token,
                "role": user_registered.role,
                "userId": user_registered.id,
                "username": user_registered.username,
            }

        except Exception as e:
            print("ERROR:", str(e))
            abort(500, message=str(e))