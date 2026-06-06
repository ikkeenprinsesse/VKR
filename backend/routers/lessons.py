# backend/routers/lessons.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from datetime import datetime, timezone, timedelta
from typing import List

from ..database import get_db
from ..models import Lesson, LessonStatus, TutorStudentRelation, User, Role
from ..schemas import LessonCreate, LessonUpdate, LessonOut
from ..security import get_current_user
from ..audit import log_action
from ..push import notify, send_push
from ..email_service import notify_new_lesson

router = APIRouter(prefix="/lessons", tags=["lessons"])


def _end_time(lesson: Lesson) -> datetime:
    return lesson.date + timedelta(minutes=lesson.duration)


async def _check_conflicts(
    db: AsyncSession,
    tutor_id: int,
    date: datetime,
    duration: int,
    exclude_id: int = None,
) -> List[Lesson]:
    end = date + timedelta(minutes=duration)
    stmt = select(Lesson).where(
        and_(
            Lesson.tutor_id == tutor_id,
            Lesson.status.notin_([LessonStatus.cancelled, LessonStatus.no_show]),
            Lesson.date < end,
            (Lesson.date + timedelta(minutes=1)) > date,  # approximate; refined below
        )
    )
    if exclude_id:
        stmt = stmt.where(Lesson.id != exclude_id)
    result = await db.execute(stmt)
    candidates = result.scalars().all()
    # precise overlap check
    conflicts = [
        l for l in candidates
        if l.date < end and (l.date + timedelta(minutes=l.duration)) > date
    ]
    return conflicts


@router.get("/my-schedule", response_model=List[LessonOut])
async def my_schedule(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == Role.tutor:
        stmt = select(Lesson).where(Lesson.tutor_id == current_user.id)
    else:
        stmt = select(Lesson).where(Lesson.student_id == current_user.id)
    result = await db.execute(stmt.order_by(Lesson.date))
    return result.scalars().all()


@router.get("/conflicts", response_model=List[LessonOut])
async def get_conflicts(
    date: datetime,
    duration: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.tutor:
        raise HTTPException(status_code=403, detail="Только репетитор может проверять конфликты")
    conflicts = await _check_conflicts(db, current_user.id, date, duration)
    return conflicts


@router.get("/{lesson_id}", response_model=LessonOut)
async def get_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Занятие не найдено")
    if current_user.id not in (lesson.tutor_id, lesson.student_id):
        raise HTTPException(status_code=403, detail="Нет доступа к этому занятию")
    return lesson


@router.post("/", response_model=LessonOut, status_code=status.HTTP_201_CREATED)
async def create_lesson(
    request: Request,
    data: LessonCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.tutor:
        raise HTTPException(status_code=403, detail="Только репетитор может создавать занятия")

    # проверяем, что ученик является учеником этого репетитора
    rel = await db.execute(
        select(TutorStudentRelation).where(
            and_(
                TutorStudentRelation.tutor_id == current_user.id,
                TutorStudentRelation.student_id == data.student_id,
            )
        )
    )
    if not rel.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Этот пользователь не является вашим учеником")

    conflicts = await _check_conflicts(db, current_user.id, data.date, data.duration)
    if conflicts:
        raise HTTPException(
            status_code=400,
            detail=f"Конфликт с занятием id={conflicts[0].id} на {conflicts[0].date}",
        )

    lesson = Lesson(
        tutor_id=current_user.id,
        student_id=data.student_id,
        date=data.date,
        duration=data.duration,
        topic=data.topic,
        meeting_link=data.meeting_link,
    )
    db.add(lesson)
    await db.flush()  # получаем id до commit
    await log_action(db, user_id=current_user.id, action="CREATE",
                     entity_type="lesson", entity_id=lesson.id,
                     new_value=data.model_dump(mode="json"),
                     ip_address=request.client.host if request.client else None)
    await db.commit()
    await db.refresh(lesson)

    # уведомления ученику о новом занятии (push + email)
    date_str = lesson.date.strftime("%d.%m %H:%M")
    await notify(
        user_id=lesson.student_id,
        title="Новое занятие запланировано",
        body=f"{lesson.topic or 'Занятие'} — {date_str}",
        url="/schedule",
        tag="lesson-new",
        db=db,
    )
    student_res = await db.execute(select(User).where(User.id == lesson.student_id))
    student = student_res.scalar_one_or_none()
    if student:
        notify_new_lesson(
            student=student,
            lesson_date=lesson.date,
            topic=lesson.topic,
            duration=lesson.duration,
            tutor_name=current_user.name,
        )

    return lesson


@router.put("/{lesson_id}", response_model=LessonOut)
async def update_lesson(
    request: Request,
    lesson_id: int,
    data: LessonUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Занятие не найдено")
    if current_user.role == Role.tutor and lesson.tutor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нет доступа")
    if current_user.role == Role.student and lesson.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нет доступа")

    new_date = data.date or lesson.date
    new_duration = data.duration or lesson.duration
    if data.date or data.duration:
        conflicts = await _check_conflicts(
            db, lesson.tutor_id, new_date, new_duration, exclude_id=lesson_id
        )
        if conflicts:
            raise HTTPException(
                status_code=400,
                detail=f"Конфликт с занятием id={conflicts[0].id}",
            )

    old = {"status": lesson.status, "date": str(lesson.date), "topic": lesson.topic}
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(lesson, field, value)
    lesson.updated_at = datetime.now(tz=timezone.utc)
    await log_action(db, user_id=current_user.id, action="UPDATE",
                     entity_type="lesson", entity_id=lesson_id,
                     old_value=old, new_value=data.model_dump(exclude_none=True, mode="json"),
                     ip_address=request.client.host if request.client else None)
    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lesson(
    request: Request,
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Занятие не найдено")
    if current_user.role != Role.tutor or lesson.tutor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Только репетитор может удалять занятия")
    await log_action(db, user_id=current_user.id, action="DELETE",
                     entity_type="lesson", entity_id=lesson_id,
                     old_value={"date": str(lesson.date), "status": lesson.status},
                     ip_address=request.client.host if request.client else None)
    await db.delete(lesson)
    await db.commit()
