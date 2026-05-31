# backend/routers/chat.py
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from datetime import datetime, timezone
from typing import List, Dict
import json

from jose import JWTError, jwt

from ..database import get_db, SessionLocal
from ..models import Message, TutorStudentRelation, User, Role
from ..schemas import MessageSend, MessageOut
from ..security import get_current_user, SECRET_KEY, ALGORITHM

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
                "receiver_id": msg.receiver_id,
                "text": msg.text,
                "files": msg.files,
                "is_read": msg.is_read,
                "read_at": msg.read_at.isoformat() if msg.read_at else None,
                "created_at": msg.created_at.isoformat(),
            }
            await ws.send_text(json.dumps(payload))
        except Exception:
            _connections.pop(data.receiver_id, None)

    return msg


@router.websocket("/ws")
async def websocket_chat(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access-token"),
):
    # аутентификация до accept — закрываем соединение при невалидном токене
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise JWTError()
    except JWTError:
        await websocket.close(code=4001)
        return

    async with SessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

    if not user:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    _connections[user.id] = websocket
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        _connections.pop(user.id, None)
