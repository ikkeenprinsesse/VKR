# backend/models.py
from sqlalchemy import (
    Column, Integer, String, Enum, Boolean, DateTime, ForeignKey,
    Text, Float, JSON, Time
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum


class Role(str, enum.Enum):
    student = "student"
    tutor = "tutor"
    admin = "admin"


class LessonStatus(str, enum.Enum):
    planned = "planned"
    confirmed = "confirmed"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"


class AutoCheckType(str, enum.Enum):
    none = "none"
    test = "test"
    numerical = "numerical"
    text = "text"
    file = "file"
    essay = "essay"


class HomeworkStatus(str, enum.Enum):
    draft = "draft"
    assigned = "assigned"
    submitted = "submitted"
    overdue = "overdue"
    graded = "graded"


class AnswerStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    graded = "graded"
    overdue = "overdue"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    refunded = "refunded"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(Enum(Role), nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    subjects = Column(Text, nullable=True)
    level = Column(String, nullable=True)
    photo = Column(String, nullable=True)
    rating = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # Настройки оплаты (для репетиторов)
    yoomoney_wallet = Column(String, nullable=True)       # номер кошелька ЮMoney
    yoomoney_secret = Column(String, nullable=True)       # секрет для верификации вебхука
    default_lesson_price = Column(Float, nullable=True)   # цена занятия по умолчанию

    tutor_relations = relationship(
        "TutorStudentRelation", back_populates="tutor",
        foreign_keys="TutorStudentRelation.tutor_id"
    )
    student_relations = relationship(
        "TutorStudentRelation", back_populates="student",
        foreign_keys="TutorStudentRelation.student_id"
    )
    tutor_lessons = relationship(
        "Lesson", back_populates="tutor", foreign_keys="Lesson.tutor_id"
    )
    student_lessons = relationship(
        "Lesson", back_populates="student", foreign_keys="Lesson.student_id"
    )
    sent_messages = relationship(
        "Message", back_populates="sender", foreign_keys="Message.sender_id"
    )
    received_messages = relationship(
        "Message", back_populates="receiver", foreign_keys="Message.receiver_id"
    )
    forum_threads = relationship("ForumThread", back_populates="tutor")
    forum_posts = relationship("ForumPost", back_populates="user")
    answers = relationship("Answer", back_populates="student")


class TutorStudentRelation(Base):
    __tablename__ = "tutor_student_relations"

    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tutor = relationship("User", back_populates="tutor_relations", foreign_keys=[tutor_id])
    student = relationship("User", back_populates="student_relations", foreign_keys=[student_id])


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tutor = relationship("User")


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    duration = Column(Integer, nullable=False)  # minutes
    status = Column(Enum(LessonStatus), default=LessonStatus.planned, nullable=False)
    topic = Column(String, nullable=True)
    meeting_link = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    tutor = relationship("User", back_populates="tutor_lessons", foreign_keys=[tutor_id])
    student = relationship("User", back_populates="student_lessons", foreign_keys=[student_id])
    homeworks = relationship("Homework", back_populates="lesson")
    payment = relationship("Payment", back_populates="lesson", uselist=False)


class Homework(Base):
    __tablename__ = "homeworks"

    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    description = Column(Text, nullable=False)
    files = Column(JSON, nullable=True)
    deadline = Column(DateTime(timezone=True), nullable=False)
    auto_check_type = Column(Enum(AutoCheckType), default=AutoCheckType.none, nullable=False)
    correct_answer = Column(Text, nullable=True)
    max_score = Column(Integer, default=100, nullable=False)
    status = Column(Enum(HomeworkStatus), default=HomeworkStatus.assigned, nullable=False)
    notified_24h = Column(Boolean, default=False, nullable=False)
    notified_1h = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lesson = relationship("Lesson", back_populates="homeworks")
    answers = relationship("Answer", back_populates="homework")
    forum_threads = relationship("ForumThread", back_populates="homework")


class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)
    homework_id = Column(Integer, ForeignKey("homeworks.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=True)
    files = Column(JSON, nullable=True)
    score = Column(Float, nullable=True)
    comment = Column(Text, nullable=True)
    status = Column(Enum(AnswerStatus), default=AnswerStatus.draft, nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    graded_at = Column(DateTime(timezone=True), nullable=True)

    homework = relationship("Homework", back_populates="answers")
    student = relationship("User", back_populates="answers")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="RUB", nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.pending, nullable=False)
    payment_date = Column(DateTime(timezone=True), nullable=True)
    payment_method = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lesson = relationship("Lesson", back_populates="payment")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    text = Column(Text, nullable=False)
    files = Column(JSON, nullable=True)
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sender = relationship("User", back_populates="sent_messages", foreign_keys=[sender_id])
    receiver = relationship("User", back_populates="received_messages", foreign_keys=[receiver_id])


class ForumThread(Base):
    __tablename__ = "forum_threads"

    id = Column(Integer, primary_key=True, index=True)
    homework_id = Column(Integer, ForeignKey("homeworks.id"), nullable=True)
    title = Column(String, nullable=False)
    tutor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tutor = relationship("User", back_populates="forum_threads")
    homework = relationship("Homework", back_populates="forum_threads")
    posts = relationship("ForumPost", back_populates="thread")


class ForumPost(Base):
    __tablename__ = "forum_posts"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("forum_threads.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    text = Column(Text, nullable=False)
    files = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    thread = relationship("ForumThread", back_populates="posts")
    user = relationship("User", back_populates="forum_posts")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


class EmailToken(Base):
    """Токены для верификации email и сброса пароля."""
    __tablename__ = "email_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, nullable=False, index=True)
    purpose = Column(String, nullable=False)   # "verify" | "reset"
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


class PushSubscription(Base):
    """Подписки браузеров на Web Push уведомления."""
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    endpoint = Column(Text, unique=True, nullable=False)
    p256dh = Column(Text, nullable=False)   # ключ шифрования клиента
    auth = Column(Text, nullable=False)     # ключ аутентификации клиента
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


class AvailableSlot(Base):
    """Доступный слот репетитора для записи.

    is_recurring=False  → разовый слот на конкретную дату
    is_recurring=True   → регулярный: каждую неделю в weekday в hour:minute
    reserved_for_student_id → слот закреплён за конкретным учеником
    booked_lesson_id    → когда ученик записался — ссылка на созданный урок
    """
    __tablename__ = "available_slots"

    id                       = Column(Integer, primary_key=True, index=True)
    tutor_id                 = Column(Integer, ForeignKey("users.id"), nullable=False)
    duration                 = Column(Integer, nullable=False, default=60)       # минуты
    is_recurring             = Column(Boolean, default=False)
    # Разовый слот
    slot_date                = Column(DateTime(timezone=True), nullable=True)
    # Регулярный слот
    weekday                  = Column(Integer, nullable=True)   # 0=Пн … 6=Вс
    slot_hour                = Column(Integer, nullable=True)   # 0-23
    slot_minute              = Column(Integer, nullable=True)   # 0/30 etc
    # Ограничения записи
    reserved_for_student_id  = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active                = Column(Boolean, default=True)
    created_at               = Column(DateTime(timezone=True), server_default=func.now())

    tutor    = relationship("User", foreign_keys=[tutor_id])
    reserved = relationship("User", foreign_keys=[reserved_for_student_id])


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)       # CREATE, UPDATE, DELETE
    entity_type = Column(String, nullable=False)  # "lesson", "homework", "payment", ...
    entity_id = Column(Integer, nullable=True)
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
