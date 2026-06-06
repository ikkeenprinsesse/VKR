# backend/routers/notifications.py
import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

from ..database import get_db
from ..models import PushSubscription, Notification, User
from ..schemas import PushSubscribeRequest
from ..security import get_current_user
from ..push import VAPID_PUBLIC_KEY

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    body: Optional[str] = None
    url: Optional[str] = None
    is_read: bool
    created_at: datetime


# ── Центр уведомлений ──────────────────────────────────────────────────────────

@router.get("/my", response_model=List[NotificationOut])
async def get_my_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Последние 50 уведомлений текущего пользователя."""
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    return result.scalars().all()


@router.get("/unread-count")
async def unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Количество непрочитанных уведомлений."""
    from sqlalchemy import func
    result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
    )
    return {"count": result.scalar_one() or 0}


@router.patch("/read-all", status_code=204)
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Пометить все уведомления как прочитанные."""
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()


@router.patch("/{notification_id}/read", status_code=204)
async def mark_one_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Пометить одно уведомление как прочитанное."""
    await db.execute(
        update(Notification)
        .where(Notification.id == notification_id, Notification.user_id == current_user.id)
        .values(is_read=True)
    )
    await db.commit()


@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """Отдаёт публичный VAPID-ключ для регистрации подписки в браузере."""
    if not VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=503, detail="Push-уведомления не настроены")
    return {"public_key": VAPID_PUBLIC_KEY}


@router.post("/subscribe", status_code=201)
async def subscribe(
    data: PushSubscribeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Зарегистрировать push-подписку браузера."""
    # обновляем если endpoint уже есть
    result = await db.execute(
        select(PushSubscription).where(PushSubscription.endpoint == data.endpoint)
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.user_id = current_user.id
        existing.p256dh = data.p256dh
        existing.auth = data.auth
    else:
        sub = PushSubscription(
            user_id=current_user.id,
            endpoint=data.endpoint,
            p256dh=data.p256dh,
            auth=data.auth,
        )
        db.add(sub)

    await db.commit()
    return {"status": "subscribed"}


@router.delete("/unsubscribe", status_code=204)
async def unsubscribe(
    data: PushSubscribeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Удалить push-подписку (при выходе или отзыве разрешения)."""
    await db.execute(
        delete(PushSubscription).where(
            PushSubscription.endpoint == data.endpoint,
            PushSubscription.user_id == current_user.id,
        )
    )
    await db.commit()
