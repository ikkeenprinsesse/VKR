# backend/routers/admin.py
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from pydantic import BaseModel, ConfigDict

from ..database import get_db
from ..models import (
    AuditLog, User, Role,
    Lesson, LessonStatus,
    Homework, HomeworkStatus,
    Answer, Payment, PaymentStatus,
    TutorStudentRelation,
)
from ..security import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Только администратор")
    return current_user


# ── Схемы ─────────────────────────────────────────────────────────────────────

class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int]
    action: str
    entity_type: str
    entity_id: Optional[int]
    old_value: Optional[dict]
    new_value: Optional[dict]
    ip_address: Optional[str]
    created_at: datetime


class AdminStats(BaseModel):
    total_users: int
    total_tutors: int
    total_students: int
    total_lessons: int
    completed_lessons: int
    total_homework: int
    graded_homework: int
    total_payments: int
    total_revenue: float
    total_tutor_student_pairs: int


# ── Эндпоинты ─────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=AdminStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_require_admin),
):
    """Обезличенная глобальная статистика платформы."""

    async def count(model, *filters):
        res = await db.execute(select(func.count()).select_from(model).where(*filters))
        return res.scalar_one()

    async def sum_col(col, *filters):
        res = await db.execute(select(func.coalesce(func.sum(col), 0)).where(*filters))
        return float(res.scalar_one())

    total_users    = await count(User)
    total_tutors   = await count(User, User.role == Role.tutor)
    total_students = await count(User, User.role == Role.student)

    total_lessons    = await count(Lesson)
    completed_lessons = await count(Lesson, Lesson.status == LessonStatus.completed)

    total_homework  = await count(Homework)
    graded_homework = await count(Homework, Homework.status == HomeworkStatus.graded)

    total_payments = await count(Payment, Payment.status == PaymentStatus.paid)
    total_revenue  = await sum_col(Payment.amount, Payment.status == PaymentStatus.paid)

    total_pairs = await count(TutorStudentRelation)

    return AdminStats(
        total_users=total_users,
        total_tutors=total_tutors,
        total_students=total_students,
        total_lessons=total_lessons,
        completed_lessons=completed_lessons,
        total_homework=total_homework,
        graded_homework=graded_homework,
        total_payments=total_payments,
        total_revenue=total_revenue,
        total_tutor_student_pairs=total_pairs,
    )


@router.get("/audit-logs", response_model=list[AuditLogOut])
async def get_audit_logs(
    entity_type: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_require_admin),
):
    """Лог всех CRUD-операций. Без доступа к ПДн пользователей."""
    stmt = select(AuditLog)

    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if date_from:
        if date_from.tzinfo is None:
            date_from = date_from.replace(tzinfo=timezone.utc)
        stmt = stmt.where(AuditLog.created_at >= date_from)
    if date_to:
        if date_to.tzinfo is None:
            date_to = date_to.replace(tzinfo=timezone.utc)
        stmt = stmt.where(AuditLog.created_at <= date_to)

    stmt = stmt.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/users", response_model=list[dict])
async def list_users(
    role: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_require_admin),
):
    """Список пользователей (без password_hash и платёжных данных)."""
    stmt = select(
        User.id, User.role, User.name, User.email,
        User.is_active, User.is_verified, User.created_at,
    )
    if role:
        stmt = stmt.where(User.role == role)
    stmt = stmt.order_by(User.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    rows = result.mappings().all()
    return [dict(r) for r in rows]


@router.patch("/users/{user_id}/block", response_model=dict)
async def toggle_block_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(_require_admin),
):
    """Заблокировать / разблокировать пользователя."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Нельзя заблокировать самого себя")

    user.is_active = not user.is_active
    await db.commit()
    return {"id": user.id, "is_active": user.is_active}
