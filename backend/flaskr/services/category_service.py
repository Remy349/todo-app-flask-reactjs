from flaskr.models.category_model import CategoryModel
from flaskr.repositories.category_repository import CategoryRepository
from flaskr.repositories.user_repository import UserRepository

user_repository = UserRepository()
category_repository = CategoryRepository()


class CategoryService:
    def list_categories(self):
        return category_repository.get_categories()

    def create_new_category(self, category_data):
        user = user_repository.get_user_by_id(category_data["user_id"])

        category = CategoryModel(**category_data)
        category.user = user

        return category_repository.create_category(category)
