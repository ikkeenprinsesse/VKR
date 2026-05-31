# backend/routers/calendar.py
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from icalendar import Calendar, Event, vText
import uuid as uuid_lib

from ..database import get_db
from ..models import Lesson, LessonStatus, User, Role
from ..security import get_current_user

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/export", response_class=Response)
async def export_calendar(
    date_from: datetime = Query(None, description="Начало диапазона (UTC)"),
    date_to: datetime = Query(None, description="Конец диапазона (UTC)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Экспорт расписания в формате iCalendar (.ics)."""
    if current_user.role == Role.tutor:
        stmt = select(Lesson).where(Lesson.tutor_id == current_user.id)
    else:
        stmt = select(Lesson).where(Lesson.student_id == current_user.id)

    stmt = stmt.where(
        Lesson.status.notin_([LessonStatus.cancelled, LessonStatus.no_show])
    )

    if date_from:
        if date_from.tzinfo is None:
            date_from = date_from.replace(tzinfo=timezone.utc)
        stmt = stmt.where(Lesson.date >= date_from)

    if date_to:
        if date_to.tzinfo is None:
            date_to = date_to.replace(tzinfo=timezone.utc)
        stmt = stmt.where(Lesson.date <= date_to)

    result = await db.execute(stmt.order_by(Lesson.date))
    lessons = result.scalars().all()

    cal = Calendar()
    cal.add("prodid", "-//TutorSpace//tutorspace//RU")
    cal.add("version", "2.0")
    cal.add("calscale", "GREGORIAN")
    cal.add("method", "PUBLISH")
    cal.add("x-wr-calname", vText("TutorSpace — расписание"))

    for lesson in lessons:
        event = Event()
        event.add("uid", str(uuid_lib.uuid4()))

        start = lesson.date if lesson.date.tzinfo else lesson.date.replace(tzinfo=timezone.utc)
        end = start + timedelta(minutes=lesson.duration)

        event.add("dtstart", start)
        event.add("dtend", end)
        event.add("dtstamp", datetime.now(timezone.utc))
        event.add("summary", vText(lesson.topic or "Занятие"))

        description_parts = [f"Статус: {lesson.status.value}"]
        if lesson.meeting_link:
            description_parts.append(f"Ссылка: {lesson.meeting_link}")
        event.add("description", vText("\n".join(description_parts)))

        if lesson.meeting_link:
            event.add("url", lesson.meeting_link)

        # напоминание за 24 часа
        from icalendar import Alarm
        alarm = Alarm()
        alarm.add("action", "DISPLAY")
        alarm.add("description", vText("Напоминание о занятии"))
        alarm.add("trigger", timedelta(hours=-24))
        event.add_component(alarm)

        cal.add_component(event)

    ics_bytes = cal.to_ical()

    return Response(
        content=ics_bytes,
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": "attachment; filename=tutorspace_schedule.ics"
        },
    )
