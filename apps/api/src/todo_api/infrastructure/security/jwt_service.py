from flask_jwt_extended import create_access_token


class FlaskJwtTokenService:
    def create(self, user_id: int) -> str:
        return create_access_token(identity=str(user_id))
