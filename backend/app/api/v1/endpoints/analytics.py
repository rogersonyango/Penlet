"""
Analytics Endpoints
Progress tracking and statistics
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from uuid import UUID
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.models.models import (
    User, Content, Submission, Flashcard, GameScore, Subject,
    ContentType, AssignmentStatus, UserRole, StudentClass, ContentStatus
)
from app.schemas.schemas import StudentAnalytics, TeacherAnalytics, AdminAnalytics
from app.api.deps import get_current_active_user, get_admin_user, get_teacher_user

router = APIRouter()


@router.get("/student", response_model=StudentAnalytics)
async def get_student_analytics(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get analytics for the current student."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students only")
    
    assignment_result = await db.execute(
        select(
            func.count(Submission.id).label("total"),
            func.count().filter(Submission.status == AssignmentStatus.GRADED).label("completed"),
            func.avg(Submission.score).label("avg_score"),
        ).where(Submission.student_id == current_user.id)
    )
    assignment_stats = assignment_result.one()
    
    game_result = await db.execute(
        select(
            func.count(GameScore.id).label("games_played"),
            func.coalesce(func.sum(GameScore.score), 0).label("total_score"),
        ).where(GameScore.user_id == current_user.id)
    )
    game_stats = game_result.one()
    
    flashcard_result = await db.execute(
        select(
            func.count(Flashcard.id).label("created"),
            func.coalesce(func.sum(Flashcard.times_reviewed), 0).label("reviewed"),
        ).where(Flashcard.creator_id == current_user.id)
    )
    flashcard_stats = flashcard_result.one()
    
    pending = assignment_stats.total - assignment_stats.completed if assignment_stats.total else 0
    
    return StudentAnalytics(
        total_assignments=assignment_stats.total or 0,
        completed_assignments=assignment_stats.completed or 0,
        pending_assignments=pending,
        average_score=round(assignment_stats.avg_score, 2) if assignment_stats.avg_score else None,
        games_played=game_stats.games_played or 0,
        total_game_score=game_stats.total_score or 0,
        flashcards_created=flashcard_stats.created or 0,
        flashcards_reviewed=flashcard_stats.reviewed or 0,
        study_time_minutes=0
    )


@router.get("/teacher", response_model=TeacherAnalytics)
async def get_teacher_analytics(
    current_user: User = Depends(get_teacher_user),
    db: AsyncSession = Depends(get_db),
):
    """Get analytics for the current teacher."""
    from app.models.models import teacher_subjects, teacher_classes
    
    # Count students in classes assigned to this teacher
    classes_result = await db.execute(
        select(teacher_classes.c.class_level)
        .where(teacher_classes.c.teacher_id == current_user.id)
    )
    assigned_classes = [row[0] for row in classes_result.fetchall()]
    
    if assigned_classes:
        student_result = await db.execute(
            select(func.count(User.id))
            .where(
                User.role == UserRole.STUDENT,
                User.is_active == True,
                User.student_class.in_(assigned_classes)
            )
        )
        total_students = student_result.scalar() or 0
    else:
        total_students = 0
    
    # Count content uploaded by this teacher
    content_result = await db.execute(
        select(func.count(Content.id)).where(Content.uploaded_by == current_user.id)
    )
    content_uploaded = content_result.scalar() or 0
    
    # Count subjects assigned to this teacher
    subjects_result = await db.execute(
        select(func.count(teacher_subjects.c.subject_id))
        .where(teacher_subjects.c.teacher_id == current_user.id)
    )
    subjects_count = subjects_result.scalar() or 0
    
    # Count pending and graded submissions for teacher's assignments
    submission_result = await db.execute(
        select(
            func.count().filter(Submission.status != AssignmentStatus.GRADED).label("pending"),
            func.count().filter(Submission.status == AssignmentStatus.GRADED).label("graded"),
            func.avg(Submission.score).label("avg_score"),
        )
        .join(Content, Submission.assignment_id == Content.id)
        .where(Content.uploaded_by == current_user.id)
    )
    submission_stats = submission_result.one()
    
    return TeacherAnalytics(
        total_students=total_students,
        subjects_assigned=subjects_count,
        content_uploaded=content_uploaded,
        pending_submissions=submission_stats.pending or 0,
        graded_submissions=submission_stats.graded or 0,
        average_class_score=round(submission_stats.avg_score, 2) if submission_stats.avg_score else None
    )


@router.get("/admin", response_model=AdminAnalytics)
async def get_admin_analytics(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get platform-wide analytics (admin only)."""
    user_result = await db.execute(
        select(
            func.count(User.id).label("total"),
            func.count().filter(User.role == UserRole.STUDENT).label("students"),
            func.count().filter(User.role == UserRole.TEACHER).label("teachers"),
        ).where(User.is_active == True)
    )
    user_stats = user_result.one()
    
    subject_result = await db.execute(
        select(func.count(Subject.id)).where(Subject.is_active == True)
    )
    total_subjects = subject_result.scalar() or 0
    
    content_result = await db.execute(select(func.count(Content.id)))
    total_content = content_result.scalar() or 0
    
    pending_result = await db.execute(
        select(func.count(Content.id)).where(Content.status == ContentStatus.PENDING)
    )
    pending_approvals = pending_result.scalar() or 0
    
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    active_result = await db.execute(
        select(func.count(User.id)).where(User.last_login >= today)
    )
    active_today = active_result.scalar() or 0
    
    week_ago = datetime.utcnow() - timedelta(days=7)
    new_result = await db.execute(
        select(func.count(User.id)).where(User.created_at >= week_ago)
    )
    new_this_week = new_result.scalar() or 0
    
    return AdminAnalytics(
        total_users=user_stats.total or 0,
        total_students=user_stats.students or 0,
        total_teachers=user_stats.teachers or 0,
        total_subjects=total_subjects,
        total_content=total_content,
        pending_approvals=pending_approvals,
        active_users_today=active_today,
        new_users_this_week=new_this_week
    )


