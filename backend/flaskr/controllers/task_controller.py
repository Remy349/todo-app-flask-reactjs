from flask_jwt_extended import get_jwt_identity
from flask_smorest import abort
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from flaskr.db import db
from flaskr.models.task_model import TaskModel


class TaskController:
    @staticmethod
    def get_all_on_user():
        try:
            user_id = get_jwt_identity()

            print(user_id)

            return (
                db.session.execute(
                    select(TaskModel).where(TaskModel.user_id == user_id)
                )
                .scalars()
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
