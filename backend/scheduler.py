# backend/scheduler.py
import asyncio
import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select, and_

from .database import SessionLocal
from .models import Homework, HomeworkStatus, Lesson
from .push import send_push

logger = logging.getLogger(__name__)

_scheduler = AsyncIOScheduler(timezone="UTC")


async def _send_deadline_reminders() -> None:
    """Проверяет дедлайны и отправляет push за 24ч и 1ч."""
    now = datetime.now(timezone.utc)

    async with SessionLocal() as db:
        # Активные задания, дедлайн которых ещё не прошёл
        stmt = select(Homework).where(
            and_(
                Homework.status.in_([HomeworkStatus.assigned, HomeworkStatus.submitted]),
                Homework.deadline > now,
            )
        )
        result = await db.execute(stmt)
        homeworks = result.scalars().all()

        for hw in homeworks:
            deadline = hw.deadline if hw.deadline.tzinfo else hw.deadline.replace(tzinfo=timezone.utc)
            time_left = deadline - now

            # получаем student_id через занятие
            lesson_res = await db.execute(select(Lesson).where(Lesson.id == hw.lesson_id))
            lesson = lesson_res.scalar_one_or_none()
            if not lesson:
                continue

            # Напоминание за 24 часа (окно: от 25ч до 23ч)
            if not hw.notified_24h and timedelta(hours=23) <= time_left <= timedelta(hours=25):
                try:
                    await send_push(
                        user_id=lesson.student_id,
                        title="Дедлайн через 24 часа",
                        body=hw.description[:80],
                        url="/homework",
                        tag=f"deadline-24h-{hw.id}",
                        db=db,
                    )
                    hw.notified_24h = True
                    logger.info("Sent 24h reminder for homework %s to student %s", hw.id, lesson.student_id)
                except Exception as e:
                    logger.error("Failed 24h reminder hw=%s: %s", hw.id, e)

            # Напоминание за 1 час (окно: от 75 мин до 45 мин)
            if not hw.notified_1h and timedelta(minutes=45) <= time_left <= timedelta(minutes=75):
                try:
                    await send_push(
                        user_id=lesson.student_id,
                        title="Дедлайн через 1 час!",
                        body=hw.description[:80],
                        url="/homework",
                        tag=f"deadline-1h-{hw.id}",
                        db=db,
                    )
                    hw.notified_1h = True
                    logger.info("Sent 1h reminder for homework %s to student %s", hw.id, lesson.student_id)
                except Exception as e:
                    logger.error("Failed 1h reminder hw=%s: %s", hw.id, e)

        await db.commit()


def start_scheduler() -> None:
    # Проверяем дедлайны каждые 15 минут
    _scheduler.add_job(
        _send_deadline_reminders,
        trigger="interval",
        minutes=15,
        id="deadline_reminders",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    _scheduler.start()
    logger.info("Scheduler started: deadline reminders every 15 min")


def stop_scheduler() -> None:
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
