# backend/routers/slots.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timezone, timedelta
from typing import List

from ..database import get_db
from ..models import AvailableSlot, TutorStudentRelation, User, Role, Lesson, LessonStatus
from ..schemas import SlotCreate, SlotOut, LessonOut
from ..security import get_current_user
from ..push import notify, send_push

router = APIRouter(prefix="/slots", tags=["slots"])

WEEKDAYS_RU = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]


def _next_occurrence(weekday: int, hour: int, minute: int, from_dt: datetime) -> datetime:
    """Ближайшая дата этого дня недели начиная с from_dt (UTC)."""
    days_ahead = (weekday - from_dt.weekday()) % 7
    candidate = from_dt.replace(hour=hour, minute=minute, second=0, microsecond=0)
    candidate = candidate + timedelta(days=days_ahead)
    if candidate <= from_dt:
        candidate += timedelta(days=7)
    return candidate


async def _assert_student_of_tutor(db: AsyncSession, tutor_id: int, student_id: int):
    rel = await db.execute(
        select(TutorStudentRelation).where(
            and_(
                TutorStudentRelation.tutor_id == tutor_id,
                TutorStudentRelation.student_id == student_id,
            )
        )
    )
    if not rel.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Вы не являетесь учеником этого репетитора")


# ── Tutor endpoints ──────────────────────────────────────────────────────────────

@router.get("/my", response_model=List[SlotOut])
async def get_my_slots(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.tutor:
        raise HTTPException(status_code=403)
    result = await db.execute(
        select(AvailableSlot)
        .where(AvailableSlot.tutor_id == current_user.id, AvailableSlot.is_active == True)
        .order_by(AvailableSlot.created_at)
    )
    return result.scalars().all()


@router.post("/", response_model=SlotOut, status_code=status.HTTP_201_CREATED)
async def create_slot(
    data: SlotCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.tutor:
        raise HTTPException(status_code=403, detail="Только репетитор может создавать слоты")

    if data.reserved_for_student_id:
        await _assert_student_of_tutor(db, current_user.id, data.reserved_for_student_id)

    slot = AvailableSlot(
        tutor_id=current_user.id,
        duration=data.duration,
        is_recurring=data.is_recurring,
        slot_date=data.slot_date,
        weekday=data.weekday,
        slot_hour=data.slot_hour,
        slot_minute=data.slot_minute,
        reserved_for_student_id=data.reserved_for_student_id,
    )
    db.add(slot)
    await db.commit()
    await db.refresh(slot)

    # Уведомить ученика если слот закреплён
    if data.reserved_for_student_id:
        if data.is_recurring:
            time_str = f"{WEEKDAYS_RU[data.weekday]}, {data.slot_hour:02d}:{data.slot_minute:02d}"
        else:
            time_str = data.slot_date.strftime("%d.%m %H:%M")
        await notify(
            user_id=data.reserved_for_student_id,
            title="Для вас закреплён слот",
            body=f"Репетитор зарезервировал время: {time_str}",
            url="/schedule",
            tag="slot-reserved",
            db=db,
        )

    return slot


@router.delete("/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_slot(
    slot_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.tutor:
        raise HTTPException(status_code=403)
    result = await db.execute(select(AvailableSlot).where(AvailableSlot.id == slot_id))
    slot = result.scalar_one_or_none()
    if not slot or slot.tutor_id != current_user.id:
        raise HTTPException(status_code=404, detail="Слот не найден")
    slot.is_active = False
    await db.commit()


# ── Student endpoints ────────────────────────────────────────────────────────────

@router.get("/available", response_model=List[SlotOut])
async def get_available_slots(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ученик получает доступные слоты своих репетиторов."""
    if current_user.role != Role.student:
        raise HTTPException(status_code=403)

    # Получаем всех репетиторов ученика
    rels = await db.execute(
        select(TutorStudentRelation).where(TutorStudentRelation.student_id == current_user.id)
    )
    tutor_ids = [r.tutor_id for r in rels.scalars().all()]
    if not tutor_ids:
        return []

    result = await db.execute(
        select(AvailableSlot).where(
            and_(
                AvailableSlot.tutor_id.in_(tutor_ids),
                AvailableSlot.is_active == True,
                # Только слоты доступные всем или закреплённые за этим учеником
                (
                    AvailableSlot.reserved_for_student_id == None
                ) | (
                    AvailableSlot.reserved_for_student_id == current_user.id
                ),
            )
        )
    )
    return result.scalars().all()


@router.post("/{slot_id}/book", response_model=LessonOut, status_code=status.HTTP_201_CREATED)
async def book_slot(
    slot_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ученик записывается на слот — создаётся занятие."""
    if current_user.role != Role.student:
        raise HTTPException(status_code=403, detail="Только ученик может записываться")

    result = await db.execute(select(AvailableSlot).where(AvailableSlot.id == slot_id))
    slot = result.scalar_one_or_none()
    if not slot or not slot.is_active:
        raise HTTPException(status_code=404, detail="Слот не найден или недоступен")

    if slot.reserved_for_student_id and slot.reserved_for_student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Этот слот закреплён за другим учеником")

    await _assert_student_of_tutor(db, slot.tutor_id, current_user.id)

    # Определяем дату занятия
    now = datetime.now(tz=timezone.utc)
    if slot.is_recurring:
        lesson_date = _next_occurrence(slot.weekday, slot.slot_hour, slot.slot_minute, now)
    else:
        lesson_date = slot.slot_date
        if lesson_date <= now:
            raise HTTPException(status_code=400, detail="Этот слот уже прошёл")

    # Проверяем конфликт у репетитора
    end = lesson_date + timedelta(minutes=slot.duration)
    conflicts = await db.execute(
        select(Lesson).where(
            and_(
                Lesson.tutor_id == slot.tutor_id,
                Lesson.status.notin_([LessonStatus.cancelled, LessonStatus.no_show]),
                Lesson.date < end,
            )
        )
    )
    for l in conflicts.scalars().all():
        if l.date < end and (l.date + timedelta(minutes=l.duration)) > lesson_date:
            raise HTTPException(status_code=400, detail="Это время уже занято у репетитора")

    # Создаём занятие
    lesson = Lesson(
        tutor_id=slot.tutor_id,
        student_id=current_user.id,
        date=lesson_date,
        duration=slot.duration,
        status=LessonStatus.planned,
    )
    db.add(lesson)

    # Разовый слот — деактивируем после записи
    if not slot.is_recurring:
        slot.is_active = False

    await db.commit()
    await db.refresh(lesson)

    # Уведомить репетитора
    await notify(
        user_id=slot.tutor_id,
        title="Ученик записался на занятие",
        body=f"{lesson_date.strftime('%d.%m %H:%M')} — {slot.duration} мин",
        url="/schedule",
        tag="slot-booked",
        db=db,
    )

    return lesson
