from flaskr.api import bp
from flaskr import db
from flask import jsonify, request
from flaskr.api.errors import bad_request

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
    data = request.get_json() or {}

    if "title" not in data or "description" not in data:
        return bad_request("Must include title and description fields!")

    task = Task()
    task.from_dict(data)

    db.session.add(task)
    db.session.commit()

    response = jsonify(task.to_dict())
    response.status_code = 201

    return response


@bp.route("/tasks/<int:id_task>", methods=["PUT"])
def update_task(id_task):
    data = request.get_json() or {}
    task = db.get_or_404(Task, id_task)

    task.from_dict(data)

    db.session.commit()

    return jsonify(task.to_dict())


@bp.route("/tasks/<int:id_task>", methods=["DELETE"])
def delete_task(id_task):
    task = db.get_or_404(Task, id_task)

    db.session.delete(task)
    db.session.commit()

    return "", 204
