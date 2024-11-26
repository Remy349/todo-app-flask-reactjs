from flask_jwt_extended import jwt_required
from flask_smorest import Blueprint
from flask.views import MethodView
from flaskr.controllers.task_controller import TaskController
from flaskr.schemas.schema import TaskSchema

bp = Blueprint("tasks", __name__)


@bp.route("/tasks")
class Tasks(MethodView):
    @jwt_required()
    @bp.arguments(TaskSchema)
    @bp.response(201)
    def post(self, data):
        """Protected route (JWT Required)"""
        return TaskController.create(data)


@bp.route("/tasks/user")
class TasksOnUser(MethodView):
    @jwt_required()
    @bp.response(200, TaskSchema(many=True))
    def get(self):
        """Protected route (JWT Required)"""
        return TaskController.get_all_on_user()
