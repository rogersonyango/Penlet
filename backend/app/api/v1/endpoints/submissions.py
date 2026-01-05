"""
Submission Endpoints
Assignment submission and grading
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.models import User, Content, Submission, ContentType, AssignmentStatus, UserRole
from app.schemas.schemas import SubmissionCreate, SubmissionUpdate, SubmissionGrade, SubmissionResponse
from app.api.deps import get_current_active_user, get_teacher_user

router = APIRouter()


@router.get("/", response_model=List[SubmissionResponse])
async def list_submissions(
    assignment_id: Optional[UUID] = None,
    status: Optional[AssignmentStatus] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """List submissions."""
    query = select(Submission).options(selectinload(Submission.student))
    
    if current_user.role == UserRole.STUDENT:
        query = query.where(Submission.student_id == current_user.id)
    
    if assignment_id:
        query = query.where(Submission.assignment_id == assignment_id)
    if status:
        query = query.where(Submission.status == status)
    
    query = query.order_by(Submission.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/my", response_model=List[SubmissionResponse])
async def get_my_submissions(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's submissions."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students have submissions")
    
    result = await db.execute(
        select(Submission)
        .options(selectinload(Submission.student), selectinload(Submission.assignment))
        .where(Submission.student_id == current_user.id)
        .order_by(Submission.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_submission(
    submission_data: SubmissionCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit an assignment."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can submit")
    
    result = await db.execute(
        select(Content).where(Content.id == submission_data.assignment_id, Content.content_type == ContentType.ASSIGNMENT)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    
    existing = await db.execute(
        select(Submission).where(
            Submission.assignment_id == submission_data.assignment_id,
            Submission.student_id == current_user.id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already submitted")
    
    is_late = assignment.due_date and datetime.utcnow() > assignment.due_date
    if is_late and not assignment.allow_late_submission:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Late submissions not allowed")
    
    new_submission = Submission(
        assignment_id=submission_data.assignment_id,
        student_id=current_user.id,
        content=submission_data.content,
        file_url=submission_data.file_url,
        status=AssignmentStatus.LATE if is_late else AssignmentStatus.SUBMITTED,
        submitted_at=datetime.utcnow(),
    )
    db.add(new_submission)
    await db.commit()
    await db.refresh(new_submission)
    return new_submission


@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get submission by ID."""
    result = await db.execute(
        select(Submission).options(selectinload(Submission.student)).where(Submission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    
    if current_user.role == UserRole.STUDENT and submission.student_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    return submission


@router.put("/{submission_id}", response_model=SubmissionResponse)
async def update_submission(
    submission_id: UUID,
    update_data: SubmissionUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a submission (before graded)."""
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    
    if submission.student_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    if submission.status == AssignmentStatus.GRADED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot update graded submission")
    
    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(submission, field, value)
    
    await db.commit()
    await db.refresh(submission)
    return submission


@router.post("/{submission_id}/grade", response_model=SubmissionResponse)
async def grade_submission(
    submission_id: UUID,
    grade_data: SubmissionGrade,
    current_user: User = Depends(get_teacher_user),
    db: AsyncSession = Depends(get_db),
):
    """Grade a submission (teachers only)."""
    result = await db.execute(
        select(Submission).options(selectinload(Submission.assignment)).where(Submission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    
    if submission.assignment.max_score and grade_data.score > submission.assignment.max_score:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Score cannot exceed max score of {submission.assignment.max_score}")
    
    submission.score = grade_data.score
    submission.feedback = grade_data.feedback
    submission.status = AssignmentStatus.GRADED
    submission.graded_by = current_user.id
    submission.graded_at = datetime.utcnow()
    
    await db.commit()
    
    # Reload with relationships
    result = await db.execute(
        select(Submission)
        .options(selectinload(Submission.student), selectinload(Submission.assignment))
        .where(Submission.id == submission_id)
    )
    return result.scalar_one()


@router.get("/assignment/{assignment_id}/stats")
async def get_assignment_stats(
    assignment_id: UUID,
    current_user: User = Depends(get_teacher_user),
    db: AsyncSession = Depends(get_db),
):
    """Get submission statistics for an assignment."""
    from sqlalchemy import func
    
    result = await db.execute(
        select(
            func.count(Submission.id).label("total"),
            func.count().filter(Submission.status == AssignmentStatus.GRADED).label("graded"),
            func.avg(Submission.score).label("average_score"),
        ).where(Submission.assignment_id == assignment_id)
    )
    stats = result.one()
    
    return {
        "total_submissions": stats.total,
        "graded": stats.graded,
        "pending": stats.total - stats.graded,
        "average_score": round(stats.average_score, 2) if stats.average_score else None
    }