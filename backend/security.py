# backend/security.py
from datetime import datetime, timedelta, timezone
from typing import Optional
import secrets
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from dotenv import load_dotenv
import os

from .database import get_db
from .models import User, RefreshToken

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is not set")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def create_refresh_token(user_id: int, db: AsyncSession) -> str:
    token = secrets.token_urlsafe(64)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    db_token = RefreshToken(user_id=user_id, token=token, expires_at=expires_at)
    db.add(db_token)
    await db.commit()
    return token


async def rotate_refresh_token(old_token: str, db: AsyncSession) -> tuple[str, "User"]:
    """Проверяет старый refresh-токен, отзывает его и выдаёт новый."""
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token == old_token)
    )
    db_token = result.scalar_one_or_none()

    if not db_token or db_token.revoked:
        raise HTTPException(status_code=401, detail="Refresh-токен недействителен")

    now = datetime.now(timezone.utc)
    expires = db_token.expires_at if db_token.expires_at.tzinfo else db_token.expires_at.replace(tzinfo=timezone.utc)
    if now > expires:
        raise HTTPException(status_code=401, detail="Refresh-токен истёк")

    user_result = await db.execute(select(User).where(User.id == db_token.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Пользователь не найден")

    # отзываем старый токен
    db_token.revoked = True
    await db.commit()

    # создаём новый
    new_token = await create_refresh_token(user.id, db)
    return new_token, user


async def revoke_refresh_token(token: str, db: AsyncSession) -> None:
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token == token)
    )
    db_token = result.scalar_one_or_none()
    if db_token:
        db_token.revoked = True
        await db.commit()


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось подтвердить учётные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user
