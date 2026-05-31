# backend/push.py
import os
import json
import asyncio
from typing import Optional
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from pywebpush import webpush, WebPushException

load_dotenv()

VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_CLAIMS_EMAIL = os.getenv("VAPID_CLAIMS_EMAIL", "admin@tutorspace.local")

_push_enabled = bool(VAPID_PRIVATE_KEY and VAPID_PUBLIC_KEY)


def _send_one(endpoint: str, p256dh: str, auth: str, payload: dict) -> None:
    """Синхронная отправка одного push (запускается в executor)."""
    webpush(
        subscription_info={
            "endpoint": endpoint,
            "keys": {"p256dh": p256dh, "auth": auth},
        },
        data=json.dumps(payload, ensure_ascii=False),
        vapid_private_key=VAPID_PRIVATE_KEY,
        vapid_claims={"sub": f"mailto:{VAPID_CLAIMS_EMAIL}"},
    )


async def send_push(
    *,
    user_id: int,
    title: str,
    body: str,
    db: AsyncSession,
    url: str = "/",
    tag: Optional[str] = None,
) -> None:
    """Отправить push всем активным подпискам пользователя."""
    if not _push_enabled:
        return

    from .models import PushSubscription
    result = await db.execute(
        select(PushSubscription).where(PushSubscription.user_id == user_id)
    )
    subscriptions = result.scalars().all()
    if not subscriptions:
        return

    payload = {"title": title, "body": body, "url": url}
    if tag:
        payload["tag"] = tag

    loop = asyncio.get_event_loop()
    dead: list[int] = []

    for sub in subscriptions:
        try:
            await loop.run_in_executor(
                None, _send_one, sub.endpoint, sub.p256dh, sub.auth, payload
            )
        except WebPushException as e:
            # 410 Gone — подписка устарела, удаляем
            if e.response and e.response.status_code in (404, 410):
                dead.append(sub.id)
        except Exception:
            pass

    if dead:
        from .models import PushSubscription as PS
        for sub_id in dead:
            res = await db.execute(select(PS).where(PS.id == sub_id))
            s = res.scalar_one_or_none()
            if s:
                await db.delete(s)
        await db.commit()
