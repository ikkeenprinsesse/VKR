from sqlalchemy import Column, Integer, String, Enum
from .database import Base  # ← Относительный импорт
import enum

class Role(enum.Enum):
    student = "student"
    tutor = "tutor"
    admin = "admin"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    role = Column(Enum(Role), nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)