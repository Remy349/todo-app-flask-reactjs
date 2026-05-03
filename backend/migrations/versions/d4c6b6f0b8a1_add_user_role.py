"""add_user_role

Revision ID: d4c6b6f0b8a1
Revises: cac5cf55cffa
Create Date: 2026-04-30 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "d4c6b6f0b8a1"
down_revision = "cac5cf55cffa"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("role", sa.String(length=20), nullable=False, server_default="user")
        )

    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.alter_column("role", server_default=None)


def downgrade():
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("role")
