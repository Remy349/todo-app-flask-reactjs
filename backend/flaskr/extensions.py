from flask_migrate import Migrate
from flask_smorest import Api
from flask_cors import CORS

migrate = Migrate()
api = Api()
cors = CORS()
