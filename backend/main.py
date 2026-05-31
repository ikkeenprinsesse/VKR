from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
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

app = FastAPI(title="TutorConnect API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Таблицы созданы (или уже существуют)")


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


@app.get("/")
async def root():
    return {"message": "TutorConnect backend работает!"}
