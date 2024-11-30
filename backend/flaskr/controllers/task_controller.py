from flask_jwt_extended import get_jwt_identity
from flask_smorest import abort
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound, SQLAlchemyError
from flaskr.db import db
from flaskr.models.tag_model import TagModel
from flaskr.models.task_model import TaskModel


class TaskController:
    @staticmethod
    def get_all_on_user():
        try:
            user_id = get_jwt_identity()

            return (
                db.session.query(
                    TaskModel.id,
                    TaskModel.title,
                    TaskModel.content,
                    TaskModel.status,
                    TaskModel.created_at,
                    TagModel.name.label("tag_name"),
                )
                .where(user_id == user_id)
                .join(TagModel, TaskModel.tag_id == TagModel.id)
                .all()
            )
        except SQLAlchemyError:
            abort(500, message="Internal server error while fetching tasks on user")

    @staticmethod
    def create(data):
        try:
            user_id = get_jwt_identity()

            print(data)

            create_data = {"user_id": user_id, **data}

            new_task = TaskModel(**create_data)

            db.session.add(new_task)
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            abort(500, message="Internal server error while creating task")

    @staticmethod
    def update(data, task_id):
        try:
            task = db.session.execute(
                select(TaskModel).where(TaskModel.id == task_id)
            ).scalar_one()

            task.title = data["title"]
            task.content = data["content"]
            task.status = data["status"]

            db.session.add(task)
            db.session.commit()
        except NoResultFound:
            abort(404, message="Task not found")
        except SQLAlchemyError:
            db.session.rollback()
            abort(500, message="Internal server error while updating task")

    @staticmethod
    def delete(task_id):
        try:
            task = db.session.execute(
                select(TaskModel).where(TaskModel.id == task_id)
            ).scalar_one()

            db.session.delete(task)
            db.session.commit()
        except NoResultFound:
            abort(404, message="Task not found")
        except SQLAlchemyError:
            db.session.rollback()
            abort(500, message="Internal server error while deleting task")
