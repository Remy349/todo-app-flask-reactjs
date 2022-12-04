import sqlalchemy as sa
from datetime import datetime
from flaskr import db


class Task(db.Model):
    id_task = sa.Column(sa.Integer, primary_key=True, nullable=False)
    title = sa.Column(sa.String(50), nullable=False)
    description = sa.Column(sa.String(150), nullable=False)
    timestamp = sa.Column(sa.DateTime, index=True, default=datetime.utcnow)

    def __repr__(self):
        return f"""
            task:
                id_task: {self.id_task},
                title: {self.title},
                description: {self.description},
                timestamp: {self.timestamp}
        """
