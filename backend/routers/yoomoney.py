# backend/routers/yoomoney.py
"""
Интеграция с ЮMoney Quick Pay Form.

Схема работы:
  1. Репетитор указывает номер кошелька и секрет вебхука в настройках.
  2. GET /yoomoney/link/{lesson_id}?amount=X  →  URL для перехода на форму ЮMoney.
  3. Ученик оплачивает → ЮMoney шлёт POST /yoomoney/webhook.
  4. Вебхук верифицирует подпись SHA-1, находит Payment по label и ставит статус paid.

Документация Quick Pay: https://yoomoney.ru/docs/payment-buttons/using-api/forms
Документация вебхука:   https://yoomoney.ru/docs/payment-buttons/using-api/notifications
"""

import hashlib
from urllib.parse import urlencode
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Form
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from ..database import get_db
from ..models import Lesson, Payment, PaymentStatus, User, Role
from ..security import get_current_user
import os

router = APIRouter(prefix="/yoomoney", tags=["yoomoney"])

YOOMONEY_QUICKPAY_URL = "https://yoomoney.ru/quickpay/confirm.xml"


# ── Schemas ────────────────────────────────────────────────────────────────────

class PaymentLinkResponse(BaseModel):
    url: str
    amount: float
    label: str
    wallet: str


# ── Helpers ────────────────────────────────────────────────────────────────────

def build_payment_url(wallet: str, amount: float, label: str, description: str, success_url: Optional[str] = None) -> str:
    params = {
        "receiver":       wallet,
        "quickpay-form":  "shop",
        "targets":        description,
        "paymentType":    "AC",          # банковская карта
        "sum":            str(amount),
        "label":          label,
        "formcomment":    description,
        "short-dest":     description,
    }
    if success_url:
        params["successURL"] = success_url
    return f"{YOOMONEY_QUICKPAY_URL}?{urlencode(params)}"


def verify_webhook_signature(
    notification_type: str,
    operation_id: str,
    amount: str,
    currency: str,
    datetime_str: str,
    sender: str,
    codepro: str,
    secret: str,
    label: str,
    received_hash: str,
) -> bool:
    """Верифицирует подпись SHA-1 от ЮMoney."""
    data = "&".join([
        notification_type, operation_id, amount, currency,
        datetime_str, sender, codepro, secret, label,
    ])
    expected = hashlib.sha1(data.encode("utf-8")).hexdigest()
    return expected == received_hash


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/link/{lesson_id}", response_model=PaymentLinkResponse)
async def get_payment_link(
    lesson_id: int,
    amount: float,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Генерирует ссылку на форму оплаты ЮMoney.
    Доступно и репетитору (чтобы отправить ученику), и ученику (для самостоятельной оплаты).
    """
    # загружаем занятие
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Занятие не найдено")

    # проверяем доступ
    if current_user.role == Role.tutor and lesson.tutor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нет доступа к этому занятию")
    if current_user.role == Role.student and lesson.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нет доступа к этому занятию")

    # кошелёк берём у репетитора занятия
    tutor_result = await db.execute(select(User).where(User.id == lesson.tutor_id))
    tutor = tutor_result.scalar_one_or_none()

    if not tutor or not tutor.yoomoney_wallet:
        raise HTTPException(
            status_code=400,
            detail="Репетитор не настроил кошелёк ЮMoney. Попросите его добавить кошелёк в настройках."
        )

    label = f"lesson_{lesson_id}"
    description = f"Занятие {lesson.topic or ''} — {lesson.duration} мин".strip()

    url = build_payment_url(
        wallet=tutor.yoomoney_wallet,
        amount=amount,
        label=label,
        description=description,
    )

    # Создаём/обновляем запись о платеже (статус pending)
    existing = await db.execute(select(Payment).where(Payment.lesson_id == lesson_id))
    payment = existing.scalar_one_or_none()
    if not payment:
        payment = Payment(
            lesson_id=lesson_id,
            amount=amount,
            status=PaymentStatus.pending,
        )
        db.add(payment)
    else:
        payment.amount = amount
        payment.status = PaymentStatus.pending
    await db.commit()

    return PaymentLinkResponse(url=url, amount=amount, label=label, wallet=tutor.yoomoney_wallet)


@router.post("/webhook")
async def yoomoney_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    notification_type: str = Form(...),
    operation_id:      str = Form(...),
    amount:            str = Form(...),
    currency:          str = Form(...),
    datetime:          str = Form(...),  # noqa: A002 (shadowing builtin is fine for Form)
    sender:            str = Form(default=""),
    codepro:           str = Form(...),
    sha1_hash:         str = Form(...),
    label:             str = Form(default=""),
):
    """
    Принимает уведомление об оплате от ЮMoney.
    Документация: https://yoomoney.ru/docs/payment-buttons/using-api/notifications
    """
    # Обработка платежа за подписку
    if label.startswith("subscription_"):
        # label = subscription_{plan}_{tutor_id}
        parts = label.split("_", 2)
        if len(parts) == 3:
            plan_key = parts[1]
            try:
                tutor_id = int(parts[2])
            except ValueError:
                return JSONResponse({"ok": True})

            from ..routers.subscriptions import _activate_subscription, PLANS
            if plan_key in PLANS:
                await _activate_subscription(db, tutor_id, plan_key)
        return JSONResponse({"ok": True})

    if not label.startswith("lesson_"):
        # Не наш платёж
        return JSONResponse({"ok": True})

    try:
        lesson_id = int(label.split("_")[1])
    except (IndexError, ValueError):
        return JSONResponse({"ok": True})

    # Находим занятие и репетитора, чтобы взять секрет
    lesson_result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = lesson_result.scalar_one_or_none()
    if not lesson:
        return JSONResponse({"ok": True})

    tutor_result = await db.execute(select(User).where(User.id == lesson.tutor_id))
    tutor = tutor_result.scalar_one_or_none()

    # Если секрет не настроен — доверяем без проверки (dev-режим)
    secret = tutor.yoomoney_secret or ""

    if secret:
        if not verify_webhook_signature(
            notification_type, operation_id, amount, currency,
            datetime, sender, codepro, secret, label, sha1_hash,
        ):
            raise HTTPException(status_code=400, detail="Неверная подпись вебхука")

    # Помечаем платёж как оплаченный
    pay_result = await db.execute(select(Payment).where(Payment.lesson_id == lesson_id))
    payment = pay_result.scalar_one_or_none()
    if payment:
        payment.status = PaymentStatus.paid
        payment.amount = float(amount)
        from datetime import datetime as dt, timezone
        payment.payment_date = dt.now(tz=timezone.utc)
        payment.payment_method = "ЮMoney"
        await db.commit()

    return JSONResponse({"ok": True})
