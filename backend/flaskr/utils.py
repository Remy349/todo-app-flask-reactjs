from werkzeug.security import generate_password_hash, check_password_hash


def generate_password(password):
    return generate_password_hash(password, salt_length=10)


def check_password(password_hash, password):
    return check_password_hash(password_hash, password)