@router.get("/class/{class_level}/performance")
async def get_class_performance(
    class_level: StudentClass,
    current_user: User = Depends(get_teacher_user),
    db: AsyncSession = Depends(get_db),
):
    """Get performance analytics for a specific class."""
    result = await db.execute(
        select(
            func.count(Submission.id).label("total_submissions"),
            func.avg(Submission.score).label("avg_score"),
            func.count().filter(Submission.status == AssignmentStatus.GRADED).label("graded"),
        )
        .join(User, Submission.student_id == User.id)
        .where(User.student_class == class_level)
    )
    stats = result.one()
    
    return {
        "class_level": class_level.value,
        "total_submissions": stats.total_submissions or 0,
        "graded_submissions": stats.graded or 0,
        "average_score": round(stats.avg_score, 2) if stats.avg_score else None
    }


@router.get("/leaderboard/students")
async def get_student_leaderboard(
    class_level: Optional[StudentClass] = None,
    limit: int = 10,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get student leaderboard based on game scores."""
    query = (
        select(
            User.id,
            User.username,
            User.first_name,
            User.last_name,
            User.student_class,
            func.coalesce(func.sum(GameScore.score), 0).label("total_score")
        )
        .outerjoin(GameScore, User.id == GameScore.user_id)
        .where(User.role == UserRole.STUDENT, User.is_active == True)
        .group_by(User.id)
        .order_by(func.coalesce(func.sum(GameScore.score), 0).desc())
        .limit(limit)
    )
    
    if class_level:
        query = query.where(User.student_class == class_level)
    
    result = await db.execute(query)
    
    leaderboard = []
    for rank, row in enumerate(result, 1):
        leaderboard.append({
            "rank": rank,
            "id": row.id,
            "username": row.username,
            "name": f"{row.first_name} {row.last_name}",
            "class": row.student_class.value if row.student_class else None,
            "total_score": row.total_score
        })
    
    return leaderboard