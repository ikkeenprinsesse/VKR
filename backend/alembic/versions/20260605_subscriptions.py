"""add subscriptions table

Revision ID: subscriptions_001
Revises: forum_refactor_001
Create Date: 2026-06-05

"""
from alembic import op
import sqlalchemy as sa

revision = 'subscriptions_001'
down_revision = 'forum_refactor_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tutor_id', sa.Integer(), nullable=False),
        sa.Column('plan', sa.Enum('free', 'pro_monthly', 'pro_annual', name='plantype'), nullable=False, server_default='free'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['tutor_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tutor_id'),
    )
    op.create_index(op.f('ix_subscriptions_id'), 'subscriptions', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_subscriptions_id'), table_name='subscriptions')
    op.drop_table('subscriptions')
    op.execute("DROP TYPE IF EXISTS plantype")
