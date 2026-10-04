"""Regression guard for the fixed IDOR: a user can only see and mutate their own tasks."""


def test_a_user_cannot_see_or_mutate_another_users_task(
    client, auth_headers, create_tag, create_task
):
    alice = auth_headers(username="alice", email="alice@example.com")
    bob = auth_headers(username="bob", email="bob@example.com")
    tag_id = create_tag("work")
    task_id = create_task(alice, tag_id=tag_id, title="Alice secret")

    # (a) Alice's task never shows up in Bob's listings.
    assert client.get("/api/v1/tasks/user", headers=bob).get_json() == []
    assert client.get("/api/v1/tasks/user/archived", headers=bob).get_json() == []

    # (b) Bob cannot mutate Alice's task, and gets a stable 404.
    put = client.put(
        f"/api/v1/tasks/{task_id}",
        json={"title": "hacked", "content": "hacked", "status": "PENDING"},
        headers=bob,
    )
    assert put.status_code == 404
    assert put.get_json()["code"] == "TASK_NOT_FOUND"

    delete = client.delete(f"/api/v1/tasks/{task_id}", headers=bob)
    assert delete.status_code == 404
    assert delete.get_json()["code"] == "TASK_NOT_FOUND"

    toggle = client.patch(f"/api/v1/tasks/{task_id}/toggle-archive", headers=bob)
    assert toggle.status_code == 404
    assert toggle.get_json()["code"] == "TASK_NOT_FOUND"

    # (c) Alice's task is still there and untouched.
    alice_tasks = client.get("/api/v1/tasks/user", headers=alice).get_json()
    assert [task["id"] for task in alice_tasks] == [task_id]
    assert alice_tasks[0]["title"] == "Alice secret"
    assert alice_tasks[0]["isArchived"] is False


def test_a_user_cannot_archive_another_users_task(client, auth_headers, create_tag, create_task):
    alice = auth_headers(username="alice", email="alice@example.com")
    bob = auth_headers(username="bob", email="bob@example.com")
    tag_id = create_tag("work")
    task_id = create_task(alice, tag_id=tag_id, title="Alice task")

    assert client.patch(f"/api/v1/tasks/{task_id}/toggle-archive", headers=bob).status_code == 404

    assert [task["id"] for task in client.get("/api/v1/tasks/user", headers=alice).get_json()] == [
        task_id
    ]
    assert client.get("/api/v1/tasks/user/archived", headers=alice).get_json() == []


def test_a_token_from_a_deleted_account_cannot_create_tasks(client, auth_headers, create_tag):
    headers = auth_headers(username="ghost", email="ghost@example.com")
    tag_id = create_tag("work")
    assert client.delete("/api/v1/users/account", headers=headers).status_code == 204

    response = client.post(
        "/api/v1/tasks",
        json={"title": "ghost", "content": "ghost", "status": "PENDING", "tagId": tag_id},
        headers=headers,
    )

    assert response.status_code in (401, 403)
