"""
Audit Service
Handles logging of administrative and security-related actions
"""

from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any
from uuid import UUID
import logging

from app.models.models import AuditLog

logger = logging.getLogger(__name__)


async def log_audit_event(
    db: AsyncSession,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    user_id: Optional[UUID] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    status: str = "success",
    error_message: Optional[str] = None,
) -> AuditLog:
    """
    Create an audit log entry.
    
    Args:
        db: Database session
        action: Action performed (e.g., "user_login", "content_approved")
        resource_type: Type of resource affected (e.g., "user", "content")
        resource_id: ID of the affected resource
        user_id: ID of the user who performed the action
        ip_address: Client IP address
        user_agent: Client user agent string
        details: Additional details as JSON
        status: "success" or "failure"
        error_message: Error message if status is "failure"
    
    Returns:
        The created AuditLog entry
    """
    audit_log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
        status=status,
        error_message=error_message,
    )
    
    db.add(audit_log)
    # Don't commit here - let the calling function handle the transaction
    
    # Also log to application logs
    log_message = f"AUDIT: {action} on {resource_type}"
    if resource_id:
        log_message += f" ({resource_id})"
    if user_id:
        log_message += f" by user {user_id}"
    if status == "failure":
        log_message += f" - FAILED: {error_message}"
        logger.warning(log_message)
    else:
        logger.info(log_message)
    
    return audit_log


# Common audit actions
class AuditActions:
    """Constants for common audit actions."""
    
    # Authentication
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    USER_REGISTERED = "user_registered"
    PASSWORD_CHANGED = "password_changed"
    PASSWORD_RESET = "password_reset"
    ACCOUNT_LOCKED = "account_locked"
    
    # User management
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_DELETED = "user_deleted"
    USER_STATUS_CHANGED = "user_status_changed"
    TEACHER_CREATED = "teacher_created"
    
    # Content management
    CONTENT_CREATED = "content_created"
    CONTENT_UPDATED = "content_updated"
    CONTENT_DELETED = "content_deleted"
    CONTENT_APPROVED = "content_approved"
    CONTENT_REJECTED = "content_rejected"
    
    # Subject management
    SUBJECT_CREATED = "subject_created"
    SUBJECT_UPDATED = "subject_updated"
    SUBJECT_DELETED = "subject_deleted"
    SUBJECT_ASSIGNED = "subject_assigned"
    SUBJECT_REMOVED = "subject_removed"
    
    # System
    SETTINGS_CHANGED = "settings_changed"
    DATA_EXPORTED = "data_exported"
    BACKUP_CREATED = "backup_created"
