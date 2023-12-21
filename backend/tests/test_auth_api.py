from werkzeug.test import Client
from flaskr.services.user_service import UserService

user_service = UserService()


def test_authenticate_user(client: Client):
    user_data = {"email": "user1@test.com", "password": "11111111"}

    user_service.create_new_user(user_data)

    response = client.post("/api/auth/signin", json=user_data)

    assert response.status_code == 201
    assert "access_token" in response.json
