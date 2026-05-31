# backend/routers/notifications.py
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from ..database import get_db
from ..models import PushSubscription, User
from ..schemas import PushSubscribeRequest
from ..security import get_current_user
from ..push import VAPID_PUBLIC_KEY

router = APIRouter(prefix="/notifications", tags=["notifications"])


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
