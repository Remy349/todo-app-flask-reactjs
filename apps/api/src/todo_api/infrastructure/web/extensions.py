from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_smorest import Api

migrate = Migrate()
api = Api()
cors = CORS()
jwt = JWTManager()
