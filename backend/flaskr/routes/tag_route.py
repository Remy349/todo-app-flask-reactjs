from flask.views import MethodView
from flask_jwt_extended import jwt_required
from flask_smorest import Blueprint
from flaskr.controllers.tag_controller import TagController
from flaskr.schemas.schema import TagSchema
from flaskr.utils import role_required

bp = Blueprint("tags", __name__)


@bp.route("/tags")
class Tags(MethodView):
    @bp.response(200, TagSchema(many=True))
    def get(self):
        return TagController.get_all()

    @bp.arguments(TagSchema)
    @jwt_required()
    @role_required("admin", "admin_manager")
    @bp.response(201)
    def post(self, data):
        """Admin route (JWT + admin role required)"""
        return TagController.create(data)
