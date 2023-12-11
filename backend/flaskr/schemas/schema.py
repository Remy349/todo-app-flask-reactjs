from marshmallow import Schema, fields
from flaskr.schemas.plain_schema import PlainCategorySchema, PlainUserSchema


class SignInSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True)


class UserSchema(PlainUserSchema):
    pass


class CategorySchema(PlainCategorySchema):
    user_id = fields.Int(required=True, load_only=True)
