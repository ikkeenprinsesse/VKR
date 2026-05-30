# backend/routers/chat.py
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from datetime import datetime, timezone
from typing import List, Dict
import json

from ..database import get_db, SessionLocal
from ..models import Message, TutorStudentRelation, User, Role
from ..schemas import MessageSend, MessageOut
from ..security import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])

# хранилище активных WebSocket-соединений: user_id -> WebSocket
_connections: Dict[int, WebSocket] = {}


async def _assert_allowed_chat(db: AsyncSession, user_a: int, user_b: int) -> None:
    """Проверяет, что пользователи связаны отношением репетитор-ученик."""
    rel = await db.execute(
        select(TutorStudentRelation).where(
            or_(
                and_(
                    TutorStudentRelation.tutor_id == user_a,
                    TutorStudentRelation.student_id == user_b,
                ),
                and_(
                    TutorStudentRelation.tutor_id == user_b,
                    TutorStudentRelation.student_id == user_a,
                ),
            )
        )
    )
    if not rel.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Вы не можете переписываться с этим пользователем")


@router.get("/history/{other_user_id}", response_model=List[MessageOut])
async def chat_history(
    other_user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _assert_allowed_chat(db, current_user.id, other_user_id)

    stmt = (
        select(Message)
        .where(
            or_(
                and_(
                    Message.sender_id == current_user.id,
                    Message.receiver_id == other_user_id,
                ),
                and_(
                    Message.sender_id == other_user_id,
                    Message.receiver_id == current_user.id,
                ),
            )
        )
        .order_by(Message.created_at)
    )
    result = await db.execute(stmt)
    messages = result.scalars().all()

    # помечаем входящие как прочитанные
    now = datetime.now(tz=timezone.utc)
    for msg in messages:
        if msg.receiver_id == current_user.id and not msg.is_read:
            msg.is_read = True
            msg.read_at = now
    await db.commit()
    return messages


@router.post("/send", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def send_message(
    data: MessageSend,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _assert_allowed_chat(db, current_user.id, data.receiver_id)

    msg = Message(
        sender_id=current_user.id,
        receiver_id=data.receiver_id,
        text=data.text,
        files=data.files,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    # real-time push если получатель подключён
    if data.receiver_id in _connections:
        ws = _connections[data.receiver_id]
        try:
            payload = {
                "id": msg.id,
                "sender_id": msg.sender_id,
                "text": msg.text,
                "created_at": msg.created_at.isoformat(),
            }
            await ws.send_text(json.dumps(payload))
        except Exception:
            pass

    return msg


@router.websocket("/ws/{user_id}")
async def websocket_chat(websocket: WebSocket, user_id: int):
    await websocket.accept()
    _connections[user_id] = websocket
    try:
        while True:
            # держим соединение живым, входящие данные игнорируем
            await websocket.receive_text()
    except WebSocketDisconnect:
        _connections.pop(user_id, None)
