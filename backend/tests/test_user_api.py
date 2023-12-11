from werkzeug.test import Client
from flaskr.services.user_service import UserService

user_service = UserService()


def test_do_not_create_the_same_user_twice(client: Client):
    user_data = {"email": "user1@test.com", "password": "11111111"}

    user_service.create_new_user(user_data)

    response = client.post("/api/users", json=user_data)

    assert response.status_code == 409


def test_create_new_user(client: Client):
    user_data = {"email": "user1@test.com", "password": "11111111"}

    response = client.post("/api/users", json=user_data)

    assert response.status_code == 201
