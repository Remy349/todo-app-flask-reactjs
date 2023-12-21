from flask_jwt_extended import jwt_required
from flask_smorest import Blueprint
from flask.views import MethodView
from flaskr.schemas.schema import CategorySchema
from flaskr.services.category_service import CategoryService

bp = Blueprint("categories", __name__, description="Operations on categories")

category_service = CategoryService()


@bp.route("/users/<user_id>/categories")
class CategoriesInUserController(MethodView):
    @bp.response(200, CategorySchema(many=True))
    def get(self, user_id):
        """Get a list of a user´s categories"""
        return category_service.list_categories_in_user(user_id)


@bp.route("/categories/<category_id>")
class CategoryController(MethodView):
    @bp.response(204)
    def delete(self, category_id):
        """Delete a category by ID"""
        return category_service.remove_category_by_id(category_id)


@bp.route("/categories")
class CategoriesController(MethodView):
    @jwt_required()
    @bp.arguments(CategorySchema)
    @bp.response(201, CategorySchema)
    def post(self, category_data):
        """Create a new category"""
        return category_service.create_new_category(category_data)
