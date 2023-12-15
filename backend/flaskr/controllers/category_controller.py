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

    @jwt_required()
    @bp.arguments(CategorySchema)
    @bp.response(201, CategorySchema)
    def post(self, category_data, user_id):
        """Create a new category in a user"""
        return category_service.create_new_category_in_user(
            category_data,
            user_id,
        )
