from marshmallow import Schema, fields


class PlainUserSchema(Schema):
    id = fields.Int(dump_only=True)
    email = fields.Email(required=True)
    password = fields.Str(required=True, load_only=True)
    created_at = fields.DateTime(dump_only=True)


class PlainCategorySchema(Schema):
    id = fields.Int(dump_only=True)
    category_name = fields.Str(required=True)
    created_at = fields.DateTime(dump_only=True)
