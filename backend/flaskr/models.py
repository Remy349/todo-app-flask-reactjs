from flask import url_for
import sqlalchemy as sa
from datetime import datetime
from flaskr import db


class Task(db.Model):
    id_task = sa.Column(sa.Integer, primary_key=True, nullable=False)
    title = sa.Column(sa.String(50), nullable=False)
    description = sa.Column(sa.String(150), nullable=False)
    timestamp = sa.Column(sa.DateTime, index=True, default=datetime.utcnow)

    def to_dict(self):
        data = {
            "id_task": self.id_task,
            "title": self.title,
            "description": self.description,
            "timestamp": self.timestamp
        }

        return data

    def from_dict(self, data):
        for field in ["title", "description"]:
            if field in data:
                setattr(self, field, data[field])

    @staticmethod
    def to_collection_dict(query, page, per_page, endpoint, **kwargs):
        resources = db.paginate(
            query, page=page, per_page=per_page, error_out=False)

        data = {
            "items": [item.to_dict() for item in resources.items],
            "meta": {
                "page": page,
                "per_page": per_page,
                "total_pages": resources.pages,
                "total_items": resources.total
            },
            "links": {
                "self": url_for(endpoint, page=page, per_page=per_page,
                                **kwargs),
                "next": url_for(endpoint, page=page + 1, per_page=per_page,
                                **kwargs) if resources.has_next else None,
                "prev": url_for(endpoint, page=page - 1, per_page=per_page,
                                **kwargs) if resources.has_prev else None
            }
        }

        return data

    def __repr__(self):
        return f"""
            task:
                id_task: {self.id_task},
                title: {self.title},
                description: {self.description},
                timestamp: {self.timestamp}
        """
