from __future__ import annotations

from flask.views import MethodView
from flask_smorest import Blueprint

from todo_api.application.use_cases.create_tag import CreateTag, CreateTagInput
from todo_api.application.use_cases.list_tags import ListTags
from todo_api.infrastructure.web.schemas import TagSchema


def create_tags_blueprint(*, list_tags: ListTags, create_tag: CreateTag) -> Blueprint:
    """Inbound adapter for tags."""
    bp = Blueprint("tags", __name__)

    @bp.route("/tags")
    class Tags(MethodView):
        @bp.response(200, TagSchema(many=True))
        def get(self):
            return list_tags.execute()

        @bp.arguments(TagSchema)
        @bp.response(201)
        def post(self, data):
            create_tag.execute(CreateTagInput(name=data["name"]))

    return bp
