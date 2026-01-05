"""
User Management Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from uuid import UUID
import os
import uuid as uuid_lib
from pathlib import Path

from app.core.database import get_db
from app.core.security import get_password_hash, verify_password
from app.core.config import settings
from app.models.models import User, UserRole, StudentClass
from app.schemas.schemas import (
    UserResponse, UserUpdate, UserBriefResponse, PasswordChange, PaginatedResponse
)
from app.api.deps import get_current_active_user, get_admin_user

router = APIRouter()

# Allowed image extensions
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@router.get("/", response_model=List[UserBriefResponse])
async def list_users(
    role: Optional[UserRole] = None,
    student_class: Optional[StudentClass] = None,
    search: Optional[str] = None,
    include_inactive: bool = Query(False, description="Include inactive users (admin only)"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List all users (admin only)."""
    query = select(User)
    
    # Only filter by active status if include_inactive is False
    if not include_inactive:
        query = query.where(User.is_active == True)
    
    if role:
        query = query.where(User.role == role)
    if student_class:
        query = query.where(User.student_class == student_class)
    if search:
        search_term = f"%{search.lower()}%"
        query = query.where(
            (User.first_name.ilike(search_term)) |
            (User.last_name.ilike(search_term)) |
            (User.username.ilike(search_term)) |
            (User.email.ilike(search_term))
        )
    
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user by ID."""
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.put("/me", response_model=UserResponse)
async def update_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user's profile."""
    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/me/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload profile picture for current user."""
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read file content
    content = await file.read()
    
    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size too large. Maximum size is 5MB"
        )
    
    # Create uploads directory if it doesn't exist
    upload_dir = Path(settings.UPLOAD_DIR) / "profile_pictures"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Delete old profile picture if exists
    if current_user.profile_picture:
        old_file = Path(current_user.profile_picture)
        if old_file.exists():
            try:
                old_file.unlink()
            except Exception:
                pass
    
    # Generate unique filename
    unique_filename = f"{current_user.id}_{uuid_lib.uuid4().hex[:8]}{file_ext}"
    file_path = upload_dir / unique_filename
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Update user's profile picture path
    current_user.profile_picture = str(file_path)
    await db.commit()
    await db.refresh(current_user)
    
    return {
        "message": "Profile picture uploaded successfully",
        "profile_picture": f"/api/v1/users/profile-picture/{unique_filename}"
    }


@router.get("/profile-picture/{filename}")
async def get_profile_picture(filename: str):
    """Get profile picture by filename."""
    file_path = Path(settings.UPLOAD_DIR) / "profile_pictures" / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    
    return FileResponse(file_path)


@router.delete("/me/profile-picture")
async def delete_profile_picture(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete current user's profile picture."""
    if not current_user.profile_picture:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No profile picture to delete")
    
    # Delete file
    file_path = Path(current_user.profile_picture)
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception:
            pass
    
    # Clear database field
    current_user.profile_picture = None
    await db.commit()
    
    return {"message": "Profile picture deleted successfully"}


@router.post("/me/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Change current user's password."""
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")
    
    current_user.hashed_password = get_password_hash(password_data.new_password)
    await db.commit()
    return {"message": "Password changed successfully"}


@router.delete("/{user_id}")
async def delete_user(
    user_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a user (admin only)."""
    if current_user.id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    user.is_active = False
    await db.commit()
    return {"message": "User deleted successfully"}


@router.get("/students/by-class/{class_level}", response_model=List[UserBriefResponse])
async def get_students_by_class(
    class_level: StudentClass,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all students in a specific class."""
    if current_user.role == UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    result = await db.execute(
        select(User).where(User.role == UserRole.STUDENT, User.student_class == class_level, User.is_active == True)
    )
    return result.scalars().all()