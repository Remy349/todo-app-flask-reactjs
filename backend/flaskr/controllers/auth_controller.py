from flask_smorest import Blueprint
from flask.views import MethodView
from flaskr.schemas.schema import SignInSchema
from flaskr.services.user_service import UserService

bp = Blueprint("auth", __name__, description="Operations on auth")

user_service = UserService()


@bp.route("/auth/signin")
class SignInController(MethodView):
    @bp.arguments(SignInSchema)
    @bp.response(201)
    def post(self, user_data):
        """Authenticate user"""
        return user_service.authenticate_user(user_data)
