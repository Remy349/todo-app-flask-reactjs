from marshmallow import fields
from flaskr.schemas.plain_schema import (
    PlainSignInSchema,
    PlainTagSchema,
    PlainTaskSchema,
    PlainUserSchema,
)


class UserSchema(PlainUserSchema):
    pass


class SignInSchema(PlainSignInSchema):
    pass


class TagSchema(PlainTagSchema):
    pass


class TaskSchema(PlainTaskSchema):
    tag_name = fields.Str(dump_only=True, data_key="tagName")
    tag_id = fields.Int(required=True, load_only=True, data_key="tagId")


class UpdateTaskSchema(PlainTaskSchema):
    pass
