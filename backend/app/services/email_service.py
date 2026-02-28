"""
Email Service
Handles sending emails for verification, password reset, notifications, etc.
Supports multiple providers: SendGrid (recommended), Resend, SMTP
"""

import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from datetime import datetime
import httpx
import os

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via SendGrid, Resend, or SMTP."""
    
    def __init__(self):
        # Get provider from settings or environment directly
        self.provider = os.environ.get('EMAIL_PROVIDER', getattr(settings, 'EMAIL_PROVIDER', 'smtp')).lower()
        self.sendgrid_api_key = os.environ.get('SENDGRID_API_KEY', getattr(settings, 'SENDGRID_API_KEY', None))
        self.resend_api_key = os.environ.get('RESEND_API_KEY', getattr(settings, 'RESEND_API_KEY', None))
        self.smtp_host = getattr(settings, 'SMTP_HOST', None)
        self.smtp_port = getattr(settings, 'SMTP_PORT', 587)
        self.smtp_user = getattr(settings, 'SMTP_USER', None)
        self.smtp_password = getattr(settings, 'SMTP_PASSWORD', None)
        self.from_email = os.environ.get('FROM_EMAIL', getattr(settings, 'FROM_EMAIL', 'noreply@example.com'))
        self.from_name = os.environ.get('FROM_NAME', getattr(settings, 'FROM_NAME', 'Penlet'))
        self.use_tls = getattr(settings, 'SMTP_USE_TLS', True)
        self.frontend_url = os.environ.get('FRONTEND_URL', getattr(settings, 'FRONTEND_URL', 'https://penlet-frontend.onrender.com/'))
        
        logger.info(f"Email service initialized - Provider: {self.provider}, From: {self.from_email}")
        if self.sendgrid_api_key:
            logger.info("SendGrid API key is configured")
        if self.resend_api_key:
            logger.info("Resend API key is configured")
    
    async def send_email_sendgrid(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send email using SendGrid API."""
        logger.info(f"Attempting to send email via SendGrid to {to_email}")
        
        if not self.sendgrid_api_key:
            logger.error("SendGrid API key not configured")
            return False
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    headers={
                        "Authorization": f"Bearer {self.sendgrid_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "personalizations": [
                            {
                                "to": [{"email": to_email}]
                            }
                        ],
                        "from": {
                            "email": self.from_email,
                            "name": self.from_name
                        },
                        "subject": subject,
                        "content": [
                            {
                                "type": "text/plain",
                                "value": text_content or "Please view this email in HTML format."
                            },
                            {
                                "type": "text/html",
                                "value": html_content
                            }
                        ]
                    },
                    timeout=30.0
                )
                
                # SendGrid returns 202 for successful sends
                if response.status_code in [200, 202]:
                    logger.info(f"Email sent successfully to {to_email} via SendGrid")
                    return True
                else:
                    logger.error(f"SendGrid API error: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Failed to send email via SendGrid to {to_email}: {str(e)}")
            return False
    
    async def send_email_resend(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send email using Resend API."""
        logger.info(f"Attempting to send email via Resend to {to_email}")
        
        if not self.resend_api_key:
            logger.error("Resend API key not configured")
            return False
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {self.resend_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "from": f"{self.from_name} <{self.from_email}>",
                        "to": [to_email],
                        "subject": subject,
                        "html": html_content,
                        "text": text_content or ""
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    logger.info(f"Email sent successfully to {to_email} via Resend")
                    return True
                else:
                    logger.error(f"Resend API error: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Failed to send email via Resend to {to_email}: {str(e)}")
            return False
    
    def send_email_smtp(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send email using SMTP."""
        logger.info(f"Attempting to send email via SMTP to {to_email}")
        
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email
            
            if text_content:
                msg.attach(MIMEText(text_content, "plain"))
            msg.attach(MIMEText(html_content, "html"))
            
            if self.use_tls:
                server = smtplib.SMTP(self.smtp_host, self.smtp_port)
                server.starttls()
            else:
                server = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port)
            
            if self.smtp_user and self.smtp_password:
                server.login(self.smtp_user, self.smtp_password)
            
            server.sendmail(self.from_email, to_email, msg.as_string())
            server.quit()
            
            logger.info(f"Email sent successfully to {to_email} via SMTP")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email via SMTP to {to_email}: {str(e)}")
            return False
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send an email using configured provider."""
        logger.info(f"send_email called - Provider: {self.provider}")
        
        if self.provider == "sendgrid":
            return await self.send_email_sendgrid(to_email, subject, html_content, text_content)
        elif self.provider == "resend":
            return await self.send_email_resend(to_email, subject, html_content, text_content)
        else:
            return self.send_email_smtp(to_email, subject, html_content, text_content)
    
    async def send_verification_email(self, to_email: str, first_name: str, token: str) -> bool:
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
        
        return await self.send_email(
            to_email=to_email,
            subject="Verify your Penlet account",
            html_content=html_content,
            text_content=text_content
        )
    
    async def send_password_reset_email(self, to_email: str, first_name: str, token: str) -> bool:
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

If you didn't request a password reset, please ignore this email.

Best regards,
The Penlet Team
        """
        
        return await self.send_email(
            to_email=to_email,
            subject="Reset your Penlet password",
            html_content=html_content,
            text_content=text_content
        )
    
    async def send_welcome_email(self, to_email: str, first_name: str, role: str) -> bool:
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
        
        return await self.send_email(
            to_email=to_email,
            subject="Welcome to Penlet! 🎉",
            html_content=html_content
        )
    
    async def send_assignment_notification(
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
        
        return await self.send_email(
            to_email=to_email,
            subject=f"New Assignment: {assignment_title}",
            html_content=html_content
        )
    
    async def send_grade_notification(
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
        
        return await self.send_email(
            to_email=to_email,
            subject=f"Your assignment has been graded: {assignment_title}",
            html_content=html_content
        )


# Email Templates - Using table-based buttons for email client compatibility
# All text uses dark colors on white backgrounds for readability
EMAIL_TEMPLATES = {
    "verification": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="background-color: #7c3aed; border-radius: 16px 16px 0 0; padding: 40px;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Welcome to Penlet!</h1>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 40px; border-radius: 0 0 16px 16px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {first_name},</p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">Thanks for signing up! Please verify your email address to get started with your learning journey.</p>
                            
                            <!-- Button -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" style="padding: 24px 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="background-color: #7c3aed; border-radius: 8px;">
                                                    <a href="{verification_url}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold;">Verify Email Address</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
                            
                            <!-- Fallback Link -->
                            <p style="color: #666666; font-size: 12px; line-height: 1.6; margin: 16px 0 0 0;">If the button doesn't work, copy and paste this link into your browser:</p>
                            <p style="color: #7c3aed; font-size: 12px; line-height: 1.6; margin: 8px 0 0 0; word-break: break-all;">{verification_url}</p>
                            
                            <hr style="border: none; border-top: 1px solid #eeeeee; margin: 32px 0;">
                            <p style="color: #999999; font-size: 12px; text-align: center; margin: 0;">&copy; {year} Penlet. Built for Uganda's Education System.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
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
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="background-color: #7c3aed; border-radius: 16px 16px 0 0; padding: 40px;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Reset Your Password</h1>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 40px; border-radius: 0 0 16px 16px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {first_name},</p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">We received a request to reset your password. Click the button below to create a new password:</p>
                            
                            <!-- Button -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" style="padding: 24px 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="background-color: #7c3aed; border-radius: 8px;">
                                                    <a href="{reset_url}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold;">Reset Password</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
                            
                            <!-- Fallback Link -->
                            <p style="color: #666666; font-size: 12px; line-height: 1.6; margin: 16px 0 0 0;">If the button doesn't work, copy and paste this link into your browser:</p>
                            <p style="color: #7c3aed; font-size: 12px; line-height: 1.6; margin: 8px 0 0 0; word-break: break-all;">{reset_url}</p>
                            
                            <hr style="border: none; border-top: 1px solid #eeeeee; margin: 32px 0;">
                            <p style="color: #999999; font-size: 12px; text-align: center; margin: 0;">&copy; {year} Penlet. Built for Uganda's Education System.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
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
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="background-color: #7c3aed; border-radius: 16px 16px 0 0; padding: 40px;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">&#127881; You're All Set!</h1>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 40px; border-radius: 0 0 16px 16px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {first_name},</p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Your email has been verified and your account is now active!</p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">{role_message}</p>
                            
                            <!-- Button -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" style="padding: 24px 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="background-color: #7c3aed; border-radius: 8px;">
                                                    <a href="{login_url}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold;">Start Learning</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">If you have any questions, feel free to reach out to our support team.</p>
                            
                            <hr style="border: none; border-top: 1px solid #eeeeee; margin: 32px 0;">
                            <p style="color: #999999; font-size: 12px; text-align: center; margin: 0;">&copy; {year} Penlet. Built for Uganda's Education System.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
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
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="background-color: #7c3aed; border-radius: 16px 16px 0 0; padding: 40px;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">&#128218; New Assignment</h1>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 40px; border-radius: 0 0 16px 16px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {student_name},</p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">A new assignment has been posted:</p>
                            
                            <!-- Assignment Details Box -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8f9fa; border-radius: 12px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h2 style="color: #111111; margin: 0 0 12px 0; font-size: 20px;">{assignment_title}</h2>
                                        <p style="color: #555555; margin: 8px 0; font-size: 14px;"><strong style="color: #333333;">Subject:</strong> {subject_name}</p>
                                        <p style="color: #555555; margin: 8px 0; font-size: 14px;"><strong style="color: #333333;">Due Date:</strong> {due_date}</p>
                                        <p style="color: #555555; margin: 8px 0; font-size: 14px;"><strong style="color: #333333;">Posted by:</strong> {teacher_name}</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Button -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" style="padding: 24px 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="background-color: #7c3aed; border-radius: 8px;">
                                                    <a href="{assignments_url}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold;">View Assignment</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <hr style="border: none; border-top: 1px solid #eeeeee; margin: 32px 0;">
                            <p style="color: #999999; font-size: 12px; text-align: center; margin: 0;">&copy; {year} Penlet. Built for Uganda's Education System.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
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
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="background-color: #7c3aed; border-radius: 16px 16px 0 0; padding: 40px;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">&#9989; Assignment Graded</h1>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 40px; border-radius: 0 0 16px 16px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {student_name},</p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">Your assignment has been graded:</p>
                            
                            <!-- Score Box -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8f9fa; border-radius: 12px;">
                                <tr>
                                    <td align="center" style="padding: 24px;">
                                        <h2 style="color: #111111; margin: 0 0 16px 0; font-size: 18px;">{assignment_title}</h2>
                                        <p style="font-size: 48px; font-weight: bold; color: #7c3aed; margin: 16px 0;">{score}/{max_score}</p>
                                        <p style="color: #666666; font-size: 16px; margin: 0;">({percentage}%)</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Feedback Box -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 24px;">
                                <tr>
                                    <td style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0;">
                                        <p style="color: #92400e; margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">Teacher's Feedback:</p>
                                        <p style="color: #78350f; margin: 0; font-size: 14px;">{feedback}</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Button -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" style="padding: 24px 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="background-color: #7c3aed; border-radius: 8px;">
                                                    <a href="{assignments_url}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold;">View Details</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <hr style="border: none; border-top: 1px solid #eeeeee; margin: 32px 0;">
                            <p style="color: #999999; font-size: 12px; text-align: center; margin: 0;">&copy; {year} Penlet. Built for Uganda's Education System.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    """
}


# Create singleton instance
email_service = EmailService()