from flask_smorest import abort
from flaskr.models.user_model import UserModel
from flaskr.repositories.user_repository import UserRepository

user_repository = UserRepository()


class UserService:
    def create_new_user(self, user_data):
        user_created = user_repository.get_user_by_email(user_data["email"])

        if user_created is not None:
            abort(409)

        user = UserModel(**user_data)
        user.set_password(user_data["password"])

        return user_repository.create_user(user)
