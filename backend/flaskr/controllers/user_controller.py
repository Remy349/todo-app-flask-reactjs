from flask_smorest import Blueprint
from flask.views import MethodView
from flaskr.schemas.schema import UserSchema
from flaskr.services.user_service import UserService

bp = Blueprint("users", __name__, description="Operations on users")

user_service = UserService()


@bp.route("/users")
class UsersController(MethodView):
    @bp.arguments(UserSchema)
    @bp.response(201, UserSchema)
    def post(self, user_data):
        """Create a new user"""
        return user_service.create_new_user(user_data)
