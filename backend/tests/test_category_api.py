from werkzeug.test import Client
from flaskr.services.category_service import CategoryService
from flaskr.services.user_service import UserService

category_service = CategoryService()
user_service = UserService()


def test_list_categories(client: Client):
    user_data = {"email": "user1@test.com", "password": "11111111"}
    user_service.create_new_user(user_data)

    for i in range(1, 6):
        category_data = {"category_name": f"TestCategoryName{i}", "user_id": 1}
        category_service.create_new_category(category_data)

    response = client.get("/api/categories")

    assert response.status_code == 200
    assert len(response.json) == 5


def test_create_new_category(client: Client):
    user_data = {"email": "user1@test.com", "password": "11111111"}
    user_service.create_new_user(user_data)

    category_data = {"category_name": "TestCategoryName1", "user_id": 1}

    response = client.post("/api/categories", json=category_data)

    assert response.status_code == 201
