# backend/routers/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from ..database import get_db
from ..models import User, TutorStudentRelation, Invitation
from ..schemas import UserCreate, UserOut, UserSettingsUpdate
from ..security import get_password_hash, get_current_user
from datetime import datetime, timezone

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    """Регистрация нового пользователя"""
    # 1. Проверка email
    stmt = select(User).where(User.email == user.email)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")

    # 2. Обработка invite_code (если указан)
    tutor_id = None
    if hasattr(user, 'invite_code') and user.invite_code:
        # Ищем приглашение по токену
        stmt = select(Invitation).where(
            Invitation.token == user.invite_code,
            Invitation.used == False,
            Invitation.expires_at > datetime.now(timezone.utc)
        )
        result = await db.execute(stmt)
        invitation = result.scalar_one_or_none()

        if not invitation:
            raise HTTPException(
                status_code=400,
                detail="Неверный или истёкший код приглашения"
            )

        tutor_id = invitation.tutor_id

        # Помечаем приглашение как использованное
        invitation.used = True
        await db.commit()

    # 3. Создаём пользователя
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        password_hash=hashed_password,
        name=user.name,
        role=user.role,
        subjects=getattr(user, 'subjects', None),
        level=getattr(user, 'level', None)
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)

    # 4. Если это студент и есть tutor_id — создаём связь
    if db_user.role == "student" and tutor_id:
        relation = TutorStudentRelation(
            tutor_id=tutor_id,
            student_id=db_user.id
        )
        db.add(relation)
        await db.commit()

    return db_user


@router.get("/me", response_model=UserOut)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Получить данные текущего авторизованного пользователя"""
    return current_user


@router.get("/my-students", response_model=list[UserOut])
async def get_my_students(
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """Получить список всех учеников текущего репетитора"""
    if current_user.role != "tutor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только репетиторы могут просматривать список учеников"
        )

    stmt = (
        select(TutorStudentRelation)
        .where(TutorStudentRelation.tutor_id == current_user.id)
        .options(joinedload(TutorStudentRelation.student))
    )
    result = await db.execute(stmt)
    relations = result.scalars().all()

    return [rel.student for rel in relations if rel.student]


@router.patch("/me/settings", response_model=UserOut)
async def update_my_settings(
    data: UserSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Обновить настройки профиля (кошелёк ЮMoney, цена занятия и т.д.)"""
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/{user_id}", response_model=UserOut)
async def get_user_by_id(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить пользователя по ID (доступно авторизованным)"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return user