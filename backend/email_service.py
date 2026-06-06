# backend/email_service.py
import os
import asyncio
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from dotenv import load_dotenv
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from sqlalchemy.ext.asyncio import AsyncSession

from .models import EmailToken, User

logger = logging.getLogger(__name__)

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

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
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


def _send_bg(coro) -> None:
    """Запускает корутину как фоновую задачу — не блокирует запрос."""
    try:
        loop = asyncio.get_event_loop()
        loop.create_task(coro)
    except RuntimeError:
        asyncio.run(coro)


async def _send(subject: str, recipients: list[str], body: str) -> None:
    """Внутренняя отправка. При ошибке логирует, но не падает."""
    if not _mailer:
        logger.info("[DEV email] To: %s | %s", recipients, subject)
        return
    try:
        message = MessageSchema(
            subject=subject,
            recipients=recipients,
            body=body,
            subtype=MessageType.html,
        )
        await _mailer.send_message(message)
    except Exception as e:
        logger.error("Email send error (%s → %s): %s", subject, recipients, e)


def _wrap(text: str) -> str:
    """Минимальная HTML-обёртка для письма."""
    return f"""<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;color:#1f2937;background:#f9fafb;margin:0;padding:24px">
<div style="max-width:540px;margin:0 auto;background:#fff;border-radius:16px;
            border:1px solid #e5e7eb;padding:32px">
  <div style="margin-bottom:24px">
    <span style="font-size:22px;font-weight:900;color:#7c3aed">TutorSpace</span>
  </div>
  {text}
  <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0">
  <p style="font-size:12px;color:#9ca3af;margin:0">
    Письмо отправлено автоматически — не отвечайте на него.
  </p>
</div>
</body></html>"""


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


# ── Уведомления о событиях (фоновая отправка) ─────────────────────────────────

def notify_new_lesson(student: User, lesson_date: datetime, topic: Optional[str],
                      duration: int, tutor_name: str) -> None:
    """Уведомление ученику о новом занятии."""
    date_str = lesson_date.strftime("%d.%m.%Y в %H:%M")
    topic_str = topic or "Занятие"
    body = _wrap(f"""
        <h2 style="margin:0 0 8px;font-size:20px">Новое занятие запланировано</h2>
        <p style="color:#6b7280;margin:0 0 20px">Репетитор <strong>{tutor_name}</strong> создал занятие</p>
        <div style="background:#f5f3ff;border-radius:12px;padding:16px 20px;margin-bottom:20px">
          <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#7c3aed">{topic_str}</p>
          <p style="margin:0;color:#4b5563">📅 {date_str} · {duration} мин</p>
        </div>
        <a href="{FRONTEND_URL}/dashboard/student/schedule"
           style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;
                  padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px">
          Открыть расписание
        </a>
    """)
    _send_bg(_send(f"TutorSpace — {topic_str} {date_str}", [student.email], body))


def notify_homework_assigned(student: User, description: str,
                              deadline: datetime, tutor_name: str) -> None:
    """Уведомление ученику о новом задании."""
    deadline_str = deadline.strftime("%d.%m.%Y в %H:%M")
    short_desc = description[:80] + ("…" if len(description) > 80 else "")
    body = _wrap(f"""
        <h2 style="margin:0 0 8px;font-size:20px">Новое домашнее задание</h2>
        <p style="color:#6b7280;margin:0 0 20px">Репетитор <strong>{tutor_name}</strong> назначил задание</p>
        <div style="background:#fffbeb;border-radius:12px;padding:16px 20px;margin-bottom:20px">
          <p style="margin:0 0 8px;font-weight:700;color:#1f2937">{short_desc}</p>
          <p style="margin:0;color:#d97706;font-weight:600">⏰ Дедлайн: {deadline_str}</p>
        </div>
        <a href="{FRONTEND_URL}/dashboard/student/homework"
           style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;
                  padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px">
          Открыть задания
        </a>
    """)
    _send_bg(_send("TutorSpace — новое задание", [student.email], body))


def notify_homework_graded(student: User, description: str,
                            score: float, max_score: float,
                            comment: Optional[str]) -> None:
    """Уведомление ученику об оценке за задание."""
    short_desc = description[:80] + ("…" if len(description) > 80 else "")
    pct = round(score / max_score * 100) if max_score > 0 else 0
    color = "#16a34a" if pct >= 70 else "#d97706" if pct >= 40 else "#dc2626"
    comment_block = (
        f'<div style="background:#f9fafb;border-radius:10px;padding:12px 16px;margin:12px 0">'
        f'<p style="margin:0;font-size:13px;color:#4b5563"><strong>Комментарий:</strong> {comment}</p>'
        f'</div>'
    ) if comment else ""
    body = _wrap(f"""
        <h2 style="margin:0 0 8px;font-size:20px">Задание проверено</h2>
        <p style="color:#6b7280;margin:0 0 16px">{short_desc}</p>
        <div style="background:#f0fdf4;border-radius:12px;padding:16px 20px;margin-bottom:4px;
                    border:1px solid #bbf7d0">
          <p style="margin:0;font-size:28px;font-weight:900;color:{color}">
            {score} / {max_score}
          </p>
          <p style="margin:4px 0 0;color:#6b7280;font-size:13px">{pct}% от максимума</p>
        </div>
        {comment_block}
        <br>
        <a href="{FRONTEND_URL}/dashboard/student/homework"
           style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;
                  padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px">
          Посмотреть результат
        </a>
    """)
    _send_bg(_send("TutorSpace — задание проверено", [student.email], body))


def notify_deadline_reminder(student: User, description: str,
                              hours_left: int) -> None:
    """Напоминание о приближающемся дедлайне."""
    short_desc = description[:80] + ("…" if len(description) > 80 else "")
    if hours_left <= 1:
        urgency = "🔴 Остался 1 час!"
        bg = "#fef2f2"
        border = "#fecaca"
        text_color = "#dc2626"
    else:
        urgency = f"🟡 Осталось {hours_left} часов"
        bg = "#fffbeb"
        border = "#fde68a"
        text_color = "#d97706"
    body = _wrap(f"""
        <h2 style="margin:0 0 8px;font-size:20px">Скоро дедлайн!</h2>
        <div style="background:{bg};border:1px solid {border};border-radius:12px;
                    padding:16px 20px;margin-bottom:20px">
          <p style="margin:0 0 6px;font-weight:700;color:{text_color}">{urgency}</p>
          <p style="margin:0;color:#1f2937">{short_desc}</p>
        </div>
        <p style="color:#6b7280;font-size:14px">Не забудьте сдать задание вовремя!</p>
        <a href="{FRONTEND_URL}/dashboard/student/homework"
           style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;
                  padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px">
          Сдать задание
        </a>
    """)
    _send_bg(_send("TutorSpace — дедлайн скоро!", [student.email], body))
