# backend/routers/invitations.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from datetime import datetime, timedelta, timezone

from ..database import get_db
from ..models import User, Invitation, TutorStudentRelation
from ..schemas import InvitationCreate, InvitationOut, InvitationAccept
from ..security import get_current_user

router = APIRouter(prefix="/invitations", tags=["invitations"])


@router.post("/", response_model=InvitationOut)
async def create_invitation(
    data: InvitationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Репетитор создаёт ссылку-приглашение"""
    if current_user.role != "tutor":
        raise HTTPException(status_code=403, detail="Только репетитор может создавать приглашения")

    token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(hours=data.expires_in_hours)

    invitation = Invitation(
        tutor_id=current_user.id,
        token=token,
        expires_at=expires_at
    )
    db.add(invitation)
    await db.commit()
    await db.refresh(invitation)

    invite_link = f"http://127.0.0.1:8000/invite/{token}"   # позже заменишь на настоящий домен

    return InvitationOut(token=token, invite_link=invite_link, expires_at=expires_at)


@router.post("/accept", response_model=dict)
async def accept_invitation(
    data: InvitationAccept,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ученик принимает приглашение по токену"""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Только ученик может принимать приглашение")

    # Ищем приглашение
    result = await db.execute(select(Invitation).where(Invitation.token == data.token))
    invitation = result.scalar_one_or_none()

    if not invitation or invitation.used or invitation.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Приглашение недействительно или истекло")

    # Проверяем, не привязан ли уже ученик к этому репетитору
    rel_result = await db.execute(
        select(TutorStudentRelation)
        .where(TutorStudentRelation.tutor_id == invitation.tutor_id,
               TutorStudentRelation.student_id == current_user.id)
    )
    if rel_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Вы уже привязаны к этому репетитору")

    # Создаём связь
    relation = TutorStudentRelation(
        tutor_id=invitation.tutor_id,
        student_id=current_user.id
    )
    db.add(relation)

    # Помечаем приглашение как использованное
    invitation.used = True
    await db.commit()

    return {"message": "Вы успешно привязаны к репетитору"}