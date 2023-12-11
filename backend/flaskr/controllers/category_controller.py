from flask_smorest import Blueprint
from flask.views import MethodView
from flaskr.schemas.schema import CategorySchema
from flaskr.services.category_service import CategoryService

bp = Blueprint("categories", __name__, description="Operations on categories")

category_service = CategoryService()


@bp.route("/categories")
class CategoriesController(MethodView):
    @bp.response(200, CategorySchema(many=True))
    def get(self):
        """Get a list of categories"""
        return category_service.list_categories()

    @bp.arguments(CategorySchema)
    @bp.response(201, CategorySchema)
    def post(self, category_data):
        """Create a new category"""
        return category_service.create_new_category(category_data)
