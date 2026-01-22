"""
Email Service
Handles sending emails for verification, password reset, notifications, etc.
"""

import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List
from datetime import datetime, timedelta
import secrets
import hashlib

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via SMTP."""
    
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.FROM_EMAIL
        self.from_name = settings.FROM_NAME or "Penlet"
        self.use_tls = settings.SMTP_USE_TLS
        self.frontend_url = settings.FRONTEND_URL or "http://localhost:5173"
    
    def _get_smtp_connection(self):
        """Create SMTP connection."""
        if self.use_tls:
            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port)
        
        if self.smtp_user and self.smtp_password:
            server.login(self.smtp_user, self.smtp_password)
        
        return server
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send an email."""
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email
            
            # Add plain text version
            if text_content:
                msg.attach(MIMEText(text_content, "plain"))
            
            # Add HTML version
            msg.attach(MIMEText(html_content, "html"))
            
            # Send email
            with self._get_smtp_connection() as server:
                server.sendmail(self.from_email, to_email, msg.as_string())
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    def send_verification_email(self, to_email: str, first_name: str, token: str) -> bool:
        """Send email verification link."""
        verification_url = f"{self.frontend_url}/verify-email?token={token}"
        
        html_content = EMAIL_TEMPLATES["verification"].format(
            first_name=first_name,
            verification_url=verification_url,
            year=datetime.now().year
        )
        
        text_content = f"""
Hi {first_name},

Welcome to Penlet! Please verify your email address by clicking the link below:

{verification_url}

This link will expire in 24 hours.

If you didn't create an account, please ignore this email.

Best regards,
The Penlet Team
        """
        
        return self.send_email(
            to_email=to_email,
            subject="Verify your Penlet account",
            html_content=html_content,
            text_content=text_content
        )
    
    def send_password_reset_email(self, to_email: str, first_name: str, token: str) -> bool:
        """Send password reset link."""
        reset_url = f"{self.frontend_url}/reset-password?token={token}"
        
        html_content = EMAIL_TEMPLATES["password_reset"].format(
            first_name=first_name,
            reset_url=reset_url,
            year=datetime.now().year
        )
        
        text_content = f"""
Hi {first_name},

We received a request to reset your password. Click the link below to create a new password:

{reset_url}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email or contact support if you're concerned.

Best regards,
The Penlet Team
        """
        
        return self.send_email(
            to_email=to_email,
            subject="Reset your Penlet password",
            html_content=html_content,
            text_content=text_content
        )
    
    def send_welcome_email(self, to_email: str, first_name: str, role: str) -> bool:
        """Send welcome email after verification."""
        login_url = f"{self.frontend_url}/login"
        
        role_message = {
            "student": "You now have access to notes, videos, assignments, and more!",
            "teacher": "You can now upload content and manage your students!",
            "admin": "You have full access to manage the Penlet platform!"
        }.get(role, "You now have access to all Penlet features!")
        
        html_content = EMAIL_TEMPLATES["welcome"].format(
            first_name=first_name,
            role_message=role_message,
            login_url=login_url,
            year=datetime.now().year
        )
        
        return self.send_email(
            to_email=to_email,
            subject="Welcome to Penlet! 🎉",
            html_content=html_content
        )
    
    def send_assignment_notification(
        self,
        to_email: str,
        student_name: str,
        assignment_title: str,
        subject_name: str,
        due_date: datetime,
        teacher_name: str
    ) -> bool:
        """Send notification when a new assignment is posted."""
        assignments_url = f"{self.frontend_url}/student/assignments"
        
        html_content = EMAIL_TEMPLATES["assignment_notification"].format(
            student_name=student_name,
            assignment_title=assignment_title,
            subject_name=subject_name,
            due_date=due_date.strftime("%B %d, %Y at %I:%M %p"),
            teacher_name=teacher_name,
            assignments_url=assignments_url,
            year=datetime.now().year
        )
        
        return self.send_email(
            to_email=to_email,
            subject=f"New Assignment: {assignment_title}",
            html_content=html_content
        )
    
    def send_grade_notification(
        self,
        to_email: str,
        student_name: str,
        assignment_title: str,
        score: float,
        max_score: float,
        feedback: Optional[str] = None
    ) -> bool:
        """Send notification when an assignment is graded."""
        assignments_url = f"{self.frontend_url}/student/assignments"
        percentage = round((score / max_score) * 100, 1)
        
        html_content = EMAIL_TEMPLATES["grade_notification"].format(
            student_name=student_name,
            assignment_title=assignment_title,
            score=score,
            max_score=max_score,
            percentage=percentage,
            feedback=feedback or "No additional feedback provided.",
            assignments_url=assignments_url,
            year=datetime.now().year
        )
        
        return self.send_email(
            to_email=to_email,
            subject=f"Your assignment has been graded: {assignment_title}",
            html_content=html_content
        )


