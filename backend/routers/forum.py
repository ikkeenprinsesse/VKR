# backend/routers/forum.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List

from ..database import get_db
from ..models import ForumThread, ForumPost, Homework, Lesson, User, Role
from ..schemas import ForumThreadCreate, ForumThreadOut, ForumPostCreate, ForumPostOut
from ..security import get_current_user

router = APIRouter(prefix="/forum", tags=["forum"])


async def _assert_homework_access(db: AsyncSession, homework_id: int, user: User) -> None:
    hw_result = await db.execute(select(Homework).where(Homework.id == homework_id))
    hw = hw_result.scalar_one_or_none()
    if not hw:
        raise HTTPException(status_code=404, detail="Задание не найдено")
    lesson_result = await db.execute(select(Lesson).where(Lesson.id == hw.lesson_id))
    lesson = lesson_result.scalar_one_or_none()
    if user.role == Role.tutor and lesson.tutor_id != user.id:
        raise HTTPException(status_code=403, detail="Нет доступа к этому заданию")
    if user.role == Role.student and lesson.student_id != user.id:
        raise HTTPException(status_code=403, detail="Нет доступа к этому заданию")


@router.get("/threads", response_model=List[ForumThreadOut])
async def list_threads(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == Role.tutor:
        stmt = select(ForumThread).where(ForumThread.tutor_id == current_user.id)
    else:
        # ученик видит темы своего репетитора
        stmt = (
            select(ForumThread)
            .join(Lesson, and_(
                ForumThread.homework_id == Homework.id,
                Homework.lesson_id == Lesson.id,
                Lesson.student_id == current_user.id,
            ), isouter=True)
            .where(ForumThread.homework_id.is_(None) | (Lesson.student_id == current_user.id))
        )
    result = await db.execute(stmt.order_by(ForumThread.created_at.desc()))
    return result.scalars().all()


@router.post("/threads", response_model=ForumThreadOut, status_code=status.HTTP_201_CREATED)
async def create_thread(
    data: ForumThreadCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.tutor:
        raise HTTPException(status_code=403, detail="Только репетитор может создавать темы")

    if data.homework_id:
        await _assert_homework_access(db, data.homework_id, current_user)

    thread = ForumThread(
        title=data.title,
        tutor_id=current_user.id,
        homework_id=data.homework_id,
    )
    db.add(thread)
    await db.commit()
    await db.refresh(thread)
    return thread


@router.get("/threads/{thread_id}/posts", response_model=List[ForumPostOut])
async def get_posts(
    thread_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thread_result = await db.execute(select(ForumThread).where(ForumThread.id == thread_id))
    thread = thread_result.scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Тема не найдена")

    result = await db.execute(
        select(ForumPost)
        .where(ForumPost.thread_id == thread_id)
        .order_by(ForumPost.created_at)
    )
    return result.scalars().all()


@router.post(
    "/threads/{thread_id}/posts",
    response_model=ForumPostOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_post(
    thread_id: int,
    data: ForumPostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thread_result = await db.execute(select(ForumThread).where(ForumThread.id == thread_id))
    thread = thread_result.scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Тема не найдена")

    if thread.homework_id:
        await _assert_homework_access(db, thread.homework_id, current_user)

    post = ForumPost(
        thread_id=thread_id,
        user_id=current_user.id,
        text=data.text,
        files=data.files,
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return post
