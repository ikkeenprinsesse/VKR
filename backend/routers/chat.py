# backend/routers/chat.py
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from datetime import datetime, timezone
from typing import List, Dict
import json

from jose import JWTError, jwt

from ..database import get_db, SessionLocal
from ..models import Message, TutorStudentRelation, User, Role
from ..schemas import MessageSend, MessageOut
from ..security import get_current_user, SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/chat", tags=["chat"])

# user_id -> WebSocket
_connections: Dict[int, WebSocket] = {}


async def _assert_allowed_chat(db: AsyncSession, user_a: int, user_b: int) -> None:
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


def _msg_to_dict(msg: Message) -> dict:
    return {
        "id": msg.id,
        "sender_id": msg.sender_id,
        "receiver_id": msg.receiver_id,
        "text": msg.text,
        "files": msg.files or [],
        "is_read": msg.is_read,
        "read_at": msg.read_at.isoformat() if msg.read_at else None,
        "created_at": msg.created_at.isoformat(),
    }


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
                and_(Message.sender_id == current_user.id, Message.receiver_id == other_user_id),
                and_(Message.sender_id == other_user_id, Message.receiver_id == current_user.id),
            )
        )
        .order_by(Message.created_at)
    )
    result = await db.execute(stmt)
    messages = result.scalars().all()

    # пометить входящие как прочитанные
    now = datetime.now(tz=timezone.utc)
    for msg in messages:
        if msg.receiver_id == current_user.id and not msg.is_read:
            msg.is_read = True
            msg.read_at = now
    await db.commit()

    # уведомить отправителя о прочтении через WS
    if other_user_id in _connections:
        ws = _connections[other_user_id]
        try:
            await ws.send_text(json.dumps({"type": "read", "by": current_user.id}))
        except Exception:
            _connections.pop(other_user_id, None)

    return messages


@router.get("/unread-counts")
async def unread_counts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Возвращает {sender_id: количество непрочитанных} для текущего пользователя."""
    result = await db.execute(
        select(Message.sender_id, func.count(Message.id).label("cnt"))
        .where(Message.receiver_id == current_user.id, Message.is_read == False)
        .group_by(Message.sender_id)
    )
    return {str(row.sender_id): row.cnt for row in result}


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

    # real-time push получателю
    if data.receiver_id in _connections:
        ws = _connections[data.receiver_id]
        try:
            await ws.send_text(json.dumps({"type": "message", **_msg_to_dict(msg)}))
        except Exception:
            _connections.pop(data.receiver_id, None)

    return msg


@router.websocket("/ws")
async def websocket_chat(
    websocket: WebSocket,
    token: str = Query(...),
):
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
            raw = await websocket.receive_text()
            # поддержка typing: {"type": "typing", "to": user_id}
            try:
                frame = json.loads(raw)
                if frame.get("type") == "typing":
                    target_id = int(frame["to"])
                    if target_id in _connections:
                        await _connections[target_id].send_text(
                            json.dumps({"type": "typing", "from": user.id})
                        )
            except Exception:
                pass
    except WebSocketDisconnect:
        _connections.pop(user.id, None)
