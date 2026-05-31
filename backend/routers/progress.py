# backend/routers/progress.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from ..database import get_db
from ..models import (
    Answer, AnswerStatus, Homework, HomeworkStatus,
    Lesson, LessonStatus, TutorStudentRelation, User, Role,
)
from ..schemas import StudentProgressOut
from ..security import get_current_user

router = APIRouter(prefix="/progress", tags=["progress"])

ALPHA = 0.4  # вес выполнения заданий
BETA = 0.4   # вес средней оценки
GAMMA = 0.2  # вес посещаемости


async def _compute_progress(db: AsyncSession, student_id: int, tutor_id: int) -> StudentProgressOut:
    # --- Домашние задания ---
    hw_stmt = (
        select(Homework)
        .join(Lesson, Homework.lesson_id == Lesson.id)
        .where(
            and_(
                Lesson.student_id == student_id,
                Lesson.tutor_id == tutor_id,
            )
        )
    )
    hw_result = await db.execute(hw_stmt)
    homeworks = hw_result.scalars().all()
    total_hw = len(homeworks)

    submitted_hw = sum(
        1 for hw in homeworks
        if hw.status in (HomeworkStatus.submitted, HomeworkStatus.graded)
    )
    graded_hw = sum(1 for hw in homeworks if hw.status == HomeworkStatus.graded)

    # C — доля выполненных (сданных или оценённых) заданий
    C = submitted_hw / total_hw if total_hw > 0 else 0.0

    # Q — средняя нормированная оценка по оценённым заданиям
    if graded_hw > 0:
        hw_ids = [hw.id for hw in homeworks if hw.status == HomeworkStatus.graded]
        ans_stmt = select(Answer).where(
            and_(
                Answer.homework_id.in_(hw_ids),
                Answer.student_id == student_id,
                Answer.status == AnswerStatus.graded,
                Answer.score.isnot(None),
            )
        )
        ans_result = await db.execute(ans_stmt)
        answers = ans_result.scalars().all()

        hw_map = {hw.id: hw for hw in homeworks}
        scores_normalized = []
        for ans in answers:
            hw = hw_map.get(ans.homework_id)
            if hw and hw.max_score > 0:
                scores_normalized.append(ans.score / hw.max_score)

        Q = sum(scores_normalized) / len(scores_normalized) if scores_normalized else 0.0
    else:
        Q = 0.0

    # --- Занятия (посещаемость) ---
    lesson_stmt = select(Lesson).where(
        and_(
            Lesson.student_id == student_id,
            Lesson.tutor_id == tutor_id,
            Lesson.status.notin_([LessonStatus.planned, LessonStatus.confirmed]),
        )
    )
    lesson_result = await db.execute(lesson_stmt)
    lessons = lesson_result.scalars().all()
    total_lessons = len(lessons)

    attended = sum(
        1 for l in lessons
        if l.status in (LessonStatus.completed, LessonStatus.in_progress)
    )

    # A — коэффициент посещаемости
    A = attended / total_lessons if total_lessons > 0 else 0.0

    # P — итоговый прогресс
    P = round((ALPHA * C + BETA * Q + GAMMA * A) * 100, 2)

    return StudentProgressOut(
        student_id=student_id,
        completion_rate=round(C, 4),
        avg_score_normalized=round(Q, 4),
        attendance_rate=round(A, 4),
        progress=P,
        total_homework=total_hw,
        submitted_homework=submitted_hw,
        graded_homework=graded_hw,
        total_lessons=total_lessons,
        attended_lessons=attended,
    )


@router.get("/{student_id}", response_model=StudentProgressOut)
async def get_student_progress(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == Role.student:
        # ученик смотрит только свой прогресс
        if current_user.id != student_id:
            raise HTTPException(status_code=403, detail="Вы можете видеть только свой прогресс")

        # находим своего репетитора
        rel_result = await db.execute(
            select(TutorStudentRelation).where(TutorStudentRelation.student_id == student_id)
        )
        rel = rel_result.scalar_one_or_none()
        if not rel:
            raise HTTPException(status_code=404, detail="Репетитор не найден")
        tutor_id = rel.tutor_id

    elif current_user.role == Role.tutor:
        # репетитор проверяет, что ученик его
        rel_result = await db.execute(
            select(TutorStudentRelation).where(
                and_(
                    TutorStudentRelation.tutor_id == current_user.id,
                    TutorStudentRelation.student_id == student_id,
                )
            )
        )
        if not rel_result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Этот ученик не ваш")
        tutor_id = current_user.id

    else:
        raise HTTPException(status_code=403, detail="Нет доступа")

    return await _compute_progress(db, student_id, tutor_id)
