#!/bin/sh
set -e

echo "Creating tables via SQLAlchemy..."
python -c "
import asyncio
from backend.database import engine, Base
import backend.models  # noqa: F401 — registers all models

async def create():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

asyncio.run(create())
print('Tables ready.')
"

echo "Stamping alembic head (skip migrations, tables already exist)..."
alembic stamp head || true

echo "Starting uvicorn..."
exec uvicorn backend.main:app --host 0.0.0.0 --port 8000
