import os
from datetime import timedelta
from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(__file__))

load_dotenv(os.path.join(basedir, ".env"))


class Config(object):
    # Flask sqlalchemy
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Flask smorest
    PROPAGATE_EXCEPTIONS = True
    API_TITLE = "TODO App"
    API_VERSION = "v1"
    OPENAPI_URL_PREFIX = "/"
    OPENAPI_SWAGGER_UI_PATH = "/docs"
    OPENAPI_VERSION = "3.0.3"
    OPENAPI_SWAGGER_UI_URL = "https://cdn.jsdelivr.net/npm/swagger-ui-dist/"
    # Flask jwt extended
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")


class DevelopmentConfig(Config):
    # Flask sqlalchemy
    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(basedir, "data.db")
    # Flask jwt extended
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)


class TestingConfig(Config):
    # Enable testing mode
    TESTING = True
    # Flask sqlalchemy
    SQLALCHEMY_DATABASE_URI = "sqlite:///"
