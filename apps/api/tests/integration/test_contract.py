"""Pins the JSON contract the frontend depends on. Changing these keys is a breaking change."""

CONTRACT_KEYS = {
    "id",
    "title",
    "content",
    "status",
    "dueDate",
    "isArchived",
    "createdAt",
    "tagName",
}


def test_create_user_returns_201_and_sign_in_returns_a_token(client):
    created = client.post(
        "/api/v1/users",
        json={"username": "alice", "email": "alice@example.com", "password": "s3cret"},
    )
    assert created.status_code == 201

    response = client.post(
        "/api/v1/auth/sign-in", json={"email": "alice@example.com", "password": "s3cret"}
    )

    assert response.status_code == 200
    body = response.get_json()
    assert set(body) == {"token"}
    assert isinstance(body["token"], str) and body["token"]


def test_sign_in_with_bad_credentials_is_401_with_a_stable_code(client, create_user):
    create_user(username="alice", email="alice@example.com")

    response = client.post(
        "/api/v1/auth/sign-in",
        json={"email": "alice@example.com", "password": "wrong-password"},
    )

    assert response.status_code == 401
    assert response.get_json() == {
        "message": "Incorrect credentials",
        "code": "INVALID_CREDENTIALS",
    }


def test_duplicate_user_is_409_with_a_stable_code(client, create_user):
    create_user(username="alice", email="alice@example.com")

    response = client.post(
        "/api/v1/users",
        json={"username": "alice-2", "email": "alice@example.com", "password": "s3cret"},
    )

    assert response.status_code == 409
    assert response.get_json()["code"] == "USER_ALREADY_EXISTS"


def test_get_tags_returns_a_list(client):
    response = client.get("/api/v1/tags")

    assert response.status_code == 200
    assert response.get_json() == []


def test_duplicate_tag_is_409_with_a_stable_code(client, create_tag):
    create_tag("work")

    response = client.post("/api/v1/tags", json={"name": "work"})

    assert response.status_code == 409
    assert response.get_json()["code"] == "TAG_ALREADY_EXISTS"


def test_task_list_item_exposes_the_exact_contract(client, auth_headers, create_tag, create_task):
    headers = auth_headers()
    tag_id = create_tag("work")
    create_task(headers, tag_id=tag_id, title="Write tests", due_date="2030-01-01T10:00:00")

    response = client.get("/api/v1/tasks/user", headers=headers)

    assert response.status_code == 200
    items = response.get_json()
    assert len(items) == 1
    item = items[0]
    assert set(item) == CONTRACT_KEYS
    assert item["title"] == "Write tests"
    assert item["status"] == "TaskStatus.PENDING"
    assert item["isArchived"] is False
    assert item["tagName"] == "work"


def test_update_task_reflects_the_change(client, auth_headers, create_tag, create_task):
    headers = auth_headers()
    tag_id = create_tag("work")
    task_id = create_task(headers, tag_id=tag_id, title="Old title")

    response = client.put(
        f"/api/v1/tasks/{task_id}",
        json={"title": "New title", "content": "Updated content", "status": "COMPLETED"},
        headers=headers,
    )

    assert response.status_code == 200
    item = client.get("/api/v1/tasks/user", headers=headers).get_json()[0]
    assert item["title"] == "New title"
    assert item["content"] == "Updated content"
    assert item["status"] == "TaskStatus.COMPLETED"


def test_update_task_without_due_date_keeps_the_previous_one(
    client, auth_headers, create_tag, create_task
):
    headers = auth_headers()
    tag_id = create_tag("work")
    task_id = create_task(headers, tag_id=tag_id, title="Old title", due_date="2030-01-01T10:00:00")

    client.put(
        f"/api/v1/tasks/{task_id}",
        json={"title": "New title", "content": "Updated content", "status": "PENDING"},
        headers=headers,
    )

    item = client.get("/api/v1/tasks/user", headers=headers).get_json()[0]
    assert item["dueDate"].startswith("2030-01-01T10:00:00")


def test_toggle_archive_moves_the_task_to_the_archived_listing(
    client, auth_headers, create_tag, create_task
):
    headers = auth_headers()
    tag_id = create_tag("work")
    task_id = create_task(headers, tag_id=tag_id, title="Archive me")

    response = client.patch(f"/api/v1/tasks/{task_id}/toggle-archive", headers=headers)

    assert response.status_code == 200
    assert client.get("/api/v1/tasks/user", headers=headers).get_json() == []
    archived = client.get("/api/v1/tasks/user/archived", headers=headers).get_json()
    assert [task["id"] for task in archived] == [task_id]
    assert archived[0]["isArchived"] is True


def test_delete_task_removes_it_from_the_listing(client, auth_headers, create_tag, create_task):
    headers = auth_headers()
    tag_id = create_tag("work")
    task_id = create_task(headers, tag_id=tag_id, title="Delete me")

    response = client.delete(f"/api/v1/tasks/{task_id}", headers=headers)

    assert response.status_code == 204
    assert client.get("/api/v1/tasks/user", headers=headers).get_json() == []


def test_create_task_without_a_required_field_is_422(client, auth_headers):
    headers = auth_headers()

    response = client.post(
        "/api/v1/tasks",
        json={"content": "Some content", "status": "PENDING", "tagId": 1},
        headers=headers,
    )

    assert response.status_code == 422


def test_tasks_require_a_token(client):
    response = client.get("/api/v1/tasks/user")

    assert response.status_code == 401
