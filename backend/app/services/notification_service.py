"""
Notification Service
Handles creating notifications for various events
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.models.models import User, Notification, UserRole, Content
from app.services.email_service import email_service
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for creating and managing notifications."""
    
    @staticmethod
    async def create_notification(
        db: AsyncSession,
        user_id: UUID,
        notification_type: str,
        title: str,
        message: str,
        link: Optional[str] = None,
    ) -> Notification:
        """Create a single notification."""
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            link=link,
        )
        db.add(notification)
        await db.flush()
        return notification
    
    @staticmethod
    async def create_bulk_notifications(
        db: AsyncSession,
        user_ids: List[UUID],
        notification_type: str,
        title: str,
        message: str,
        link: Optional[str] = None,
    ) -> List[Notification]:
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
        await db.flush()
        return notifications
    
    @staticmethod
    async def notify_new_assignment(
        db: AsyncSession,
        assignment: Content,
        teacher_name: str,
        student_ids: List[UUID],
        send_email: bool = True,
    ):
        """Notify students about a new assignment."""
        title = f"New Assignment: {assignment.title}"
        message = f"{teacher_name} posted a new assignment in {assignment.subject.name}."
        link = "/student/assignments"
        
        # Create in-app notifications
        await NotificationService.create_bulk_notifications(
            db=db,
            user_ids=student_ids,
            notification_type="assignment_new",
            title=title,
            message=message,
            link=link,
        )
        
        # Optionally send emails
        if send_email:
            # Get student emails
            result = await db.execute(
                select(User).where(User.id.in_(student_ids))
            )
            students = result.scalars().all()
            
            for student in students:
                try:
                    email_service.send_assignment_notification(
                        to_email=student.email,
                        student_name=student.first_name,
                        assignment_title=assignment.title,
                        subject_name=assignment.subject.name,
                        due_date=assignment.due_date,
                        teacher_name=teacher_name,
                    )
                except Exception as e:
                    logger.error(f"Failed to send assignment email to {student.email}: {e}")
        
        logger.info(f"Notified {len(student_ids)} students about assignment: {assignment.title}")
    
    @staticmethod
    async def notify_assignment_graded(
        db: AsyncSession,
        student_id: UUID,
        assignment_title: str,
        score: float,
        max_score: float,
        feedback: Optional[str] = None,
        send_email: bool = True,
    ):
        """Notify a student that their assignment was graded."""
        percentage = round((score / max_score) * 100, 1)
        title = f"Assignment Graded: {assignment_title}"
        message = f"You scored {score}/{max_score} ({percentage}%)"
        link = "/student/assignments"
        
        # Create in-app notification
        await NotificationService.create_notification(
            db=db,
            user_id=student_id,
            notification_type="assignment_graded",
            title=title,
            message=message,
            link=link,
        )
        
        # Send email
        if send_email:
            result = await db.execute(select(User).where(User.id == student_id))
            student = result.scalar_one_or_none()
            
            if student:
                try:
                    email_service.send_grade_notification(
                        to_email=student.email,
                        student_name=student.first_name,
                        assignment_title=assignment_title,
                        score=score,
                        max_score=max_score,
                        feedback=feedback,
                    )
                except Exception as e:
                    logger.error(f"Failed to send grade email to {student.email}: {e}")
        
        logger.info(f"Notified student {student_id} about graded assignment: {assignment_title}")
    
    @staticmethod
    async def notify_new_content(
        db: AsyncSession,
        content: Content,
        teacher_name: str,
        student_ids: List[UUID],
    ):
        """Notify students about new content (notes, videos)."""
        content_type_label = "notes" if content.content_type == "note" else "video"
        title = f"New {content_type_label.title()}: {content.title}"
        message = f"{teacher_name} uploaded new {content_type_label} for {content.subject.name}."
        link = f"/student/{content_type_label}s" if content.content_type == "note" else "/student/videos"
        
        await NotificationService.create_bulk_notifications(
            db=db,
            user_ids=student_ids,
            notification_type="content_new",
            title=title,
            message=message,
            link=link,
        )
        
        logger.info(f"Notified {len(student_ids)} students about new content: {content.title}")
    
    @staticmethod
    async def notify_assignment_due_soon(
        db: AsyncSession,
        assignment: Content,
        student_ids: List[UUID],
        hours_remaining: int,
    ):
        """Notify students about upcoming assignment deadline."""
        title = f"Assignment Due Soon: {assignment.title}"
        
        if hours_remaining <= 1:
            message = f"Your assignment is due in less than an hour!"
        elif hours_remaining <= 24:
            message = f"Your assignment is due in {hours_remaining} hours."
        else:
            days = hours_remaining // 24
            message = f"Your assignment is due in {days} day{'s' if days > 1 else ''}."
        
        link = "/student/assignments"
        
        await NotificationService.create_bulk_notifications(
            db=db,
            user_ids=student_ids,
            notification_type="assignment_due",
            title=title,
            message=message,
            link=link,
        )
        
        logger.info(f"Notified {len(student_ids)} students about due assignment: {assignment.title}")
    
    @staticmethod
    async def notify_welcome(
        db: AsyncSession,
        user_id: UUID,
        first_name: str,
        role: str,
    ):
        """Send welcome notification to new user."""
        title = "Welcome to Penlet! 🎉"
        
        if role == "student":
            message = "Start exploring your subjects, notes, and videos. Good luck with your studies!"
            link = "/student"
        elif role == "teacher":
            message = "You can now upload content and manage your students. Let's get started!"
            link = "/teacher"
        else:
            message = "You have admin access to manage the platform."
            link = "/admin"
        
        await NotificationService.create_notification(
            db=db,
            user_id=user_id,
            notification_type="welcome",
            title=title,
            message=message,
            link=link,
        )
        
        logger.info(f"Sent welcome notification to user {user_id}")


# Singleton instance
notification_service = NotificationService()