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


class AdminTaskSchema(TaskSchema):
    user_id = fields.Int(dump_only=True, data_key="userId")
    username = fields.Str(dump_only=True)
    user_email = fields.Email(dump_only=True, data_key="userEmail")


class UpdateTaskSchema(PlainTaskSchema):
    pass
