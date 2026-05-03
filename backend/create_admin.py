from sqlalchemy import select

from flaskr import create_app
from flaskr.db import db
from flaskr.models.user_model import UserModel
from flaskr.utils import generate_password


ADMIN_ACCOUNTS = [
    {
        "username": "viewer_admin",
        "email": "viewer.admin@example.com",
        "password": "viewer123",
        "role": "admin_viewer",
    },
    {
        "username": "manager_admin",
        "email": "manager.admin@example.com",
        "password": "manager123",
        "role": "admin_manager",
    },
    {
        "username": "admin",
        "email": "admin@example.com",
        "password": "admin123",
        "role": "admin_manager",
    },
]


def upsert_admin(account):
    admin = db.session.execute(
        select(UserModel).where(UserModel.email == account["email"])
    ).scalar_one_or_none()

    if admin:
        admin.username = account["username"]
        admin.role = account["role"]
        admin.password = generate_password(account["password"])
        return "updated"

    admin = UserModel(
        username=account["username"],
        email=account["email"],
        password=generate_password(account["password"]),
        role=account["role"],
    )
    db.session.add(admin)
    return "created"


def create_admins():
    app = create_app()

    with app.app_context():
        for account in ADMIN_ACCOUNTS:
            status = upsert_admin(account)
            print(f"{account['email']} {status} as {account['role']}")

        db.session.commit()
        print("\nAdmin accounts:")
        for account in ADMIN_ACCOUNTS:
            print(f"{account['email']} / {account['password']} / {account['role']}")


if __name__ == "__main__":
    create_admins()
