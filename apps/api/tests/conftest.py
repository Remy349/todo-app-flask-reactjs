"""Shared fixtures: real SQLite app for integration tests, fakes for unit tests."""

from pathlib import Path

import pytest

from todo_api.app import create_app
from todo_api.config import Settings
from todo_api.infrastructure.persistence.database import db

PASSWORD = "s3cret-password"


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        database_url=f"sqlite:///{tmp_path / 'test.db'}",
        jwt_secret_key="test-secret",
        cors_origins=("http://localhost:5173",),
    )


@pytest.fixture
def app(settings: Settings):
    application = create_app(settings=settings)
    with application.app_context():
        db.create_all()
        yield application
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def create_user(client):
    def _create_user(*, username: str, email: str, password: str = PASSWORD) -> None:
        response = client.post(
            "/api/v1/users",
            json={"username": username, "email": email, "password": password},
        )
        assert response.status_code == 201, response.get_json()

    return _create_user


@pytest.fixture
def auth_headers(client, create_user):
    def _auth_headers(
        *,
        username: str = "alice",
        email: str = "alice@example.com",
        password: str = PASSWORD,
    ) -> dict[str, str]:
        create_user(username=username, email=email, password=password)
        response = client.post("/api/v1/auth/sign-in", json={"email": email, "password": password})
        assert response.status_code == 200, response.get_json()
        token = response.get_json()["token"]
        return {"Authorization": f"Bearer {token}"}

    return _auth_headers


@pytest.fixture
def create_tag(client):
    def _create_tag(name: str) -> int:
        response = client.post("/api/v1/tags", json={"name": name})
        assert response.status_code == 201, response.get_json()
        tags = client.get("/api/v1/tags").get_json()
        return next(tag["id"] for tag in tags if tag["name"] == name)

    return _create_tag


@pytest.fixture
def create_task(client):
    def _create_task(
        headers: dict[str, str],
        *,
        tag_id: int,
        title: str = "A task",
        content: str = "Some content",
        status: str = "PENDING",
        due_date: str | None = None,
    ) -> int:
        payload: dict[str, object] = {
            "title": title,
            "content": content,
            "status": status,
            "tagId": tag_id,
        }
        if due_date is not None:
            payload["dueDate"] = due_date
        response = client.post("/api/v1/tasks", json=payload, headers=headers)
        assert response.status_code == 201, response.get_json()
        tasks = client.get("/api/v1/tasks/user", headers=headers).get_json()
        return next(task["id"] for task in tasks if task["title"] == title)

    return _create_task
