from flask import Flask
from flaskr.extensions import db
from flaskr.models.user_model import UserModel
from flaskr.models.task_model import TaskModel
from flaskr.models.tag_model import TagModel

# Create a tiny, temporary app just to build the database
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False


db.init_app(app)

with app.app_context():
    print("Force creating tables...")
    db.create_all()
    print("SUCCESS: Database tables created!")