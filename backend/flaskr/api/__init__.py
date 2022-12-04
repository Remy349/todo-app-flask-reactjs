from flask import Blueprint

bp = Blueprint("api", __name__)

from flaskr.api import tasks
