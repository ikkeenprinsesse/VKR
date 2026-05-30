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
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"


class AutoCheckType(str, enum.Enum):
    none = "none"
    test = "test"
    numerical = "numerical"
    text = "text"


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
    created_at = Column(DateTime(timezone=True), server_default=func.now())

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
