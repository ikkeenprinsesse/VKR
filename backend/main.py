from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers.users import router as users_router
from .routers.auth import router as auth_router

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

# Подключаем роутеры
app.include_router(users_router)
app.include_router(auth_router)

@app.get("/")
async def root():
    return {"message": "TutorConnect backend работает!"}