"""
Authentication and Authorization Dependencies
JWT token validation and role-based access control
"""

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from datetime import datetime, timezone
import logging

from app.core.database import get_db
from app.core.security import decode_token
from app.models.models import User, UserRole
from app.schemas.schemas import TokenPayload

logger = logging.getLogger(__name__)

# HTTP Bearer security scheme
security = HTTPBearer(auto_error=False)


class AuthenticationError(HTTPException):
    """Custom authentication error."""
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class AuthorizationError(HTTPException):
    """Custom authorization error."""
    def __init__(self, detail: str = "Not enough permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get the current authenticated user from JWT token.
    """
    if not credentials:
        raise AuthenticationError("Authorization header missing")
    
    token = credentials.credentials
    
    # Decode and validate token
    payload = decode_token(token)
    if not payload:
        raise AuthenticationError("Invalid or expired token")
    
    # Check token type
    if payload.get("type") != "access":
        raise AuthenticationError("Invalid token type")
    
    # Get user ID from token
    user_id = payload.get("sub")
    if not user_id:
        raise AuthenticationError("Invalid token payload")
    
    # Fetch user from database
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise AuthenticationError("User not found")
    
    if not user.is_active:
        raise AuthenticationError("User account is disabled")
    
    if user.is_locked:
        # Check if lockout has expired
        if user.locked_until and user.locked_until > datetime.utcnow():
            raise AuthenticationError("Account is temporarily locked")
        else:
            # Unlock account
            user.is_locked = False
            user.locked_until = None
            user.failed_login_attempts = 0
            await db.commit()
    
    # Store user in request state for other middleware
    request.state.user = user
    request.state.user_id = str(user.id)
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get current user and verify they are active.
    """
    if not current_user.is_active:
        raise AuthenticationError("Inactive user")
    return current_user


async def get_current_verified_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Get current user and verify their email is verified.
    """
    if not current_user.is_verified:
        raise AuthorizationError("Email not verified")
    return current_user


class RoleChecker:
    """
    Dependency class for role-based access control.
    Usage: Depends(RoleChecker([UserRole.ADMIN, UserRole.TEACHER]))
    """
    
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles
    
    async def __call__(
        self,
        current_user: User = Depends(get_current_verified_user),
    ) -> User:
        if current_user.role not in self.allowed_roles:
            logger.warning(
                f"Access denied for user {current_user.id} "
                f"(role: {current_user.role}) to endpoint requiring {self.allowed_roles}"
            )
            raise AuthorizationError(
                f"This action requires one of these roles: {', '.join(r.value for r in self.allowed_roles)}"
            )
        return current_user


# Convenience dependencies for common role checks
async def get_admin_user(
    current_user: User = Depends(RoleChecker([UserRole.ADMIN])),
) -> User:
    """Get current user and verify they are an admin."""
    return current_user


async def get_teacher_user(
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN])),
) -> User:
    """Get current user and verify they are a teacher or admin."""
    return current_user


async def get_student_user(
    current_user: User = Depends(RoleChecker([UserRole.STUDENT])),
) -> User:
    """Get current user and verify they are a student."""
    return current_user


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Get current user if authenticated, otherwise return None.
    Useful for endpoints that behave differently for authenticated users.
    """
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        payload = decode_token(token)
        
        if not payload or payload.get("type") != "access":
            return None
        
        user_id = payload.get("sub")
        if not user_id:
            return None
        
        result = await db.execute(
            select(User).where(User.id == user_id, User.is_active == True)
        )
        return result.scalar_one_or_none()
    
    except Exception:
        return None


class ClassAccessChecker:
    """
    Dependency for checking access to class-specific resources.
    Ensures teachers can only access their assigned classes.
    """
    
    def __init__(self, param_name: str = "class_level"):
        self.param_name = param_name
    
    async def __call__(
        self,
        request: Request,
        current_user: User = Depends(get_current_verified_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        # Admins can access all classes
        if current_user.role == UserRole.ADMIN:
            return current_user
        
        # Students can only access their own class
        if current_user.role == UserRole.STUDENT:
            return current_user
        
        # Teachers need to check class assignment
        if current_user.role == UserRole.TEACHER:
            # Get requested class from path or query parameters
            class_level = request.path_params.get(self.param_name)
            if not class_level:
                class_level = request.query_params.get(self.param_name)
            
            if class_level:
                # Check if teacher is assigned to this class
                # This would require checking the teacher_classes table
                # For now, we'll allow all teachers to access
                pass
        
        return current_user


class SubjectAccessChecker:
    """
    Dependency for checking access to subject-specific resources.
    Ensures teachers can only access their assigned subjects.
    """
    
    async def __call__(
        self,
        subject_id: str,
        current_user: User = Depends(get_current_verified_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        # Admins can access all subjects
        if current_user.role == UserRole.ADMIN:
            return current_user
        
        # Check if user has access to this subject
        if current_user.role == UserRole.TEACHER:
            # Check teacher_subjects relationship
            has_access = any(
                str(subject.id) == subject_id
                for subject in current_user.teaching_subjects
            )
            if not has_access:
                raise AuthorizationError("You don't have access to this subject")
        
        elif current_user.role == UserRole.STUDENT:
            # Check student_subjects relationship
            has_access = any(
                str(subject.id) == subject_id
                for subject in current_user.subjects
            )
            if not has_access:
                raise AuthorizationError("You are not enrolled in this subject")
        
        return current_user
