from __future__ import annotations

from flask.views import MethodView
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_smorest import Blueprint

from todo_api.application.use_cases.create_task import CreateTask, CreateTaskInput
from todo_api.application.use_cases.delete_task import DeleteTask
from todo_api.application.use_cases.list_archived_tasks import ListArchivedTasks
from todo_api.application.use_cases.list_tasks import ListTasks
from todo_api.application.use_cases.toggle_archive import ToggleArchive
from todo_api.application.use_cases.update_task import UpdateTask, UpdateTaskInput
from todo_api.domain.enums import TaskStatus
from todo_api.infrastructure.web.schemas import TaskSchema, UpdateTaskSchema


def create_tasks_blueprint(
    *,
    create_task: CreateTask,
    list_tasks: ListTasks,
    list_archived_tasks: ListArchivedTasks,
    update_task: UpdateTask,
    delete_task: DeleteTask,
    toggle_archive: ToggleArchive,
) -> Blueprint:
    """Inbound adapter for tasks. Every route resolves the owner from the JWT."""
    bp = Blueprint("tasks", __name__)

    @bp.route("/tasks")
    class Tasks(MethodView):
        @jwt_required()
        @bp.arguments(TaskSchema)
        @bp.response(201)
        def post(self, data):
            create_task.execute(
                CreateTaskInput(
                    user_id=int(get_jwt_identity()),
                    title=data["title"],
                    content=data["content"],
                    status=TaskStatus(data["status"]),
                    tag_id=data["tag_id"],
                    due_date=data.get("due_date"),
                )
            )

    @bp.route("/tasks/user")
    class TasksOnUser(MethodView):
        @jwt_required()
        @bp.response(200, TaskSchema(many=True))
        def get(self):
            return list_tasks.execute(int(get_jwt_identity()))

    @bp.route("/tasks/user/archived")
    class ArchivedTasksOnUser(MethodView):
        @jwt_required()
        @bp.response(200, TaskSchema(many=True))
        def get(self):
            return list_archived_tasks.execute(int(get_jwt_identity()))

    @bp.route("/tasks/<task_id>/toggle-archive")
    class TaskToggleArchive(MethodView):
        @jwt_required()
        @bp.response(200)
        def patch(self, task_id):
            toggle_archive.execute(int(task_id), int(get_jwt_identity()))

    @bp.route("/tasks/<task_id>")
    class TaskById(MethodView):
        @jwt_required()
        @bp.arguments(UpdateTaskSchema)
        @bp.response(200)
        def put(self, data, task_id):
            update_task.execute(
                UpdateTaskInput(
                    task_id=int(task_id),
                    user_id=int(get_jwt_identity()),
                    title=data["title"],
                    content=data["content"],
                    status=TaskStatus(data["status"]),
                    due_date=data.get("due_date"),
                    update_due_date="due_date" in data,
                )
            )

        @jwt_required()
        @bp.response(204)
        def delete(self, task_id):
            delete_task.execute(int(task_id), int(get_jwt_identity()))

    return bp
