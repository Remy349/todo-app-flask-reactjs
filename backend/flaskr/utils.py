import bcrypt
import hashlib
from functools import wraps
from flask_jwt_extended import get_jwt, verify_jwt_in_request
from flask_smorest import abort


PEPPER = "mysupersecretpepper123"


def hash_sha256(text):
    return hashlib.sha256(text.encode()).hexdigest()

def hash_md5(text):
    return hashlib.md5(text.encode()).hexdigest()


def generate_password(password):
    sha256_hashed = hash_sha256(password)
    print(f"SHA-256: {sha256_hashed}")
    password_peppered = (sha256_hashed + PEPPER).encode()[:72]
    hashed = bcrypt.hashpw(password_peppered, bcrypt.gensalt())
    return hashed.decode("utf-8")


def check_password(stored_password, password):
    sha256_hashed = hash_sha256(password)
    password_peppered = (sha256_hashed + PEPPER).encode()[:72]
    return bcrypt.checkpw(password_peppered, stored_password.encode("utf-8"))


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