# backend/routers/email_auth.py
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from ..limiter import limiter
from sqlalchemy import select

from ..database import get_db
from ..models import User, EmailToken
from ..schemas import PasswordResetRequest, PasswordResetConfirm, EmailVerifyRequest
from ..security import get_password_hash, get_current_user
from ..email_service import send_verification_email, send_password_reset_email

router = APIRouter(tags=["auth"])


# ── Верификация email ──────────────────────────────────────────────────────────

@router.post("/auth/send-verification", status_code=202)
async def send_verification(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Отправить письмо с ссылкой подтверждения (повторно)."""
    if current_user.is_verified:
        raise HTTPException(status_code=400, detail="Email уже подтверждён")
    await send_verification_email(current_user, db)
    return {"detail": "Письмо отправлено"}


@router.post("/auth/verify-email", status_code=200)
async def verify_email(
    body: EmailVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """Подтвердить email по токену из письма."""
    result = await db.execute(
        select(EmailToken).where(EmailToken.token == body.token)
    )
    record = result.scalar_one_or_none()

    if not record or record.purpose != "verify" or record.used:
        raise HTTPException(status_code=400, detail="Ссылка недействительна")

    now = datetime.now(timezone.utc)
    expires = record.expires_at if record.expires_at.tzinfo else record.expires_at.replace(tzinfo=timezone.utc)
    if now > expires:
        raise HTTPException(status_code=400, detail="Ссылка истекла")

    user_res = await db.execute(select(User).where(User.id == record.user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    user.is_verified = True
    record.used = True
    await db.commit()
    return {"detail": "Email подтверждён"}


# ── Сброс пароля ───────────────────────────────────────────────────────────────

@router.post("/auth/forgot-password", status_code=202)
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    body: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
):
    """Запросить письмо для сброса пароля."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    # Не раскрываем, существует ли пользователь
    if user:
        await send_password_reset_email(user, db)
    return {"detail": "Если email зарегистрирован, письмо будет отправлено"}


@router.post("/auth/reset-password", status_code=200)
async def reset_password(
    body: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db),
):
    """Установить новый пароль по токену из письма."""
    result = await db.execute(
        select(EmailToken).where(EmailToken.token == body.token)
    )
    record = result.scalar_one_or_none()

    if not record or record.purpose != "reset" or record.used:
        raise HTTPException(status_code=400, detail="Ссылка недействительна")

    now = datetime.now(timezone.utc)
    expires = record.expires_at if record.expires_at.tzinfo else record.expires_at.replace(tzinfo=timezone.utc)
    if now > expires:
        raise HTTPException(status_code=400, detail="Ссылка истекла")

    user_res = await db.execute(select(User).where(User.id == record.user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    user.password_hash = get_password_hash(body.new_password)
    record.used = True
    await db.commit()
    return {"detail": "Пароль успешно изменён"}
