import flaskr.models

from flask import Flask
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

    api.register_blueprint(user_controller, url_prefix="/api")
    api.register_blueprint(auth_controller, url_prefix="/api")
    api.register_blueprint(category_controller, url_prefix="/api")

    return app
