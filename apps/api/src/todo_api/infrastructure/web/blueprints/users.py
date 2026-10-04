from __future__ import annotations

from flask.views import MethodView
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_smorest import Blueprint

from todo_api.application.use_cases.create_user import CreateUser, CreateUserInput
from todo_api.application.use_cases.delete_account import DeleteAccount
from todo_api.infrastructure.web.schemas import UserSchema


def create_users_blueprint(*, create_user: CreateUser, delete_account: DeleteAccount) -> Blueprint:
    """Inbound adapter for user registration and account deletion."""
    bp = Blueprint("users", __name__)

    @bp.route("/users")
    class Users(MethodView):
        @bp.arguments(UserSchema)
        @bp.response(201)
        def post(self, data):
            create_user.execute(
                CreateUserInput(
                    username=data["username"],
                    email=data["email"],
                    password=data["password"],
                )
            )

    @bp.route("/users/account")
    class UserAccount(MethodView):
        @jwt_required()
        @bp.response(204)
        def delete(self):
            delete_account.execute(int(get_jwt_identity()))

    return bp
