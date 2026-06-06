# backend/routers/subscriptions.py
import os
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import Subscription, PlanType, User, Role, TutorStudentRelation
from ..schemas import SubscriptionOut, CheckoutResponse
from ..security import get_current_user
from ..routers.yoomoney import build_payment_url

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

PLATFORM_WALLET = os.getenv("PLATFORM_YOOMONEY_WALLET", "")

FREE_STUDENT_LIMIT = 3

PLANS: dict[str, dict] = {
    "pro_monthly": {
        "days":   30,
        "amount": 490.0,
        "label":  "TutorSpace PRO — 1 месяц",
        "plan":   PlanType.pro_monthly,
    },
    "pro_annual": {
        "days":   365,
        "amount": 4490.0,
        "label":  "TutorSpace PRO — 1 год",
        "plan":   PlanType.pro_annual,
    },
}


async def get_or_create_subscription(db: AsyncSession, tutor_id: int) -> Subscription:
    result = await db.execute(select(Subscription).where(Subscription.tutor_id == tutor_id))
    sub = result.scalar_one_or_none()
    if not sub:
        sub = Subscription(tutor_id=tutor_id, plan=PlanType.free)
        db.add(sub)
        await db.commit()
        await db.refresh(sub)
    return sub


def _is_active(sub: Subscription) -> bool:
    if sub.plan == PlanType.free:
        return True
    if sub.expires_at is None:
        return False
    exp = sub.expires_at if sub.expires_at.tzinfo else sub.expires_at.replace(tzinfo=timezone.utc)
    return exp > datetime.now(timezone.utc)


def _days_left(sub: Subscription) -> Optional[int]:
    if sub.plan == PlanType.free or sub.expires_at is None:
        return None
    exp = sub.expires_at if sub.expires_at.tzinfo else sub.expires_at.replace(tzinfo=timezone.utc)
    delta = exp - datetime.now(timezone.utc)
    return max(0, delta.days)


def _to_out(sub: Subscription) -> SubscriptionOut:
    return SubscriptionOut(
        plan=sub.plan,
        expires_at=sub.expires_at,
        is_active=_is_active(sub),
        days_left=_days_left(sub),
    )


# ── Dependency: проверить что репетитор на PRO ─────────────────────────────────

async def require_pro(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Subscription:
    if current_user.role != Role.tutor:
        raise HTTPException(status_code=403, detail="Только для репетиторов")
    sub = await get_or_create_subscription(db, current_user.id)
    if not _is_active(sub) or sub.plan == PlanType.free:
        raise HTTPException(
            status_code=402,
            detail="Эта функция доступна только на тарифе PRO. Перейдите в раздел «Подписка».",
        )
    return sub


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/me", response_model=SubscriptionOut)
async def my_subscription(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.tutor:
        raise HTTPException(status_code=403, detail="Только для репетиторов")
    sub = await get_or_create_subscription(db, current_user.id)
    return _to_out(sub)


@router.get("/checkout/{plan}", response_model=CheckoutResponse)
async def checkout(
    plan: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Генерирует ссылку на оплату подписки через ЮMoney платформы."""
    if current_user.role != Role.tutor:
        raise HTTPException(status_code=403, detail="Только для репетиторов")

    if plan not in PLANS:
        raise HTTPException(status_code=400, detail=f"Неизвестный план: {plan}")

    if not PLATFORM_WALLET:
        raise HTTPException(
            status_code=503,
            detail="Оплата временно недоступна. Обратитесь в поддержку.",
        )

    cfg = PLANS[plan]
    label = f"subscription_{plan}_{current_user.id}"
    url = build_payment_url(
        wallet=PLATFORM_WALLET,
        amount=cfg["amount"],
        label=label,
        description=cfg["label"],
        success_url=f"{os.getenv('FRONTEND_URL', 'http://localhost')}/dashboard/tutor/subscription?success=1",
    )

    return CheckoutResponse(url=url, amount=cfg["amount"], plan=cfg["plan"])


@router.post("/activate/{plan}")
async def activate_manually(
    plan: str,
    tutor_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Только для администраторов — ручная активация подписки."""
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403)

    if plan not in PLANS:
        raise HTTPException(status_code=400, detail="Неизвестный план")

    await _activate_subscription(db, tutor_id, plan)
    return {"ok": True}


async def _activate_subscription(db: AsyncSession, tutor_id: int, plan_key: str) -> None:
    """Активирует или продлевает подписку репетитора."""
    cfg = PLANS[plan_key]
    now = datetime.now(timezone.utc)

    sub = await get_or_create_subscription(db, tutor_id)
    current_exp = sub.expires_at
    if current_exp and current_exp.tzinfo:
        base = max(current_exp, now)
    else:
        base = now

    sub.plan = cfg["plan"]
    sub.expires_at = base + timedelta(days=cfg["days"])
    await db.commit()
