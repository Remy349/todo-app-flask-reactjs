import flaskr.models

from flask import Flask, jsonify
from config import DevelopmentConfig
from flaskr.extensions import db, jwt, api, cors, migrate

from flaskr.controllers.user_controller import bp as user_controller
from flaskr.controllers.auth_controller import bp as auth_controller
from flaskr.controllers.category_controller import bp as category_controller


def create_app(testing_config=None):
    app = Flask(__name__)

    if testing_config is None:
        app.config.from_object(DevelopmentConfig)
    else:
        app.config.from_object(testing_config)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    api.init_app(app)
    cors.init_app(app)

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return (
            jsonify(
                {
                    "message": "The token has expired.",
                    "error": "token_expired",
                }
            ),
            401,
        )

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return (
            jsonify(
                {
                    "message": "Signature verification failed.",
                    "error": "invalid_token",
                }
            ),
            401,
        )

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return (
            jsonify(
                {
                    "description": "Request does not contain an access token.",
                    "error": "authorization_required",
                }
            ),
            401,
        )

    api.register_blueprint(user_controller, url_prefix="/api")
    api.register_blueprint(auth_controller, url_prefix="/api")
    api.register_blueprint(category_controller, url_prefix="/api")

    return app
