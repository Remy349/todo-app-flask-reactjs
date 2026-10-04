from marshmallow import Schema, fields, validate


class PlainUserSchema(Schema):
    id = fields.Int(dump_only=True)
    username = fields.Str(required=True)
    email = fields.Email(required=True)
    password = fields.Str(required=True, load_only=True)


class UserSchema(PlainUserSchema):
    pass


class SignInSchema(Schema):
    email = fields.Str(required=True)
    password = fields.Str(required=True)


class TagSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True)


class PlainTaskSchema(Schema):
    id = fields.Int(dump_only=True)
    title = fields.Str(required=True)
    content = fields.Str(required=True)
    status = fields.Str(
        validate=validate.OneOf(["PENDING", "IN_PROGRESS", "COMPLETED"]), required=True
    )
    due_date = fields.DateTime(allow_none=True, data_key="dueDate")
    is_archived = fields.Bool(dump_only=True, data_key="isArchived")
    created_at = fields.DateTime(dump_only=True, data_key="createdAt")


class TaskSchema(PlainTaskSchema):
    tag_name = fields.Str(dump_only=True, data_key="tagName")
    tag_id = fields.Int(required=True, load_only=True, data_key="tagId")


class UpdateTaskSchema(PlainTaskSchema):
    pass
