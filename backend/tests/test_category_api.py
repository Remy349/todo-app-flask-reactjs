from werkzeug.test import Client
from flaskr.services.category_service import CategoryService
from flaskr.services.user_service import UserService

category_service = CategoryService()
user_service = UserService()


def test_list_categories_in_user(client: Client):
    user_data = {"email": "user1@test.com", "password": "11111111"}
    user = user_service.create_new_user(user_data)

    for index in range(1, 6):
        category_data = {
            "category_name": f"TestCategoryName{index}",
            "user_id": user.id,
        }
        category_service.create_new_category(category_data)

    response = client.get(f"/api/users/{user.id}/categories")

    assert response.status_code == 200
    assert len(response.json) == 5


def test_create_new_category(client: Client):
    user_data = {"email": "user1@test.com", "password": "11111111"}
    user = user_service.create_new_user(user_data)

    auth_response = user_service.authenticate_user(user_data)
    access_token = auth_response["access_token"]

    category_data = {"category_name": "TestCategoryName", "user_id": user.id}

    response = client.post(
        "/api/categories",
        json=category_data,
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert response.status_code == 201


def test_remove_category_by_id(client: Client):
    user_data = {"email": "user1@test.com", "password": "11111111"}
    user = user_service.create_new_user(user_data)

    for index in range(1, 6):
        category_data = {
            "category_name": f"TestCategoryName{index}",
            "user_id": user.id,
        }
        category_service.create_new_category(category_data)

    categories_in_user = client.get(f"/api/users/{user.id}/categories")

    assert len(categories_in_user.json) == 5

    client.delete(f"/api/categories/{5}")

    categories_in_user = client.get(f"/api/users/{user.id}/categories")

    assert len(categories_in_user.json) == 4
