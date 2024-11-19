from flaskr.schemas.plain_schema import PlainSignInSchema, PlainUserSchema


class UserSchema(PlainUserSchema):
    pass


class CreateUserSchema(PlainUserSchema):
    pass


class SignInSchema(PlainSignInSchema):
    pass
