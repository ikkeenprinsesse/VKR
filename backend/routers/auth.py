from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta
from ..database import get_db
from ..models import User
from ..schemas import Token, TokenWithRefresh, RefreshRequest
from ..security import (
    verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES,
    create_refresh_token, rotate_refresh_token, revoke_refresh_token,
)

router = APIRouter(tags=["auth"])


@router.post("/token", response_model=TokenWithRefresh)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(User.email == form_data.username)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = await create_refresh_token(user.id, db)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/auth/refresh", response_model=TokenWithRefresh)
async def refresh_tokens(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    new_refresh, user = await rotate_refresh_token(body.refresh_token, db)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {
        "access_token": access_token,
        "refresh_token": new_refresh,
        "token_type": "bearer",
    }


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    await revoke_refresh_token(body.refresh_token, db)