from __future__ import annotations

from datetime import timedelta

from flask import Flask, jsonify
from sqlalchemy import event
from sqlalchemy.orm import sessionmaker

from todo_api.config import Settings
from todo_api.container import Container, build_container
from todo_api.infrastructure.persistence.database import db
from todo_api.infrastructure.web.blueprints.auth import create_auth_blueprint
from todo_api.infrastructure.web.blueprints.tags import create_tags_blueprint
from todo_api.infrastructure.web.blueprints.tasks import create_tasks_blueprint
from todo_api.infrastructure.web.blueprints.users import create_users_blueprint
from todo_api.infrastructure.web.errors import register_error_handlers
from todo_api.infrastructure.web.extensions import api, cors, jwt, migrate


def _enable_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
    """SQLite ignores foreign keys unless they are enabled per connection."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def create_app(settings: Settings | None = None, *, container: Container | None = None) -> Flask:
    """Application factory = composition root.

    Tests may pass a pre-built `container` (fakes) to skip the database.
    """
    settings = settings or Settings.from_env()
    app = Flask(__name__)

    app.config.update(
        SQLALCHEMY_DATABASE_URI=settings.database_url,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        JWT_SECRET_KEY=settings.jwt_secret_key,
        JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=settings.jwt_access_token_expires_hours),
        API_TITLE=settings.api_title,
        API_VERSION=settings.api_version,
        OPENAPI_VERSION=settings.openapi_version,
        OPENAPI_URL_PREFIX="/",
        OPENAPI_SWAGGER_UI_PATH="/docs",
        OPENAPI_SWAGGER_UI_URL="https://cdn.jsdelivr.net/npm/swagger-ui-dist/",
    )

    db.init_app(app)
    migrate.init_app(app, db)
    api.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": list(settings.cors_origins)}})

    if container is None:
        with app.app_context():
            if settings.database_url.startswith("sqlite") and not event.contains(
                db.engine, "connect", _enable_sqlite_foreign_keys
            ):
                event.listen(db.engine, "connect", _enable_sqlite_foreign_keys)
            session_factory = sessionmaker(bind=db.engine, expire_on_commit=False)
            container = build_container(session_factory)

    @jwt.user_lookup_loader
    def _load_user(_jwt_header, jwt_data):
        # Returns None when the account no longer exists; flask-jwt-extended then
        # raises UserLookupError, which the error loader below answers with 401.
        return container.get_user.execute(int(jwt_data["sub"]))

    @jwt.user_lookup_error_loader
    def _user_lookup_error(_jwt_header, _jwt_data):
        return jsonify(message="User not found", code="USER_NOT_FOUND"), 401

    register_error_handlers(app)

    api.register_blueprint(create_auth_blueprint(sign_in=container.sign_in), url_prefix="/api/v1")
    api.register_blueprint(
        create_users_blueprint(
            create_user=container.create_user,
            delete_account=container.delete_account,
        ),
        url_prefix="/api/v1",
    )
    api.register_blueprint(
        create_tags_blueprint(list_tags=container.list_tags, create_tag=container.create_tag),
        url_prefix="/api/v1",
    )
    api.register_blueprint(
        create_tasks_blueprint(
            create_task=container.create_task,
            list_tasks=container.list_tasks,
            list_archived_tasks=container.list_archived_tasks,
            update_task=container.update_task,
            delete_task=container.delete_task,
            toggle_archive=container.toggle_archive,
        ),
        url_prefix="/api/v1",
    )

    return app