# Email Templates with modern design
EMAIL_TEMPLATES = {
    "verification": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); border-radius: 16px 16px 0 0; padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Penlet!</h1>
        </div>
        <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi {first_name},</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Thanks for signing up! Please verify your email address to get started with your learning journey.</p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="{verification_url}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Verify Email Address</a>
            </div>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">© {year} Penlet. Built for Uganda's Education System.</p>
        </div>
    </div>
</body>
</html>
    """,
    
    "password_reset": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); border-radius: 16px 16px 0 0; padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Reset Your Password</h1>
        </div>
        <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi {first_name},</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="{reset_url}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Reset Password</a>
            </div>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">© {year} Penlet. Built for Uganda's Education System.</p>
        </div>
    </div>
</body>
</html>
    """,
    
    "welcome": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); border-radius: 16px 16px 0 0; padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 You're All Set!</h1>
        </div>
        <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi {first_name},</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Your email has been verified and your account is now active!</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">{role_message}</p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="{login_url}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Start Learning</a>
            </div>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">If you have any questions, feel free to reach out to our support team.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">© {year} Penlet. Built for Uganda's Education System.</p>
        </div>
    </div>
</body>
</html>
    """,
    
    "assignment_notification": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); border-radius: 16px 16px 0 0; padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">📚 New Assignment</h1>
        </div>
        <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi {student_name},</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">A new assignment has been posted:</p>
            <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <h2 style="color: #111827; margin: 0 0 12px 0; font-size: 20px;">{assignment_title}</h2>
                <p style="color: #6b7280; margin: 8px 0; font-size: 14px;"><strong>Subject:</strong> {subject_name}</p>
                <p style="color: #6b7280; margin: 8px 0; font-size: 14px;"><strong>Due Date:</strong> {due_date}</p>
                <p style="color: #6b7280; margin: 8px 0; font-size: 14px;"><strong>Posted by:</strong> {teacher_name}</p>
            </div>
            <div style="text-align: center; margin: 32px 0;">
                <a href="{assignments_url}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Assignment</a>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">© {year} Penlet. Built for Uganda's Education System.</p>
        </div>
    </div>
</body>
</html>
    """,
    
    "grade_notification": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); border-radius: 16px 16px 0 0; padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✅ Assignment Graded</h1>
        </div>
        <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi {student_name},</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Your assignment has been graded:</p>
            <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 18px;">{assignment_title}</h2>
                <div style="font-size: 48px; font-weight: 700; color: #10b981; margin: 16px 0;">{score}/{max_score}</div>
                <p style="color: #6b7280; font-size: 16px; margin: 0;">({percentage}%)</p>
            </div>
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin: 24px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;"><strong>Teacher's Feedback:</strong></p>
                <p style="color: #78350f; margin: 8px 0 0 0; font-size: 14px;">{feedback}</p>
            </div>
            <div style="text-align: center; margin: 32px 0;">
                <a href="{assignments_url}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Details</a>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">© {year} Penlet. Built for Uganda's Education System.</p>
        </div>
    </div>
</body>
</html>
    """
}


# Create singleton instance
email_service = EmailService()