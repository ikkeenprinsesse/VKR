import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from .database import engine, Base
from .scheduler import start_scheduler, stop_scheduler
from .limiter import limiter
from .routers.users import router as users_router
from .routers.auth import router as auth_router
from .routers.invitations import router as invitations_router
from .routers.lessons import router as lessons_router
from .routers.homework import router as homework_router
from .routers.answers import router as answers_router
from .routers.payments import router as payments_router
from .routers.chat import router as chat_router
from .routers.forum import router as forum_router
from .routers.yoomoney import router as yoomoney_router
from .routers.progress import router as progress_router
from .routers.upload import router as upload_router
from .routers.calendar import router as calendar_router
from .routers.reports import router as reports_router
from .routers.notifications import router as notifications_router
from .routers.email_auth import router as email_auth_router
from .routers.admin import router as admin_router
from .routers.slots import router as slots_router
from .routers.subscriptions import router as subscriptions_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="TutorConnect API", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)



app.include_router(users_router)
app.include_router(auth_router)
app.include_router(invitations_router)
app.include_router(lessons_router)
app.include_router(homework_router)
app.include_router(answers_router)
app.include_router(payments_router)
app.include_router(chat_router)
app.include_router(forum_router)
app.include_router(yoomoney_router)
app.include_router(progress_router)
app.include_router(upload_router)
app.include_router(calendar_router)
app.include_router(reports_router)
app.include_router(notifications_router)
app.include_router(email_auth_router)
app.include_router(slots_router)
app.include_router(subscriptions_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"message": "TutorConnect backend работает!"}
