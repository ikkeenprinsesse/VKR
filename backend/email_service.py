# backend/email_service.py
import os
import secrets
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from sqlalchemy.ext.asyncio import AsyncSession

from .models import EmailToken, User

load_dotenv()

_mail_configured = all([
    os.getenv("MAIL_USERNAME"),
    os.getenv("MAIL_PASSWORD"),
    os.getenv("MAIL_FROM"),
    os.getenv("MAIL_SERVER"),
])

if _mail_configured:
    _conf = ConnectionConfig(
        MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
        MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
        MAIL_FROM=os.getenv("MAIL_FROM", "noreply@tutorspace.local"),
        MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME", "TutorSpace"),
        MAIL_PORT=int(os.getenv("MAIL_PORT", "587")),
        MAIL_SERVER=os.getenv("MAIL_SERVER", ""),
        MAIL_STARTTLS=os.getenv("MAIL_STARTTLS", "true").lower() == "true",
        MAIL_SSL_TLS=os.getenv("MAIL_SSL_TLS", "false").lower() == "true",
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True,
    )
    _mailer = FastMail(_conf)
else:
    _mailer = None

FRONTEND_URL = os.getenv("VITE_API_URL", "http://localhost:5173").replace("8000", "5173")
TOKEN_EXPIRE_HOURS = 24


async def _create_token(user_id: int, purpose: str, db: AsyncSession) -> str:
    token = secrets.token_urlsafe(48)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    db.add(EmailToken(user_id=user_id, token=token, purpose=purpose, expires_at=expires_at))
    await db.commit()
    return token


async def send_verification_email(user: User, db: AsyncSession) -> None:
    token = await _create_token(user.id, "verify", db)
    link = f"{FRONTEND_URL}/verify-email?token={token}"

    if not _mailer:
        print(f"[DEV] Верификация email: {link}")
        return

    message = MessageSchema(
        subject="TutorSpace — подтвердите email",
        recipients=[user.email],
        body=(
            f"Здравствуйте, {user.name}!\n\n"
            f"Для подтверждения email перейдите по ссылке:\n{link}\n\n"
            f"Ссылка действительна {TOKEN_EXPIRE_HOURS} часов."
        ),
        subtype=MessageType.plain,
    )
    await _mailer.send_message(message)


async def send_password_reset_email(user: User, db: AsyncSession) -> None:
    token = await _create_token(user.id, "reset", db)
    link = f"{FRONTEND_URL}/reset-password?token={token}"

    if not _mailer:
        print(f"[DEV] Сброс пароля: {link}")
        return

    message = MessageSchema(
        subject="TutorSpace — сброс пароля",
        recipients=[user.email],
        body=(
            f"Здравствуйте, {user.name}!\n\n"
            f"Для сброса пароля перейдите по ссылке:\n{link}\n\n"
            f"Ссылка действительна {TOKEN_EXPIRE_HOURS} часов.\n\n"
            "Если вы не запрашивали сброс пароля — проигнорируйте это письмо."
        ),
        subtype=MessageType.plain,
    )
    await _mailer.send_message(message)
