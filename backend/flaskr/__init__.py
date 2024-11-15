import flaskr.models

from flask import Flask
from config import DevelopmentConfig
from flaskr.extensions import db, migrate, api, cors


def create_app(test_config=None):
    app = Flask(__name__)

    if test_config is None:
        app.config.from_object(DevelopmentConfig)
    else:
        app.config.from_object(test_config)

    db.init_app(app)
    migrate.init_app(app, db)
    api.init_app(app)
    cors.init_app(app)

    return app
