from flask_smorest import abort
from flaskr.models.category_model import CategoryModel
from flaskr.repositories.category_repository import CategoryRepository
from flaskr.repositories.user_repository import UserRepository

user_repository = UserRepository()
category_repository = CategoryRepository()


class CategoryService:
    def list_categories_in_user(self, user_id):
        return category_repository.get_categories_in_user(user_id)

    def create_new_category(self, category_data):
        user = user_repository.get_user_by_id(category_data["user_id"])

        category_created = category_repository.get_category_in_user_by_category_name(
            category_data["user_id"],
            category_data["category_name"],
        )

        if category_created:
            abort(409)

        category = CategoryModel(**category_data)
        category.user = user

        return category_repository.create_category_in_user(category)

    def remove_category_by_id(self, category_id):
        category = category_repository.get_category_by_id(category_id)

        return category_repository.delete_category(category)
