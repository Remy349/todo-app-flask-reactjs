import pytest
from flaskr import create_app
from config import TestingConfig
from flaskr.extensions import db


@pytest.fixture()
def app():
    app = create_app(TestingConfig)
    app_context = app.app_context()
    app_context.push()

    db.create_all()

    yield app

    db.session.remove()
    db.drop_all()

    app_context.pop()


@pytest.fixture()
def client(app):
    return app.test_client()
