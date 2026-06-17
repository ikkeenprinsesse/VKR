# backend/routers/progress.py
from typing import List

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


async def _compute_progress(
    db: AsyncSession, student_id: int, tutor: User
) -> StudentProgressOut:
    tutor_id = tutor.id

    hw_result = await db.execute(
        select(Homework)
        .join(Lesson, Homework.lesson_id == Lesson.id)
        .where(and_(Lesson.student_id == student_id, Lesson.tutor_id == tutor_id))
    )
    homeworks = hw_result.scalars().all()
    total_hw = len(homeworks)
    submitted_hw = sum(1 for hw in homeworks if hw.status in (HomeworkStatus.submitted, HomeworkStatus.graded))
    graded_hw = sum(1 for hw in homeworks if hw.status == HomeworkStatus.graded)
    C = submitted_hw / total_hw if total_hw > 0 else 0.0

    if graded_hw > 0:
        hw_ids = [hw.id for hw in homeworks if hw.status == HomeworkStatus.graded]
        ans_result = await db.execute(
            select(Answer).where(
                and_(Answer.homework_id.in_(hw_ids), Answer.student_id == student_id,
                     Answer.status == AnswerStatus.graded, Answer.score.isnot(None))
            )
        )
        answers = ans_result.scalars().all()
        hw_map = {hw.id: hw for hw in homeworks}
        scores = [ans.score / hw_map[ans.homework_id].max_score
                  for ans in answers if ans.homework_id in hw_map and hw_map[ans.homework_id].max_score > 0]
        Q = sum(scores) / len(scores) if scores else 0.0
    else:
        Q = 0.0

    lesson_result = await db.execute(
        select(Lesson).where(
            and_(Lesson.student_id == student_id, Lesson.tutor_id == tutor_id,
                 Lesson.status.notin_([LessonStatus.planned, LessonStatus.confirmed]))
        )
    )
    lessons = lesson_result.scalars().all()
    total_lessons = len(lessons)
    attended = sum(1 for l in lessons if l.status in (LessonStatus.completed, LessonStatus.in_progress))
    A = attended / total_lessons if total_lessons > 0 else 0.0
    P = round((ALPHA * C + BETA * Q + GAMMA * A) * 100, 2)

    return StudentProgressOut(
        student_id=student_id,
        tutor_id=tutor_id,
        tutor_name=tutor.name,
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


@router.get("/{student_id}", response_model=List[StudentProgressOut])
async def get_student_progress(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == Role.student:
        if current_user.id != student_id:
            raise HTTPException(status_code=403, detail="Вы можете видеть только свой прогресс")

        rels_result = await db.execute(
            select(TutorStudentRelation).where(TutorStudentRelation.student_id == student_id)
        )
        rels = rels_result.scalars().all()
        if not rels:
            return []

        tutors_result = await db.execute(
            select(User).where(User.id.in_([r.tutor_id for r in rels]))
        )
        tutors = tutors_result.scalars().all()
        return [await _compute_progress(db, student_id, tutor) for tutor in tutors]

    elif current_user.role == Role.tutor:
        rel_result = await db.execute(
            select(TutorStudentRelation).where(
                and_(TutorStudentRelation.tutor_id == current_user.id,
                     TutorStudentRelation.student_id == student_id)
            )
        )
        if not rel_result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Этот ученик не ваш")
        return [await _compute_progress(db, student_id, current_user)]

    raise HTTPException(status_code=403, detail="Нет доступа")
