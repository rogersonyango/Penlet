"""
Admin Endpoints
Administrative functions and user management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.models import (
    User, Subject, Content, AuditLog, UserRole, StudentClass,
    teacher_subjects, teacher_classes, ContentStatus
)
from app.schemas.schemas import (
    AdminUserCreate, UserResponse, UserBriefResponse, SubjectBriefResponse, AuditLogResponse
)
from app.api.deps import get_admin_user
from app.services.audit_service import log_audit_event

router = APIRouter()


@router.post("/users/teacher", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_teacher(
    request: Request,
    user_data: AdminUserCreate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new teacher account (admin only)."""
    existing = await db.execute(
        select(User).where((User.email == user_data.email.lower()) | (User.username == user_data.username.lower()))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email or username already exists")
    
    new_teacher = User(
        email=user_data.email.lower(),
        username=user_data.username.lower(),
        hashed_password=get_password_hash(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        role=UserRole.TEACHER,
        is_verified=user_data.is_verified,
    )
    db.add(new_teacher)
    await db.flush()
    
    # Assign subjects if provided
    if user_data.assigned_subjects:
        for subject_id in user_data.assigned_subjects:
            stmt = teacher_subjects.insert().values(teacher_id=new_teacher.id, subject_id=subject_id)
            await db.execute(stmt)
    
    # Assign classes if provided
    if user_data.assigned_classes:
        for class_level in user_data.assigned_classes:
            stmt = teacher_classes.insert().values(teacher_id=new_teacher.id, class_level=class_level)
            await db.execute(stmt)
    
    await db.commit()
    await db.refresh(new_teacher)
    
    await log_audit_event(
        db=db, action="teacher_created", resource_type="user", resource_id=str(new_teacher.id),
        user_id=current_user.id, ip_address=request.client.host if request.client else None,
        details={"teacher_email": new_teacher.email}
    )
    
    return new_teacher


@router.post("/users/{user_id}/assign-subject/{subject_id}")
async def assign_subject_to_teacher(
    request: Request,
    user_id: UUID,
    subject_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Assign a subject to a teacher."""
    result = await db.execute(select(User).where(User.id == user_id, User.role == UserRole.TEACHER))
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
    
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    
    try:
        stmt = teacher_subjects.insert().values(teacher_id=user_id, subject_id=subject_id)
        await db.execute(stmt)
        await db.commit()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject already assigned")
    
    await log_audit_event(
        db=db, action="subject_assigned", resource_type="teacher_subject",
        resource_id=f"{user_id}:{subject_id}", user_id=current_user.id,
        ip_address=request.client.host if request.client else None,
    )
    
    return {"message": "Subject assigned successfully"}


@router.delete("/users/{user_id}/remove-subject/{subject_id}")
async def remove_subject_from_teacher(
    request: Request,
    user_id: UUID,
    subject_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a subject from a teacher."""
    from sqlalchemy import delete
    
    result = await db.execute(
        delete(teacher_subjects).where(
            teacher_subjects.c.teacher_id == user_id,
            teacher_subjects.c.subject_id == subject_id
        )
    )
    
    if result.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    
    await db.commit()
    
    await log_audit_event(
        db=db, action="subject_removed", resource_type="teacher_subject",
        resource_id=f"{user_id}:{subject_id}", user_id=current_user.id,
        ip_address=request.client.host if request.client else None,
    )
    
    return {"message": "Subject removed successfully"}


@router.get("/content/pending", response_model=List[dict])
async def get_pending_content(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all content pending approval."""
    from sqlalchemy.orm import selectinload
    
    result = await db.execute(
        select(Content)
        .options(selectinload(Content.uploader), selectinload(Content.subject))
        .where(Content.status == ContentStatus.PENDING)
        .order_by(Content.created_at)
    )
    content_list = result.scalars().all()
    
    return [
        {
            "id": c.id,
            "title": c.title,
            "content_type": c.content_type.value,
            "subject": c.subject.name if c.subject else None,
            "uploader": c.uploader.full_name if c.uploader else None,
            "created_at": c.created_at,
        }
        for c in content_list
    ]


@router.get("/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    action: Optional[str] = None,
    user_id: Optional[UUID] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get audit logs (admin only)."""
    from sqlalchemy.orm import selectinload
    
    query = select(AuditLog).options(selectinload(AuditLog.user))
    
    if action:
        query = query.where(AuditLog.action == action)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    
    query = query.order_by(AuditLog.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/stats/overview")
async def get_admin_overview(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get admin dashboard overview statistics."""
    user_result = await db.execute(
        select(
            func.count(User.id).label("total"),
            func.count().filter(User.role == UserRole.STUDENT).label("students"),
            func.count().filter(User.role == UserRole.TEACHER).label("teachers"),
            func.count().filter(User.role == UserRole.ADMIN).label("admins"),
        ).where(User.is_active == True)
    )
    user_stats = user_result.one()
    
    content_result = await db.execute(
        select(
            func.count(Content.id).label("total"),
            func.count().filter(Content.status == ContentStatus.PENDING).label("pending"),
            func.count().filter(Content.status == ContentStatus.APPROVED).label("approved"),
        )
    )
    content_stats = content_result.one()
    
    subject_result = await db.execute(
        select(func.count(Subject.id)).where(Subject.is_active == True)
    )
    total_subjects = subject_result.scalar() or 0
    
    return {
        "users": {
            "total": user_stats.total,
            "students": user_stats.students,
            "teachers": user_stats.teachers,
            "admins": user_stats.admins
        },
        "content": {
            "total": content_stats.total,
            "pending": content_stats.pending,
            "approved": content_stats.approved
        },
        "subjects": total_subjects
    }


@router.get("/users/{user_id}/details")
async def get_user_details(
    user_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed user information including assigned subjects and classes (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # Get assigned subjects for teachers
    assigned_subjects = []
    assigned_classes = []
    
    if user.role == UserRole.TEACHER:
        # Get subjects
        try:
            subjects_result = await db.execute(
                select(Subject.id, Subject.name)
                .join(teacher_subjects, Subject.id == teacher_subjects.c.subject_id)
                .where(teacher_subjects.c.teacher_id == user_id)
            )
            assigned_subjects = [{"id": str(row[0]), "name": row[1]} for row in subjects_result.fetchall()]
        except Exception:
            assigned_subjects = []
        
        # Get classes
        try:
            classes_result = await db.execute(
                select(teacher_classes.c.class_level)
                .where(teacher_classes.c.teacher_id == user_id)
            )
            assigned_classes = [row[0].value if hasattr(row[0], 'value') else str(row[0]) for row in classes_result.fetchall()]
        except Exception:
            assigned_classes = []
    
    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone": user.phone,
        "role": user.role.value,
        "student_class": user.student_class.value if user.student_class else None,
        "is_active": user.is_active,
        "assigned_subjects": assigned_subjects,
        "assigned_classes": assigned_classes,
    }


@router.put("/users/{user_id}")
async def update_user(
    request: Request,
    user_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user information (admin only)."""
    data = await request.json()
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # Update basic fields
    if "first_name" in data:
        user.first_name = data["first_name"]
    if "last_name" in data:
        user.last_name = data["last_name"]
    if "email" in data:
        user.email = data["email"]
    if "phone" in data:
        user.phone = data["phone"]
    if "student_class" in data and data["student_class"]:
        user.student_class = StudentClass(data["student_class"])
    
    # Handle teacher-specific updates
    if user.role == UserRole.TEACHER:
        # Update assigned subjects
        if "assigned_subjects" in data:
            # Remove all existing subject assignments
            await db.execute(
                teacher_subjects.delete().where(teacher_subjects.c.teacher_id == user_id)
            )
            # Add new subject assignments
            for subject_id in data["assigned_subjects"]:
                if subject_id:  # Skip empty values
                    await db.execute(
                        teacher_subjects.insert().values(
                            teacher_id=user_id,
                            subject_id=UUID(subject_id)
                        )
                    )
        
        # Update assigned classes
        if "assigned_classes" in data:
            # Remove all existing class assignments
            await db.execute(
                teacher_classes.delete().where(teacher_classes.c.teacher_id == user_id)
            )
            # Add new class assignments
            for class_level in data["assigned_classes"]:
                if class_level:  # Skip empty values
                    await db.execute(
                        teacher_classes.insert().values(
                            teacher_id=user_id,
                            class_level=StudentClass(class_level)
                        )
                    )
    
    db.add(user)
    
    await log_audit_event(
        db=db, action="user_updated", resource_type="user", resource_id=str(user_id),
        user_id=current_user.id, ip_address=request.client.host if request.client else None,
        details={"updated_fields": list(data.keys())}
    )
    
    await db.commit()
    
    return {"message": "User updated successfully"}


@router.post("/users/{user_id}/toggle-active")
async def toggle_user_active(
    request: Request,
    user_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Enable or disable a user account."""
    import logging
    logger = logging.getLogger(__name__)
    
    if current_user.id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot modify your own account")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # Log current status
    logger.info(f"Toggling user {user_id}: current is_active={user.is_active}")
    
    # Toggle the is_active status
    new_status = not user.is_active
    user.is_active = new_status
    
    logger.info(f"Setting user {user_id} is_active to {new_status}")
    
    # Add to session explicitly
    db.add(user)
    
    # Log the audit event
    await log_audit_event(
        db=db, action="user_status_changed", resource_type="user", resource_id=str(user_id),
        user_id=current_user.id, ip_address=request.client.host if request.client else None,
        details={"is_active": new_status}
    )
    
    # Commit everything together
    await db.commit()
    
    # Refresh to get the updated state
    await db.refresh(user)
    
    logger.info(f"After commit, user {user_id} is_active={user.is_active}")
    
    return {"message": f"User {'activated' if user.is_active else 'deactivated'}", "is_active": user.is_active}