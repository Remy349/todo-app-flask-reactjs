from flask_sqlalchemy import SQLAlchemy  # <--- Add this
from flask_migrate import Migrate
from flask_smorest import Api
from flask_cors import CORS
from flask_jwt_extended import JWTManager

db = SQLAlchemy()  
migrate = Migrate()
api = Api()
cors = CORS()
jwt = JWTManager()
