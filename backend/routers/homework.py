# backend/routers/homework.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List

from ..database import get_db
from ..models import Homework, HomeworkStatus, Lesson, TutorStudentRelation, User, Role
from ..schemas import HomeworkCreate, HomeworkUpdate, HomeworkOut
from ..security import get_current_user
from ..audit import log_action
from ..push import notify, send_push
from ..email_service import notify_homework_assigned

router = APIRouter(prefix="/homework", tags=["homework"])


async def _get_homework_or_404(homework_id: int, db: AsyncSession) -> Homework:
    result = await db.execute(select(Homework).where(Homework.id == homework_id))
    hw = result.scalar_one_or_none()
    if not hw:
        raise HTTPException(status_code=404, detail="Задание не найдено")
    return hw


@router.get("/assigned", response_model=List[HomeworkOut])
async def get_assigned_homework(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == Role.tutor:
        # все задания по урокам репетитора
        stmt = (
            select(Homework)
            .join(Lesson, Homework.lesson_id == Lesson.id)
            .where(Lesson.tutor_id == current_user.id)
        )
    else:
        # задания по урокам этого ученика
        stmt = (
            select(Homework)
            .join(Lesson, Homework.lesson_id == Lesson.id)
            .where(Lesson.student_id == current_user.id)
        )
    result = await db.execute(stmt.order_by(Homework.deadline))
    return result.scalars().all()


@router.post("/", response_model=HomeworkOut, status_code=status.HTTP_201_CREATED)
async def create_homework(
    request: Request,
    data: HomeworkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.tutor:
        raise HTTPException(status_code=403, detail="Только репетитор может создавать задания")

    lesson_result = await db.execute(select(Lesson).where(Lesson.id == data.lesson_id))
    lesson = lesson_result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Занятие не найдено")
    if lesson.tutor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Это занятие принадлежит другому репетитору")

    hw = Homework(**data.model_dump(), status=HomeworkStatus.assigned)
    db.add(hw)
    await db.flush()
    await log_action(db, user_id=current_user.id, action="CREATE",
                     entity_type="homework", entity_id=hw.id,
                     new_value=data.model_dump(mode="json"),
                     ip_address=request.client.host if request.client else None)
    await db.commit()
    await db.refresh(hw)

    # уведомление ученику (push + email)
    lesson_res = await db.execute(select(Lesson).where(Lesson.id == hw.lesson_id))
    lesson = lesson_res.scalar_one_or_none()
    if lesson:
        await notify(
            user_id=lesson.student_id,
            title="Новое задание",
            body=hw.description[:80],
            url="/homework",
            tag="homework-new",
            db=db,
        )
        student_res = await db.execute(select(User).where(User.id == lesson.student_id))
        student = student_res.scalar_one_or_none()
        if student:
            notify_homework_assigned(
                student=student,
                description=hw.description,
                deadline=hw.deadline,
                tutor_name=current_user.name,
            )

    return hw


@router.put("/{homework_id}", response_model=HomeworkOut)
async def update_homework(
    request: Request,
    homework_id: int,
    data: HomeworkUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.tutor:
        raise HTTPException(status_code=403, detail="Только репетитор может редактировать задания")

    hw = await _get_homework_or_404(homework_id, db)
    lesson_result = await db.execute(select(Lesson).where(Lesson.id == hw.lesson_id))
    lesson = lesson_result.scalar_one_or_none()
    if lesson.tutor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нет доступа к этому заданию")

    old = {"description": hw.description, "deadline": str(hw.deadline), "status": hw.status}
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(hw, field, value)
    await log_action(db, user_id=current_user.id, action="UPDATE",
                     entity_type="homework", entity_id=homework_id,
                     old_value=old, new_value=data.model_dump(exclude_none=True, mode="json"),
                     ip_address=request.client.host if request.client else None)
    await db.commit()
    await db.refresh(hw)
    return hw


@router.delete("/{homework_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_homework(
    request: Request,
    homework_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.tutor:
        raise HTTPException(status_code=403, detail="Только репетитор может удалять задания")

    hw = await _get_homework_or_404(homework_id, db)
    lesson_result = await db.execute(select(Lesson).where(Lesson.id == hw.lesson_id))
    lesson = lesson_result.scalar_one_or_none()
    if lesson.tutor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нет доступа к этому заданию")

    await log_action(db, user_id=current_user.id, action="DELETE",
                     entity_type="homework", entity_id=homework_id,
                     old_value={"description": hw.description, "status": hw.status},
                     ip_address=request.client.host if request.client else None)
    await db.delete(hw)
    await db.commit()
