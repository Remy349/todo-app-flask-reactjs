from flaskr import create_app
# Change 'db' to '*' to import everything from extensions
from flaskr.extensions import *
from flaskr.models.user_model import UserModel
from flaskr.models.task_model import TaskModel
from flaskr.models.tag_model import TagModel

app = create_app()

with app.app_context():
    print("Connecting to database...")
    # If the error persists, check if it's named 'database' below
    try:
        db.create_all() 
    except NameError:
        database.create_all()
        
    print("Database tables created successfully!")