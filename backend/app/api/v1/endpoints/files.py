"""
File Upload Endpoints
Handle file uploads for notes, videos, assignments, and profile pictures
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID, uuid4
import os
import aiofiles
import magic
from datetime import datetime
import logging

from app.core.database import get_db
from app.core.config import settings
from app.models.models import User
from app.schemas.schemas import FileUploadResponse
from app.api.deps import get_current_active_user, get_teacher_user

router = APIRouter()
logger = logging.getLogger(__name__)

# Create upload directory if it doesn't exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(f"{settings.UPLOAD_DIR}/notes", exist_ok=True)
os.makedirs(f"{settings.UPLOAD_DIR}/videos", exist_ok=True)
os.makedirs(f"{settings.UPLOAD_DIR}/assignments", exist_ok=True)
os.makedirs(f"{settings.UPLOAD_DIR}/submissions", exist_ok=True)
os.makedirs(f"{settings.UPLOAD_DIR}/profiles", exist_ok=True)


# MIME type mapping
MIME_TYPES = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
}


def get_mime_type(filename: str) -> str:
    """Get MIME type from filename extension."""
    ext = os.path.splitext(filename)[1].lower()
    return MIME_TYPES.get(ext, "application/octet-stream")


def validate_file(file: UploadFile, allowed_types: list = None, max_size_mb: int = None) -> tuple:
    """
    Validate uploaded file.
    Returns (is_valid, error_message, mime_type)
    """
    if allowed_types is None:
        allowed_types = settings.ALLOWED_FILE_TYPES
    if max_size_mb is None:
        max_size_mb = settings.MAX_UPLOAD_SIZE_MB
    
    # Check file size (read first chunk to estimate)
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > max_size_mb * 1024 * 1024:
        return False, f"File too large. Maximum size is {max_size_mb}MB", None
    
    # Check MIME type
    header = file.file.read(2048)
    file.file.seek(0)
    
    try:
        mime = magic.Magic(mime=True)
        mime_type = mime.from_buffer(header)
    except Exception:
        mime_type = file.content_type
    
    if mime_type not in allowed_types:
        return False, f"File type {mime_type} not allowed", None
    
    return True, None, mime_type


def generate_unique_filename(original_filename: str) -> str:
    """Generate unique filename to prevent conflicts."""
    ext = os.path.splitext(original_filename)[1]
    unique_id = uuid4().hex[:12]
    timestamp = datetime.now().strftime("%Y%m%d")
    return f"{timestamp}_{unique_id}{ext}"


@router.post("/upload/note", response_model=FileUploadResponse)
async def upload_note(
    file: UploadFile = File(...),
    current_user: User = Depends(get_teacher_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a note file (PDF)."""
    allowed_types = ["application/pdf"]
    is_valid, error, mime_type = validate_file(file, allowed_types, max_size_mb=20)
    
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
    
    filename = generate_unique_filename(file.filename)
    file_path = f"{settings.UPLOAD_DIR}/notes/{filename}"
    
    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)
    
    file.file.seek(0, 2)
    file_size = file.file.tell()
    
    logger.info(f"Note uploaded: {filename} by user {current_user.id}")
    
    return FileUploadResponse(
        file_url=f"/files/notes/{filename}",
        file_name=file.filename,
        file_size=file_size,
        mime_type=mime_type
    )


