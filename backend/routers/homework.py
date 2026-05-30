# backend/routers/homework.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List

from ..database import get_db
from ..models import Homework, Lesson, TutorStudentRelation, User, Role
from ..schemas import HomeworkCreate, HomeworkUpdate, HomeworkOut
from ..security import get_current_user

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

    hw = Homework(**data.model_dump())
    db.add(hw)
    await db.commit()
    await db.refresh(hw)
    return hw


@router.put("/{homework_id}", response_model=HomeworkOut)
async def update_homework(
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

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(hw, field, value)
    await db.commit()
    await db.refresh(hw)
    return hw


@router.delete("/{homework_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_homework(
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

    await db.delete(hw)
    await db.commit()
