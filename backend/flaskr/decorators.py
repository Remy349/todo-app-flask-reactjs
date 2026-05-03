from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from flask_smorest import abort


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get("role") != "admin":
            abort(403, message="Admins only")
        return fn(*args, **kwargs)
    return wrapper

def role_required(*allowed_roles):
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get("role")

            if user_role not in allowed_roles:
                abort(403, message="Permission denied")

            return fn(*args, **kwargs)

        return decorator

    return wrapper