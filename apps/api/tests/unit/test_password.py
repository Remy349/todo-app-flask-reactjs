from todo_api.infrastructure.security.password_hasher import WerkzeugPasswordHasher


def test_hash_can_be_verified_with_the_original_password():
    hasher = WerkzeugPasswordHasher()

    password_hash = hasher.hash("correct horse battery staple")

    assert hasher.verify("correct horse battery staple", password_hash) is True


def test_verify_rejects_a_wrong_password():
    hasher = WerkzeugPasswordHasher()
    password_hash = hasher.hash("correct horse battery staple")

    assert hasher.verify("wrong password", password_hash) is False


def test_hash_is_not_the_plaintext_password():
    hasher = WerkzeugPasswordHasher()
    password = "correct horse battery staple"

    assert hasher.hash(password) != password
