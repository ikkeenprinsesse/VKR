"""forum refactor: drop homework_id, add tag

Revision ID: forum_refactor_001
Revises: 86fba1c15676
Create Date: 2026-06-05

"""
from alembic import op
import sqlalchemy as sa

revision = 'forum_refactor_001'
down_revision = '86fba1c15676'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Добавляем tag
    op.add_column('forum_threads', sa.Column('tag', sa.String(), nullable=True))

    # Убираем homework_id (был nullable, просто дропаем)
    with op.batch_alter_table('forum_threads') as batch_op:
        try:
            batch_op.drop_constraint('forum_threads_homework_id_fkey', type_='foreignkey')
        except Exception:
            pass
        try:
            batch_op.drop_column('homework_id')
        except Exception:
            pass


def downgrade() -> None:
    op.drop_column('forum_threads', 'tag')
    op.add_column('forum_threads', sa.Column('homework_id', sa.Integer(), nullable=True))
