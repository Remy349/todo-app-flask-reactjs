from werkzeug.security import check_password_hash, generate_password_hash


class WerkzeugPasswordHasher:
    """Hasher adapter. `verify` autodetects legacy pbkdf2 hashes."""

    def hash(self, password: str) -> str:
        return generate_password_hash(password, method="scrypt")

    def verify(self, password: str, password_hash: str) -> bool:
        return check_password_hash(password_hash, password)
