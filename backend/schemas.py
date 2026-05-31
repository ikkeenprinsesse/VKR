# backend/schemas.py
from pydantic import BaseModel, EmailStr, Field, model_validator, ConfigDict
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Any
from .models import Role, LessonStatus, AutoCheckType, AnswerStatus, PaymentStatus


# ── Users ──────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: str
    role: Role
    subjects: Optional[str] = None
    level: Optional[str] = None
    invite_code: Optional[str] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    name: str
    role: Role
    subjects: Optional[str] = None
    level: Optional[str] = None
    rating: Optional[int] = None
    yoomoney_wallet: Optional[str] = None
    default_lesson_price: Optional[float] = None


class UserSettingsUpdate(BaseModel):
    """Обновление настроек профиля репетитора"""
    yoomoney_wallet: Optional[str] = None
    yoomoney_secret: Optional[str] = None
    default_lesson_price: Optional[float] = Field(None, ge=0)
    name: Optional[str] = None
    subjects: Optional[str] = None
    level: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    email: Optional[str] = None


# ── Invitations ────────────────────────────────────────────────────────────────

class InvitationCreate(BaseModel):
    expires_in_hours: int = 168


class InvitationOut(BaseModel):
    token: str
    invite_link: str
    expires_at: datetime


class InvitationAccept(BaseModel):
    token: str


# ── Lessons ────────────────────────────────────────────────────────────────────

class LessonCreate(BaseModel):
    student_id: int
    date: datetime
    duration: int = Field(..., gt=0, description="Длительность в минутах")
    topic: Optional[str] = None
    meeting_link: Optional[str] = None

    @model_validator(mode="after")
    def date_not_in_past(self):
        if self.date < datetime.now(tz=timezone.utc):
            raise ValueError("Дата занятия не может быть в прошлом")
        return self


class LessonUpdate(BaseModel):
    date: Optional[datetime] = None
    duration: Optional[int] = Field(None, gt=0)
    status: Optional[LessonStatus] = None
    topic: Optional[str] = None
    meeting_link: Optional[str] = None


class LessonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tutor_id: int
    student_id: int
    date: datetime
    duration: int
    status: LessonStatus
    topic: Optional[str] = None
    meeting_link: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


# ── Homework ───────────────────────────────────────────────────────────────────

class HomeworkCreate(BaseModel):
    lesson_id: int
    description: str
    files: Optional[List[Any]] = None
    deadline: datetime
    auto_check_type: AutoCheckType = AutoCheckType.none
    correct_answer: Optional[str] = None
    max_score: int = Field(100, gt=0)

    @model_validator(mode="after")
    def deadline_at_least_one_hour_ahead(self):
        min_deadline = datetime.now(tz=timezone.utc) + timedelta(hours=1)
        dl = self.deadline
        if dl.tzinfo is None:
            dl = dl.replace(tzinfo=timezone.utc)
        if dl < min_deadline:
            raise ValueError("Дедлайн должен быть минимум через 1 час от текущего времени")
        return self


class HomeworkUpdate(BaseModel):
    description: Optional[str] = None
    files: Optional[List[Any]] = None
    deadline: Optional[datetime] = None
    auto_check_type: Optional[AutoCheckType] = None
    correct_answer: Optional[str] = None
    max_score: Optional[int] = Field(None, gt=0)


class HomeworkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lesson_id: int
    description: str
    files: Optional[List[Any]] = None
    deadline: datetime
    auto_check_type: AutoCheckType
    correct_answer: Optional[str] = None
    max_score: int
    created_at: datetime


# ── Answers ────────────────────────────────────────────────────────────────────

class AnswerSubmit(BaseModel):
    homework_id: int
    content: Optional[str] = None
    files: Optional[List[Any]] = None


class AnswerGrade(BaseModel):
    score: float = Field(..., ge=0)
    comment: Optional[str] = None


class AnswerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    homework_id: int
    student_id: int
    content: Optional[str] = None
    files: Optional[List[Any]] = None
    score: Optional[float] = None
    comment: Optional[str] = None
    status: AnswerStatus
    submitted_at: Optional[datetime] = None
    graded_at: Optional[datetime] = None


# ── Payments ───────────────────────────────────────────────────────────────────

class PaymentRecord(BaseModel):
    lesson_id: int
    amount: float = Field(..., ge=0)
    currency: str = "RUB"
    payment_method: Optional[str] = None
    payment_date: Optional[datetime] = None


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lesson_id: int
    amount: float
    currency: str
    status: PaymentStatus
    payment_date: Optional[datetime] = None
    payment_method: Optional[str] = None
    created_at: datetime


class PaymentAnalyticsItem(BaseModel):
    period: str
    total: float
    count: int


# ── Chat ───────────────────────────────────────────────────────────────────────

class MessageSend(BaseModel):
    receiver_id: int
    text: str
    files: Optional[List[Any]] = None


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sender_id: int
    receiver_id: int
    text: str
    files: Optional[List[Any]] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime


# ── Forum ──────────────────────────────────────────────────────────────────────

class ForumThreadCreate(BaseModel):
    title: str
    homework_id: Optional[int] = None


class ForumThreadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    tutor_id: int
    homework_id: Optional[int] = None
    created_at: datetime


class ForumPostCreate(BaseModel):
    text: str
    files: Optional[List[Any]] = None


class ForumPostOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    thread_id: int
    user_id: int
    text: str
    files: Optional[List[Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
