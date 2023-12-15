from sqlalchemy import select
from flaskr.extensions import db
from flaskr.models.category_model import CategoryModel
from flaskr.models.user_model import UserModel


class CategoryRepository:
    def get_categories_in_user(self, user_id):
        user = db.get_or_404(UserModel, user_id)

        return user.categories

    def get_category_in_user_by_category_name(self, user_id, category_name):
        return db.session.execute(
            select(CategoryModel).filter_by(
                user_id=user_id, category_name=category_name
            )
        ).scalar_one_or_none()

    def create_category_in_user(self, category):
        db.session.add(category)
        db.session.commit()

        return category
