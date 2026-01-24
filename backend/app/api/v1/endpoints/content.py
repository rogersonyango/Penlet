"""
Content Management Endpoints
Notes, Videos, and Assignments
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
import logging

from app.core.database import get_db
from app.models.models import User, Content, Subject, ContentType, ContentStatus, UserRole, StudentClass, Notification
from app.schemas.schemas import (
    NoteCreate, VideoCreate, AssignmentCreate, ContentUpdate, ContentResponse, ContentApproval
)
from app.api.deps import get_current_active_user, get_teacher_user, get_admin_user

router = APIRouter()
logger = logging.getLogger(__name__)


# ============ Helper Functions for Notifications ============

async def create_notification(
    db: AsyncSession,
    user_id: UUID,
    notification_type: str,
    title: str,
    message: str,
    link: Optional[str] = None,
):
    """Create a single notification."""
    notification = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        link=link,
    )
    db.add(notification)
    return notification


async def create_bulk_notifications(
    db: AsyncSession,
    user_ids: List[UUID],
    notification_type: str,
    title: str,
    message: str,
    link: Optional[str] = None,
):
    """Create notifications for multiple users."""
    notifications = []
    for user_id in user_ids:
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            link=link,
        )
        notifications.append(notification)
    db.add_all(notifications)
    return notifications


async def get_students_for_content(db: AsyncSession, target_classes: List[str]) -> List[UUID]:
    """Get student IDs for given class levels."""
    if not target_classes:
        # If no target classes specified, get all students
        result = await db.execute(
            select(User.id).where(User.role == UserRole.STUDENT, User.is_active == True)
        )
    else:
        # Get students in the target classes
        class_enums = [StudentClass(c) for c in target_classes]
        result = await db.execute(
            select(User.id).where(
                User.role == UserRole.STUDENT,
                User.is_active == True,
                User.student_class.in_(class_enums)
            )
        )
    return [row[0] for row in result.fetchall()]


async def get_admin_ids(db: AsyncSession) -> List[UUID]:
    """Get all active admin user IDs."""
    result = await db.execute(
        select(User.id).where(User.role == UserRole.ADMIN, User.is_active == True)
    )
    return [row[0] for row in result.fetchall()]


async def notify_admins_new_content(
    db: AsyncSession,
    content: Content,
    teacher_name: str,
):
    """Notify all admins about new content pending approval."""
    admin_ids = await get_admin_ids(db)
    
    if admin_ids:
        content_type_label = content.content_type.value if content.content_type else "content"
        await create_bulk_notifications(
            db=db,
            user_ids=admin_ids,
            notification_type="content_pending",
            title=f"New {content_type_label.title()} Pending Approval",
            message=f"{teacher_name} submitted '{content.title}' for approval.",
            link="/admin/content",
        )
        logger.info(f"Notified {len(admin_ids)} admins about pending content: {content.title}")


# ============ Content Endpoints ============

@router.get("/", response_model=List[ContentResponse])
async def list_content(
    content_type: Optional[ContentType] = None,
    subject_id: Optional[UUID] = None,
    content_status: Optional[ContentStatus] = None,
    class_level: Optional[StudentClass] = None,
    uploaded_by_me: bool = False,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """List content with filters."""
    query = select(Content).options(
        selectinload(Content.subject),
        selectinload(Content.uploader)
    )
    
    # Filter by uploader if requested
    if uploaded_by_me:
        query = query.where(Content.uploaded_by == current_user.id)
    elif current_user.role == UserRole.STUDENT:
        query = query.where(Content.status == ContentStatus.APPROVED)
        if current_user.student_class:
            query = query.where(Content.target_classes.contains([current_user.student_class.value]))
    elif current_user.role == UserRole.TEACHER:
        query = query.where(
            (Content.uploaded_by == current_user.id) | (Content.status == ContentStatus.APPROVED)
        )
    
    if content_type:
        query = query.where(Content.content_type == content_type)
    if subject_id:
        query = query.where(Content.subject_id == subject_id)
    if content_status and current_user.role != UserRole.STUDENT:
        query = query.where(Content.status == content_status)
    if class_level:
        query = query.where(Content.target_classes.contains([class_level.value]))
    
    query = query.order_by(Content.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/notes", response_model=ContentResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    note_data: NoteCreate,
    current_user: User = Depends(get_teacher_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new note (teachers only)."""
    result = await db.execute(select(Subject).where(Subject.id == note_data.subject_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    
    new_note = Content(
        title=note_data.title,
        description=note_data.description,
        content_type=ContentType.NOTE,
        file_url=note_data.file_url,
        file_size=getattr(note_data, 'file_size', None),
        subject_id=note_data.subject_id,
        target_classes=[c.value if hasattr(c, 'value') else c for c in (note_data.target_classes or [])],
        uploaded_by=current_user.id,
        status=ContentStatus.PENDING if current_user.role == UserRole.TEACHER else ContentStatus.APPROVED,
    )
    db.add(new_note)
    await db.flush()
    
    # Notify admins if content is pending approval
    if new_note.status == ContentStatus.PENDING:
        try:
            teacher_name = f"{current_user.first_name} {current_user.last_name or ''}".strip()
            await notify_admins_new_content(db, new_note, teacher_name)
        except Exception as e:
            logger.error(f"Failed to notify admins: {e}")
    
    await db.commit()
    
    # Reload with relationships
    result = await db.execute(
        select(Content)
        .options(selectinload(Content.subject), selectinload(Content.uploader))
        .where(Content.id == new_note.id)
    )
    return result.scalar_one()


@router.post("/videos", response_model=ContentResponse, status_code=status.HTTP_201_CREATED)
async def create_video(
    video_data: VideoCreate,
    current_user: User = Depends(get_teacher_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new video (teachers only)."""
    result = await db.execute(select(Subject).where(Subject.id == video_data.subject_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    
    new_video = Content(
        title=video_data.title,
        description=video_data.description,
        content_type=ContentType.VIDEO,
        file_url=video_data.file_url,
        thumbnail_url=video_data.thumbnail_url,
        video_url=getattr(video_data, 'video_url', None),
        duration=video_data.duration,
        subject_id=video_data.subject_id,
        target_classes=[c.value if hasattr(c, 'value') else c for c in (video_data.target_classes or [])],
        uploaded_by=current_user.id,
        status=ContentStatus.PENDING if current_user.role == UserRole.TEACHER else ContentStatus.APPROVED,
    )
    db.add(new_video)
    await db.flush()
    
    # Notify admins if content is pending approval
    if new_video.status == ContentStatus.PENDING:
        try:
            teacher_name = f"{current_user.first_name} {current_user.last_name or ''}".strip()
            await notify_admins_new_content(db, new_video, teacher_name)
        except Exception as e:
            logger.error(f"Failed to notify admins: {e}")
    
    await db.commit()
    
    # Reload with relationships
    result = await db.execute(
        select(Content)
        .options(selectinload(Content.subject), selectinload(Content.uploader))
        .where(Content.id == new_video.id)
    )
    return result.scalar_one()


@router.post("/assignments", response_model=ContentResponse, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    assignment_data: AssignmentCreate,
    current_user: User = Depends(get_teacher_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new assignment (teachers only)."""
    result = await db.execute(select(Subject).where(Subject.id == assignment_data.subject_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    
    new_assignment = Content(
        title=assignment_data.title,
        description=assignment_data.description,
        content_type=ContentType.ASSIGNMENT,
        instructions=assignment_data.instructions,
        due_date=assignment_data.due_date,
        max_score=assignment_data.max_score,
        allow_late_submission=assignment_data.allow_late_submission,
        file_url=assignment_data.file_url,
        file_size=assignment_data.file_size,
        subject_id=assignment_data.subject_id,
        target_classes=[c.value if hasattr(c, 'value') else c for c in (assignment_data.target_classes or [])],
        uploaded_by=current_user.id,
        status=ContentStatus.PENDING if current_user.role == UserRole.TEACHER else ContentStatus.APPROVED,
    )
    db.add(new_assignment)
    await db.flush()
    
    # Notify admins if content is pending approval
    if new_assignment.status == ContentStatus.PENDING:
        try:
            teacher_name = f"{current_user.first_name} {current_user.last_name or ''}".strip()
            await notify_admins_new_content(db, new_assignment, teacher_name)
        except Exception as e:
            logger.error(f"Failed to notify admins: {e}")
    
    await db.commit()
    
    # Reload with relationships
    result = await db.execute(
        select(Content)
        .options(selectinload(Content.subject), selectinload(Content.uploader))
        .where(Content.id == new_assignment.id)
    )
    return result.scalar_one()


@router.get("/{content_id}", response_model=ContentResponse)
async def get_content(
    content_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get content by ID."""
    result = await db.execute(
        select(Content)
        .options(selectinload(Content.subject), selectinload(Content.uploader))
        .where(Content.id == content_id)
    )
    content = result.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    
    if current_user.role == UserRole.STUDENT and content.status != ContentStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Content not available")
    
    content.view_count += 1
    await db.commit()
    return content


@router.put("/{content_id}", response_model=ContentResponse)
async def update_content(
    content_id: UUID,
    update_data: ContentUpdate,
    current_user: User = Depends(get_teacher_user),
    db: AsyncSession = Depends(get_db),
):
    """Update content (owner or admin only)."""
    result = await db.execute(select(Content).where(Content.id == content_id))
    content = result.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    
    if current_user.role != UserRole.ADMIN and content.uploaded_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    for field, value in update_data.model_dump(exclude_unset=True).items():
        if field == "target_classes" and value is not None:
            value = [c.value if hasattr(c, 'value') else c for c in value]
        setattr(content, field, value)
    
    await db.commit()
    await db.refresh(content)
    return content


@router.delete("/{content_id}")
async def delete_content(
    content_id: UUID,
    current_user: User = Depends(get_teacher_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete content (owner or admin only)."""
    result = await db.execute(select(Content).where(Content.id == content_id))
    content = result.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    
    if current_user.role != UserRole.ADMIN and content.uploaded_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    await db.delete(content)
    await db.commit()
    return {"message": "Content deleted successfully"}


@router.post("/{content_id}/approve", response_model=ContentResponse)
async def approve_content(
    content_id: UUID,
    approval: ContentApproval,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Approve or reject content (admin only)."""
    # Get content with relationships
    result = await db.execute(
        select(Content)
        .options(selectinload(Content.subject), selectinload(Content.uploader))
        .where(Content.id == content_id)
    )
    content = result.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    
    # Update content status
    content.status = approval.status
    content.approved_by = current_user.id
    content.approved_at = datetime.utcnow()
    if approval.status == ContentStatus.REJECTED:
        content.rejection_reason = approval.rejection_reason
    
    # ============ CREATE NOTIFICATIONS ============
    
    # 1. Notify the teacher who uploaded the content
    if content.uploaded_by:
        if approval.status == ContentStatus.APPROVED:
            await create_notification(
                db=db,
                user_id=content.uploaded_by,
                notification_type="content_approved",
                title=f"Content Approved: {content.title}",
                message=f"Your {content.content_type.value} '{content.title}' has been approved and is now visible to students.",
                link=f"/teacher/content",
            )
            logger.info(f"Notification sent to teacher {content.uploaded_by} for approved content")
        else:
            reason = approval.rejection_reason or "No reason provided"
            await create_notification(
                db=db,
                user_id=content.uploaded_by,
                notification_type="content_rejected",
                title=f"Content Rejected: {content.title}",
                message=f"Your {content.content_type.value} '{content.title}' was rejected. Reason: {reason}",
                link=f"/teacher/content",
            )
            logger.info(f"Notification sent to teacher {content.uploaded_by} for rejected content")
    
    # 2. If approved, notify students who can access this content
    if approval.status == ContentStatus.APPROVED:
        try:
            student_ids = await get_students_for_content(db, content.target_classes or [])
            
            if student_ids:
                # Determine content type label and link
                if content.content_type == ContentType.NOTE:
                    type_label = "Notes"
                    link = "/student/notes"
                elif content.content_type == ContentType.VIDEO:
                    type_label = "Video"
                    link = "/student/videos"
                else:  # ASSIGNMENT
                    type_label = "Assignment"
                    link = "/student/assignments"
                
                subject_name = content.subject.name if content.subject else "Unknown Subject"
                teacher_name = content.uploader.full_name if content.uploader else "A teacher"
                
                await create_bulk_notifications(
                    db=db,
                    user_ids=student_ids,
                    notification_type="content_new" if content.content_type != ContentType.ASSIGNMENT else "assignment_new",
                    title=f"New {type_label}: {content.title}",
                    message=f"{teacher_name} posted new {type_label.lower()} for {subject_name}.",
                    link=link,
                )
                logger.info(f"Notifications sent to {len(student_ids)} students for new content: {content.title}")
        except Exception as e:
            # Don't fail the approval if notifications fail
            logger.error(f"Failed to send student notifications: {e}")
    
    await db.commit()
    
    # Reload with relationships
    result = await db.execute(
        select(Content)
        .options(selectinload(Content.subject), selectinload(Content.uploader))
        .where(Content.id == content_id)
    )
    return result.scalar_one()


@router.get("/assignments/upcoming", response_model=List[ContentResponse])
async def get_upcoming_assignments(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get upcoming assignments for the current user."""
    query = select(Content).options(
        selectinload(Content.subject),
        selectinload(Content.uploader)
    ).where(
        Content.content_type == ContentType.ASSIGNMENT,
        Content.status == ContentStatus.APPROVED,
        Content.due_date > datetime.utcnow()
    )
    
    if current_user.role == UserRole.STUDENT and current_user.student_class:
        query = query.where(Content.target_classes.contains([current_user.student_class.value]))
    
    query = query.order_by(Content.due_date)
    result = await db.execute(query)
    return result.scalars().all()