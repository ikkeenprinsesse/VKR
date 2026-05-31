# backend/routers/upload.py
import os
import uuid
import hashlib
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse

from ..models import User
from ..security import get_current_user

router = APIRouter(prefix="/upload", tags=["upload"])

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 МБ

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "application/zip",
}

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Недопустимый тип файла: {file.content_type}",
        )

    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Файл превышает 50 МБ")

    sha256 = hashlib.sha256(content).hexdigest()
    ext = Path(file.filename).suffix if file.filename else ""
    saved_name = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / saved_name

    with open(file_path, "wb") as f:
        f.write(content)

    return {
        "filename": saved_name,
        "original_name": file.filename,
        "content_type": file.content_type,
        "size": len(content),
        "sha256": sha256,
        "url": f"/upload/files/{saved_name}",
    }


@router.get("/files/{filename}")
async def get_file(
    filename: str,
    current_user: User = Depends(get_current_user),
):
    # защита от path traversal
    safe_name = Path(filename).name
    file_path = UPLOAD_DIR / safe_name

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Файл не найден")

    return FileResponse(file_path)
