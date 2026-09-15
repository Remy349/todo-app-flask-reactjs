from flask_smorest import abort
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from flaskr.db import db
from flaskr.models.tag_model import TagModel


class TagController:
    @staticmethod
    def get_all():
        try:
            return db.session.execute(select(TagModel).limit(15)).scalars().all()
        except SQLAlchemyError:
            abort(500, message="Internal server error while fetching tags")

    @staticmethod
    def create(data):
        try:
            tag_registered = db.session.execute(
                select(TagModel).where(TagModel.name == data["name"])
            ).scalar_one_or_none()

            if tag_registered:
                abort(409, message="Tag already registered")

            new_tag = TagModel(**data)

            db.session.add(new_tag)
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            abort(500, message="Internal server error while creating tag")
