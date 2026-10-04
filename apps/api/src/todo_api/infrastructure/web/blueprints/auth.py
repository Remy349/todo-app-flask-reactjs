from __future__ import annotations

from flask.views import MethodView
from flask_smorest import Blueprint

from todo_api.application.use_cases.sign_in import SignIn, SignInInput
from todo_api.infrastructure.web.schemas import SignInSchema


def create_auth_blueprint(*, sign_in: SignIn) -> Blueprint:
    """Inbound adapter for authentication. Use cases are injected by the composition root."""
    bp = Blueprint("auth", __name__)

    @bp.route("/auth/sign-in")
    class SignInView(MethodView):
        @bp.arguments(SignInSchema)
        @bp.response(200)
        def post(self, data):
            output = sign_in.execute(SignInInput(email=data["email"], password=data["password"]))
            return {"token": output.token}

    return bp
