# backend/routers/payments.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from datetime import datetime, timezone
from typing import List
from collections import defaultdict

from ..database import get_db
from ..models import Payment, PaymentStatus, Lesson, User, Role
from ..schemas import PaymentRecord, PaymentOut, PaymentAnalyticsItem
from ..security import get_current_user

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/my-income", response_model=List[PaymentOut])
async def my_income(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.tutor:
        raise HTTPException(status_code=403, detail="Только репетитор может просматривать доход")

    stmt = (
        select(Payment)
        .join(Lesson, Payment.lesson_id == Lesson.id)
        .where(Lesson.tutor_id == current_user.id)
        .order_by(Payment.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/record", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
async def record_payment(
    data: PaymentRecord,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.tutor:
        raise HTTPException(status_code=403, detail="Только репетитор может фиксировать оплату")

    lesson_result = await db.execute(select(Lesson).where(Lesson.id == data.lesson_id))
    lesson = lesson_result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Занятие не найдено")
    if lesson.tutor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Это занятие не ваше")

    # не позволяем создать второй платёж за то же занятие
    existing = await db.execute(select(Payment).where(Payment.lesson_id == data.lesson_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Оплата для этого занятия уже зафиксирована")

    payment = Payment(
        lesson_id=data.lesson_id,
        amount=data.amount,
        currency=data.currency,
        payment_method=data.payment_method,
        payment_date=data.payment_date or datetime.now(tz=timezone.utc),
        status=PaymentStatus.paid,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return payment


@router.get("/analytics", response_model=List[PaymentAnalyticsItem])
async def payment_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.tutor:
        raise HTTPException(status_code=403, detail="Только репетитор может просматривать аналитику")

    stmt = (
        select(Payment)
        .join(Lesson, Payment.lesson_id == Lesson.id)
        .where(
            and_(
                Lesson.tutor_id == current_user.id,
                Payment.status == PaymentStatus.paid,
            )
        )
    )
    result = await db.execute(stmt)
    payments = result.scalars().all()

    monthly: dict[str, dict] = defaultdict(lambda: {"total": 0.0, "count": 0})
    for p in payments:
        pd = p.payment_date or p.created_at
        if pd.tzinfo is None:
            pd = pd.replace(tzinfo=timezone.utc)
        key = pd.strftime("%Y-%m")
        monthly[key]["total"] += p.amount
        monthly[key]["count"] += 1

    return [
        PaymentAnalyticsItem(period=k, total=round(v["total"], 2), count=v["count"])
        for k, v in sorted(monthly.items())
    ]
