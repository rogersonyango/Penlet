"""
Subject Management Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.models.models import User, Subject, UserRole, StudentClass, student_subjects, teacher_subjects
from app.schemas.schemas import SubjectCreate, SubjectUpdate, SubjectResponse, SubjectBriefResponse
from app.api.deps import get_current_active_user, get_admin_user, get_teacher_user

router = APIRouter()


@router.get("/", response_model=List[SubjectResponse])
async def list_subjects(
    class_level: Optional[StudentClass] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """List all subjects, optionally filtered by class level."""
    query = select(Subject).where(Subject.is_active == True)
    
    if class_level:
        query = query.where(Subject.class_levels.contains([class_level.value]))
    
    if current_user.role == UserRole.STUDENT and current_user.student_class:
        query = query.where(Subject.class_levels.contains([current_user.student_class.value]))
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
async def create_subject(
    subject_data: SubjectCreate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new subject (admin only)."""
    existing = await db.execute(select(Subject).where(Subject.code == subject_data.code.upper()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject code already exists")
    
    new_subject = Subject(
        name=subject_data.name,
        code=subject_data.code.upper(),
        description=subject_data.description,
        icon=subject_data.icon,
        color=subject_data.color,
        class_levels=[level.value for level in subject_data.class_levels],
        is_compulsory=subject_data.is_compulsory,
    )
    db.add(new_subject)
    await db.commit()
    await db.refresh(new_subject)
    return new_subject


@router.get("/{subject_id}", response_model=SubjectResponse)
async def get_subject(
    subject_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get subject by ID."""
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    return subject


@router.put("/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: UUID,
    update_data: SubjectUpdate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a subject (admin only)."""
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    
    for field, value in update_data.model_dump(exclude_unset=True).items():
        if field == "class_levels" and value is not None:
            value = [level.value for level in value]
        setattr(subject, field, value)
    
    await db.commit()
    await db.refresh(subject)
    return subject


@router.delete("/{subject_id}")
async def delete_subject(
    subject_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a subject (admin only)."""
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    
    subject.is_active = False
    await db.commit()
    return {"message": "Subject deleted successfully"}


@router.post("/{subject_id}/enroll")
async def enroll_in_subject(
    subject_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Enroll current student in a subject."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can enroll")
    
    result = await db.execute(select(Subject).where(Subject.id == subject_id, Subject.is_active == True))
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    
    if current_user.student_class and current_user.student_class.value not in subject.class_levels:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject not available for your class")
    
    stmt = student_subjects.insert().values(student_id=current_user.id, subject_id=subject_id)
    try:
        await db.execute(stmt)
        await db.commit()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already enrolled in this subject")
    
    return {"message": "Enrolled successfully"}


@router.get("/my/enrolled", response_model=List[SubjectBriefResponse])
async def get_my_subjects(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get subjects for the current user."""
    import logging
    logger = logging.getLogger(__name__)
    
    if current_user.role == UserRole.STUDENT:
        # Get subjects available for the student's class level
        if current_user.student_class:
            class_level = current_user.student_class.value
            logger.info(f"Fetching subjects for student class: {class_level}")
            
            # First get all active subjects and filter in Python
            # This is more reliable than JSONB operators across different PostgreSQL versions
            all_subjects_result = await db.execute(
                select(Subject).where(Subject.is_active == True)
            )
            all_subjects = all_subjects_result.scalars().all()
            
            # Filter subjects that include this class level
            matching_subjects = [
                s for s in all_subjects 
                if s.class_levels and class_level in s.class_levels
            ]
            
            logger.info(f"Found {len(matching_subjects)} subjects for class {class_level}")
            for s in matching_subjects:
                logger.info(f"  - {s.name}: {s.class_levels}")
            
            return matching_subjects
        else:
            logger.info("Student has no class assigned")
            return []
    elif current_user.role == UserRole.TEACHER:
        result = await db.execute(
            select(Subject).join(teacher_subjects).where(teacher_subjects.c.teacher_id == current_user.id)
        )
        return result.scalars().all()
    else:
        result = await db.execute(select(Subject).where(Subject.is_active == True))
        return result.scalars().all()