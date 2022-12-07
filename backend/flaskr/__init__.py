from flask import Flask
from config import Config
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()


def create_app(config_class=Config):
    app = Flask(__name__)

    if not config_class.SQLALCHEMY_DATABASE_URI:
        raise RuntimeError("DATABASE_URI is not set!")
    else:
        print("DATABASE_URI is OK!!!")

    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db, compare_type=True)

    CORS(app)

    from flaskr.api import bp as api_bp
    app.register_blueprint(api_bp, url_prefix="/api")

    return app


from flaskr import models
