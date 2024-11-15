from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_smorest import Api
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()
api = Api()
cors = CORS()
