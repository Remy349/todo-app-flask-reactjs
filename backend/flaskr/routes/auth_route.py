from flask_smorest import Blueprint
from flask.views import MethodView
from flaskr.controllers.auth_controller import AuthController
from flaskr.schemas.schema import SignInSchema

bp = Blueprint("auth", __name__)


@bp.route("/auth/sign-in")
class SignIn(MethodView):
    @bp.arguments(SignInSchema)
    @bp.response(200)
    def post(self, data):
        return AuthController.sign_in(data)
