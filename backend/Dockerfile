FROM python:3.11-slim

WORKDIR /app

# Системные зависимости для asyncpg и bcrypt
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Копируем requirements из папки backend (контекст — корень проекта)
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Копируем весь проект (uvicorn запускается как "backend.main:app")
COPY backend/ ./backend/
COPY alembic.ini ./alembic.ini

# Папка для загружаемых файлов
RUN mkdir -p /app/uploads

EXPOSE 8000

COPY backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
