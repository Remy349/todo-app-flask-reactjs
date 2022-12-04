from flaskr.api import bp
from flaskr import db

from flaskr.models import Task


@bp.route("/tasks/<int:id_task>", methods=["GET"])
def get_task(id_task):
    return f"Task: {id_task}"


@bp.route("/tasks", methods=["GET"])
def get_tasks():
    return "All tasks"


@bp.route("/tasks", methods=["POST"])
def create_task():
    return "Create a task"


@bp.route("/tasks/<int:id_task>", methods=["PUT"])
def update_task(id_task):
    return f"Update task: {id_task}"


@bp.route("/tasks/<int:id_task>", methods=["DELETE"])
def delete_task(id_task):
    return f"Delete task: {id_task}"