@router.post("/upload/video", response_model=FileUploadResponse)
async def upload_video(
    file: UploadFile = File(...),
    current_user: User = Depends(get_teacher_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a video file."""
    allowed_types = ["video/mp4", "video/webm", "video/quicktime"]
    is_valid, error, mime_type = validate_file(file, allowed_types, max_size_mb=500)
    
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
    
    filename = generate_unique_filename(file.filename)
    file_path = f"{settings.UPLOAD_DIR}/videos/{filename}"
    
    async with aiofiles.open(file_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):  # 1MB chunks
            await f.write(chunk)
    
    file.file.seek(0, 2)
    file_size = file.file.tell()
    
    logger.info(f"Video uploaded: {filename} by user {current_user.id}")
    
    return FileUploadResponse(
        file_url=f"/files/videos/{filename}",
        file_name=file.filename,
        file_size=file_size,
        mime_type=mime_type
    )


@router.post("/upload/submission", response_model=FileUploadResponse)
async def upload_submission(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a submission file."""
    allowed_types = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
    ]
    is_valid, error, mime_type = validate_file(file, allowed_types, max_size_mb=20)
    
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
    
    filename = generate_unique_filename(file.filename)
    file_path = f"{settings.UPLOAD_DIR}/submissions/{filename}"
    
    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)
    
    file.file.seek(0, 2)
    file_size = file.file.tell()
    
    logger.info(f"Submission uploaded: {filename} by user {current_user.id}")
    
    return FileUploadResponse(
        file_url=f"/files/submissions/{filename}",
        file_name=file.filename,
        file_size=file_size,
        mime_type=mime_type
    )


@router.post("/upload/profile-picture", response_model=FileUploadResponse)
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a profile picture."""
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    is_valid, error, mime_type = validate_file(file, allowed_types, max_size_mb=5)
    
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
    
    # Use user ID in filename to easily find/replace
    ext = os.path.splitext(file.filename)[1]
    filename = f"{current_user.id}{ext}"
    file_path = f"{settings.UPLOAD_DIR}/profiles/{filename}"
    
    # Delete old profile picture if exists
    for old_ext in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
        old_path = f"{settings.UPLOAD_DIR}/profiles/{current_user.id}{old_ext}"
        if os.path.exists(old_path) and old_path != file_path:
            os.remove(old_path)
    
    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)
    
    # Update user profile picture URL
    current_user.profile_picture = f"/files/profiles/{filename}"
    await db.commit()
    
    file.file.seek(0, 2)
    file_size = file.file.tell()
    
    logger.info(f"Profile picture uploaded for user {current_user.id}")
    
    return FileUploadResponse(
        file_url=f"/files/profiles/{filename}",
        file_name=file.filename,
        file_size=file_size,
        mime_type=mime_type
    )


@router.delete("/delete/{file_type}/{filename}")
async def delete_file(
    file_type: str,
    filename: str,
    current_user: User = Depends(get_teacher_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an uploaded file (teachers/admins only)."""
    if file_type not in ["notes", "videos", "assignments", "submissions"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type")
    
    file_path = f"{settings.UPLOAD_DIR}/{file_type}/{filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    
    os.remove(file_path)
    logger.info(f"File deleted: {file_path} by user {current_user.id}")
    
    return {"message": "File deleted successfully"}


@router.get("/notes/{filename}")
async def get_note(filename: str):
    """Serve a note file."""
    file_path = f"{settings.UPLOAD_DIR}/notes/{filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    
    mime_type = get_mime_type(filename)
    return FileResponse(
        file_path, 
        media_type=mime_type,
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )


@router.get("/videos/{filename}")
async def get_video(filename: str):
    """Serve a video file with streaming support."""
    file_path = f"{settings.UPLOAD_DIR}/videos/{filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    
    mime_type = get_mime_type(filename)
    
    # For videos, use streaming response for better performance
    def iterfile():
        with open(file_path, "rb") as f:
            while chunk := f.read(1024 * 1024):  # 1MB chunks
                yield chunk
    
    file_size = os.path.getsize(file_path)
    
    return StreamingResponse(
        iterfile(),
        media_type=mime_type,
        headers={
            "Content-Length": str(file_size),
            "Accept-Ranges": "bytes",
        }
    )


@router.get("/submissions/{filename}")
async def get_submission(filename: str):
    """Serve a submission file."""
    file_path = f"{settings.UPLOAD_DIR}/submissions/{filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    
    mime_type = get_mime_type(filename)
    return FileResponse(
        file_path,
        media_type=mime_type,
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )


@router.get("/profiles/{filename}")
async def get_profile_picture(filename: str):
    """Serve a profile picture."""
    file_path = f"{settings.UPLOAD_DIR}/profiles/{filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    
    mime_type = get_mime_type(filename)
    return FileResponse(file_path, media_type=mime_type)