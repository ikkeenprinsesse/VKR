# backend/routers/answers.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timezone
from typing import List
import json

from ..database import get_db
from ..models import Answer, AnswerStatus, Homework, HomeworkStatus, Lesson, AutoCheckType, User, Role
from ..schemas import AnswerSubmit, AnswerGrade, AnswerOut
from ..security import get_current_user
from ..audit import log_action
from ..push import send_push
from typing import Optional
router = APIRouter(prefix="/answers", tags=["answers"])

NUMERICAL_EPSILON = 0.01


def _auto_grade(hw: Homework, content: str) -> Optional[float]:
    if hw.auto_check_type == AutoCheckType.none:
        return None
    if hw.correct_answer is None:
        return None

    if hw.auto_check_type == AutoCheckType.text:
        if content.strip().lower() == hw.correct_answer.strip().lower():
            return float(hw.max_score)
        return 0.0

    if hw.auto_check_type == AutoCheckType.numerical:
        try:
            student_val = float(content.strip())
            correct_val = float(hw.correct_answer.strip())
            if abs(student_val - correct_val) <= NUMERICAL_EPSILON:
                return float(hw.max_score)
            return 0.0
        except ValueError:
            return 0.0

    if hw.auto_check_type == AutoCheckType.test:
        try:
            student_answers = json.loads(content)
            correct_answers = json.loads(hw.correct_answer)
            if not isinstance(student_answers, dict) or not isinstance(correct_answers, dict):
                return 0.0
            correct_count = sum(
                1 for k, v in correct_answers.items()
                if student_answers.get(k) == v
            )
            return round(hw.max_score * correct_count / max(len(correct_answers), 1), 2)
        except (json.JSONDecodeError, TypeError):
            return 0.0

    return None


@router.post("/submit", response_model=AnswerOut, status_code=status.HTTP_201_CREATED)
async def submit_answer(
    request: Request,
    data: AnswerSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.student:
        raise HTTPException(status_code=403, detail="Только ученик может сдавать ответы")

    hw_result = await db.execute(select(Homework).where(Homework.id == data.homework_id))
    hw = hw_result.scalar_one_or_none()
    if not hw:
        raise HTTPException(status_code=404, detail="Задание не найдено")

    # проверяем, что урок принадлежит этому ученику
    lesson_result = await db.execute(select(Lesson).where(Lesson.id == hw.lesson_id))
    lesson = lesson_result.scalar_one_or_none()
    if lesson.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Это задание не назначено вам")

    # проверяем дедлайн
    now = datetime.now(tz=timezone.utc)
    deadline = hw.deadline if hw.deadline.tzinfo else hw.deadline.replace(tzinfo=timezone.utc)
    answer_status = AnswerStatus.submitted if now <= deadline else AnswerStatus.overdue

    # проверяем, нет ли уже отправленного ответа
    existing = await db.execute(
        select(Answer).where(
            and_(Answer.homework_id == data.homework_id, Answer.student_id == current_user.id)
        )
    )
    answer = existing.scalar_one_or_none()

    auto_score = _auto_grade(hw, data.content or "") if data.content else None
    graded_at = now if auto_score is not None else None
    final_status = AnswerStatus.graded if auto_score is not None else answer_status

    if answer:
        answer.content = data.content
        answer.files = data.files
        answer.status = final_status
        answer.submitted_at = now
        answer.score = auto_score
        answer.graded_at = graded_at
    else:
        answer = Answer(
            homework_id=data.homework_id,
            student_id=current_user.id,
            content=data.content,
            files=data.files,
            status=final_status,
            submitted_at=now,
            score=auto_score,
            graded_at=graded_at,
        )
        db.add(answer)

    await log_action(db, user_id=current_user.id, action="CREATE",
                     entity_type="answer", entity_id=answer.id if answer.id else None,
                     new_value={"homework_id": data.homework_id, "status": final_status},
                     ip_address=request.client.host if request.client else None)

    # обновляем статус ДЗ
    if now > deadline:
        hw.status = HomeworkStatus.overdue
    elif auto_score is not None:
        hw.status = HomeworkStatus.graded
    else:
        hw.status = HomeworkStatus.submitted

    await db.commit()
    await db.refresh(answer)

    # уведомление репетитору
    lesson_res = await db.execute(select(Lesson).where(Lesson.id == hw.lesson_id))
    lesson = lesson_res.scalar_one_or_none()
    if lesson:
        await send_push(
            user_id=lesson.tutor_id,
            title="Ученик сдал ответ",
            body=f"Задание: {hw.description[:60]}",
            url="/homework",
            tag="answer-submitted",
            db=db,
        )

    return answer


@router.get("/my", response_model=List[AnswerOut])
async def get_my_answers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ученик получает все свои ответы."""
    if current_user.role != Role.student:
        raise HTTPException(status_code=403, detail="Только ученик может использовать этот эндпоинт")
    result = await db.execute(
        select(Answer).where(Answer.student_id == current_user.id)
    )
    return result.scalars().all()


@router.get("/{homework_id}/all", response_model=List[AnswerOut])
async def get_all_answers(
    homework_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.tutor:
        raise HTTPException(status_code=403, detail="Только репетитор может просматривать все ответы")

    hw_result = await db.execute(select(Homework).where(Homework.id == homework_id))
    hw = hw_result.scalar_one_or_none()
    if not hw:
        raise HTTPException(status_code=404, detail="Задание не найдено")

    lesson_result = await db.execute(select(Lesson).where(Lesson.id == hw.lesson_id))
    lesson = lesson_result.scalar_one_or_none()
    if lesson.tutor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Это задание не ваше")

    result = await db.execute(select(Answer).where(Answer.homework_id == homework_id))
    return result.scalars().all()


@router.put("/{answer_id}/grade", response_model=AnswerOut)
async def grade_answer(
    request: Request,
    answer_id: int,
    data: AnswerGrade,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.tutor:
        raise HTTPException(status_code=403, detail="Только репетитор может выставлять оценки")

    answer_result = await db.execute(select(Answer).where(Answer.id == answer_id))
    answer = answer_result.scalar_one_or_none()
    if not answer:
        raise HTTPException(status_code=404, detail="Ответ не найден")

    hw_result = await db.execute(select(Homework).where(Homework.id == answer.homework_id))
    hw = hw_result.scalar_one_or_none()
    lesson_result = await db.execute(select(Lesson).where(Lesson.id == hw.lesson_id))
    lesson = lesson_result.scalar_one_or_none()
    if lesson.tutor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Это задание не ваше")

    if data.score > hw.max_score:
        raise HTTPException(
            status_code=400,
            detail=f"Оценка не может превышать максимальный балл ({hw.max_score})",
        )

    answer.score = data.score
    answer.comment = data.comment
    answer.status = AnswerStatus.graded
    answer.graded_at = datetime.now(tz=timezone.utc)
    hw.status = HomeworkStatus.graded
    await log_action(db, user_id=current_user.id, action="UPDATE",
                     entity_type="answer", entity_id=answer_id,
                     new_value={"score": data.score, "comment": data.comment},
                     ip_address=request.client.host if request.client else None)
    await db.commit()
    await db.refresh(answer)

    # уведомление ученику об оценке
    await send_push(
        user_id=answer.student_id,
        title="Задание проверено",
        body=f"Оценка: {data.score}/{hw.max_score}",
        url="/homework",
        tag="answer-graded",
        db=db,
    )

    return answer
