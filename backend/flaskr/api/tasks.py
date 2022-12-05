from flaskr.api import bp
from flaskr import db
from flask import jsonify, request

from flaskr.models import Task


@bp.route("/tasks/<int:id_task>", methods=["GET"])
def get_task(id_task):
    task = db.get_or_404(Task, id_task)

    return jsonify(task.to_dict())


@bp.route("/tasks", methods=["GET"])
def get_tasks():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 6, type=int), 100)

    data = Task.to_collection_dict(db.select(Task).order_by(
        Task.id_task), page, per_page, "api.get_tasks")

    return data


@bp.route("/tasks", methods=["POST"])
def create_task():
    return "Create a task"


@bp.route("/tasks/<int:id_task>", methods=["PUT"])
def update_task(id_task):
    return f"Update task: {id_task}"


@bp.route("/tasks/<int:id_task>", methods=["DELETE"])
def delete_task(id_task):
    return f"Delete task: {id_task}"
