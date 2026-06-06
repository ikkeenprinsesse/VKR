# backend/routers/forum.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional

from ..database import get_db
from ..models import ForumThread, ForumPost, User, Role
from ..schemas import ForumThreadCreate, ForumThreadOut, ForumPostCreate, ForumPostOut
from ..security import get_current_user

router = APIRouter(prefix="/forum", tags=["forum"])


async def _thread_out(thread: ForumThread, db: AsyncSession) -> ForumThreadOut:
    count_result = await db.execute(
        select(func.count(ForumPost.id)).where(ForumPost.thread_id == thread.id)
    )
    post_count = count_result.scalar_one() or 0
    return ForumThreadOut(
        id=thread.id,
        title=thread.title,
        tag=thread.tag,
        tutor_id=thread.tutor_id,
        author_name=thread.tutor.name if thread.tutor else None,
        post_count=post_count,
        created_at=thread.created_at,
    )


@router.get("/threads", response_model=List[ForumThreadOut])
async def list_threads(
    tag: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Все темы форума — доступны всем репетиторам."""
    if current_user.role not in (Role.tutor, Role.admin):
        raise HTTPException(status_code=403, detail="Форум доступен только репетиторам")

    stmt = select(ForumThread).order_by(ForumThread.created_at.desc())
    if tag:
        stmt = stmt.where(ForumThread.tag == tag)

    result = await db.execute(stmt)
    threads = result.scalars().all()

    # подгружаем авторов одним запросом
    author_ids = list({t.tutor_id for t in threads})
    authors_result = await db.execute(select(User).where(User.id.in_(author_ids)))
    authors = {u.id: u for u in authors_result.scalars().all()}
    for t in threads:
        t.tutor = authors.get(t.tutor_id)

    return [await _thread_out(t, db) for t in threads]


@router.post("/threads", response_model=ForumThreadOut, status_code=status.HTTP_201_CREATED)
async def create_thread(
    data: ForumThreadCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (Role.tutor, Role.admin):
        raise HTTPException(status_code=403, detail="Только репетитор может создавать темы")

    thread = ForumThread(
        title=data.title.strip(),
        tag=data.tag.strip() if data.tag else None,
        tutor_id=current_user.id,
    )
    db.add(thread)
    await db.flush()
    thread.tutor = current_user
    await db.commit()
    await db.refresh(thread)
    thread.tutor = current_user
    return ForumThreadOut(
        id=thread.id,
        title=thread.title,
        tag=thread.tag,
        tutor_id=thread.tutor_id,
        author_name=current_user.name,
        post_count=0,
        created_at=thread.created_at,
    )


@router.get("/threads/{thread_id}/posts", response_model=List[ForumPostOut])
async def get_posts(
    thread_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (Role.tutor, Role.admin):
        raise HTTPException(status_code=403, detail="Форум доступен только репетиторам")

    thread_result = await db.execute(select(ForumThread).where(ForumThread.id == thread_id))
    if not thread_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Тема не найдена")

    result = await db.execute(
        select(ForumPost)
        .where(ForumPost.thread_id == thread_id)
        .order_by(ForumPost.created_at)
    )
    posts = result.scalars().all()

    # подгружаем авторов
    user_ids = list({p.user_id for p in posts})
    if user_ids:
        users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        users = {u.id: u for u in users_result.scalars().all()}
        for p in posts:
            p.author_name = users.get(p.user_id, {})

    return posts


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
    if current_user.role not in (Role.tutor, Role.admin):
        raise HTTPException(status_code=403, detail="Форум доступен только репетиторам")

    thread_result = await db.execute(select(ForumThread).where(ForumThread.id == thread_id))
    if not thread_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Тема не найдена")

    post = ForumPost(
        thread_id=thread_id,
        user_id=current_user.id,
        text=data.text.strip(),
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return post


@router.delete("/threads/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_thread(
    thread_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ForumThread).where(ForumThread.id == thread_id))
    thread = result.scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Тема не найдена")
    if thread.tutor_id != current_user.id and current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Нельзя удалить чужую тему")
    await db.delete(thread)
    await db.commit()
