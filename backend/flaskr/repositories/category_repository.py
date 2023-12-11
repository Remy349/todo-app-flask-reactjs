from sqlalchemy import select
from flaskr.extensions import db
from flaskr.models.category_model import CategoryModel


class CategoryRepository:
    def get_categories(self):
        return db.session.execute(select(CategoryModel)).scalars()

    def create_category(self, category):
        db.session.add(category)
        db.session.commit()

        return category
