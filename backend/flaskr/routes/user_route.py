from flask_jwt_extended import jwt_required
from flask_smorest import Blueprint
from flask.views import MethodView
from flaskr.schemas.schema import UserSchema
from flaskr.controllers.user_controller import UserController
from flaskr.decorators import role_required

bp = Blueprint("users", __name__)


@bp.route("/users")
class Users(MethodView):
    @bp.response(200, UserSchema(many=True))
    def get(self):
        return UserController.get_all()

    @bp.arguments(UserSchema)
    @bp.response(201)
    def post(self, data):
        return UserController.create(data)


@bp.route("/users/<user_id>")
class UserById(MethodView):
    @bp.response(200, UserSchema)
    def get(self, user_id):
        return UserController.get_by_id(user_id)

    @jwt_required()
    @role_required("admin", "admin_manager")
    @bp.response(204)
    def delete(self, user_id):
        """Manager admin route (JWT + manager role required)"""
        return UserController.delete_by_id(user_id)


@bp.route("/users/account")
class UserAccount(MethodView):
    @jwt_required()
    @bp.response(204)
    def delete(self):
        """Any logged in user can delete their own account"""
        return UserController.delete()