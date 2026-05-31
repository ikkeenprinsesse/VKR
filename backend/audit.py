# backend/audit.py
from typing import Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from .models import AuditLog


async def log_action(
    db: AsyncSession,
    *,
    user_id: Optional[int],
    action: str,           # "CREATE", "UPDATE", "DELETE"
    entity_type: str,      # "lesson", "homework", "payment", ...
    entity_id: Optional[int] = None,
    old_value: Optional[dict] = None,
    new_value: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> None:
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_value=old_value,
        new_value=new_value,
        ip_address=ip_address,
    )
    db.add(entry)
