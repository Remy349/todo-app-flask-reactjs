from flaskr.schemas.plain_schema import (
    PlainSignInSchema,
    PlainTagSchema,
    PlainUserSchema,
)


class UserSchema(PlainUserSchema):
    pass


class SignInSchema(PlainSignInSchema):
    pass


class TagSchema(PlainTagSchema):
    pass
