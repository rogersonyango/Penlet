"""
Authentication Endpoints
Login, register, token refresh, password reset, email verification
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, update
from datetime import datetime, timedelta, timezone
import logging
import secrets

from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    create_password_reset_token,
    verify_password_reset_token,
    PasswordValidator,
)
from app.core.config import settings
from app.models.models import User, UserRole, AuditLog, EmailVerificationToken, PasswordResetToken
from app.schemas.schemas import (
    UserCreate,
    UserResponse,
    Token,
    LoginRequest,
    RefreshTokenRequest,
    PasswordResetRequest,
    PasswordReset,
)
from app.api.deps import get_current_user, get_current_active_user
from app.services.audit_service import log_audit_event
from app.services.email_service import email_service

router = APIRouter()
logger = logging.getLogger(__name__)


def generate_verification_token() -> str:
    """Generate a secure random token."""
    return secrets.token_urlsafe(32)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: Request,
    user_data: UserCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new user account.
    Students can self-register; teachers must be added by admin.
    Sends verification email after registration.
    """
    if user_data.role == UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teachers must be added by an administrator"
        )
    
    if user_data.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin accounts cannot be created through registration"
        )
    
    is_valid, errors = PasswordValidator.validate(user_data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"password_errors": errors}
        )
    
    result = await db.execute(
        select(User).where(
            or_(
                User.email == user_data.email.lower(),
                User.username == user_data.username.lower()
            )
        )
    )
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        if existing_user.email == user_data.email.lower():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")
    
    if user_data.role == UserRole.STUDENT and not user_data.student_class:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Students must specify their class level")
    
    new_user = User(
        email=user_data.email.lower(),
        username=user_data.username.lower(),
        hashed_password=get_password_hash(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        role=user_data.role,
        student_class=user_data.student_class,
        is_verified=False,  # User must verify email
    )
    
    db.add(new_user)
    await db.flush()  # Get the user ID
    
    # Generate verification token
    token = generate_verification_token()
    verification_token = EmailVerificationToken(
        user_id=new_user.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )
    db.add(verification_token)
    await db.commit()
    await db.refresh(new_user)
    
    # Send verification email in background
    background_tasks.add_task(
        email_service.send_verification_email,
        to_email=new_user.email,
        first_name=new_user.first_name,
        token=token
    )
    
    # Log audit event
    try:
        await log_audit_event(
            db=db, action="user_registered", resource_type="user", resource_id=str(new_user.id),
            user_id=new_user.id, ip_address=request.client.host if request.client else None,
            details={"role": user_data.role.value}
        )
        await db.commit()
    except Exception as e:
        logger.warning(f"Failed to log audit event: {e}")
    
    logger.info(f"New user registered: {new_user.username} ({new_user.role.value})")
    return new_user


@router.post("/verify-email")
async def verify_email(
    token: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Verify user's email address using the token from email."""
    # Find the token
    result = await db.execute(
        select(EmailVerificationToken)
        .where(EmailVerificationToken.token == token)
        .where(EmailVerificationToken.used_at == None)
        .where(EmailVerificationToken.expires_at > datetime.utcnow())
    )
    verification_token = result.scalar_one_or_none()
    
    if not verification_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    # Get the user
    result = await db.execute(select(User).where(User.id == verification_token.user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if user.is_verified:
        return {"message": "Email already verified", "already_verified": True}
    
    # Mark user as verified
    user.is_verified = True
    verification_token.used_at = datetime.utcnow()
    await db.commit()
    
    # Send welcome email in background
    background_tasks.add_task(
        email_service.send_welcome_email,
        to_email=user.email,
        first_name=user.first_name,
        role=user.role.value
    )
    
    logger.info(f"User email verified: {user.email}")
    
    return {"message": "Email verified successfully", "already_verified": False}


@router.post("/resend-verification")
async def resend_verification_email(
    email: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Resend verification email to user."""
    result = await db.execute(select(User).where(User.email == email.lower()))
    user = result.scalar_one_or_none()
    
    # Always return same message to prevent email enumeration
    if not user:
        return {"message": "If the email exists and is unverified, a verification link has been sent"}
    
    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )
    
    # Invalidate old tokens by marking them as used
    await db.execute(
        update(EmailVerificationToken)
        .where(EmailVerificationToken.user_id == user.id)
        .where(EmailVerificationToken.used_at == None)
        .values(used_at=datetime.utcnow())
    )
    
    # Generate new token
    token = generate_verification_token()
    verification_token = EmailVerificationToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )
    db.add(verification_token)
    await db.commit()
    
    # Send verification email in background
    background_tasks.add_task(
        email_service.send_verification_email,
        to_email=user.email,
        first_name=user.first_name,
        token=token
    )
    
    logger.info(f"Verification email resent to: {user.email}")
    
    return {"message": "If the email exists and is unverified, a verification link has been sent"}


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate user and return JWT tokens."""
    result = await db.execute(
        select(User).where(
            or_(User.username == login_data.username.lower(), User.email == login_data.username.lower())
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    
    if user.is_locked:
        if user.locked_until and user.locked_until > datetime.utcnow():
            remaining = (user.locked_until - datetime.utcnow()).seconds // 60
            raise HTTPException(status_code=status.HTTP_423_LOCKED, detail=f"Account locked. Try again in {remaining} minutes.")
        else:
            user.is_locked = False
            user.locked_until = None
            user.failed_login_attempts = 0
    
    if not verify_password(login_data.password, user.hashed_password):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
            user.is_locked = True
            user.locked_until = datetime.utcnow() + timedelta(minutes=settings.LOCKOUT_DURATION_MINUTES)
            await db.commit()
            await log_audit_event(db=db, action="account_locked", resource_type="user", resource_id=str(user.id),
                user_id=user.id, ip_address=request.client.host if request.client else None,
                status="failure", details={"reason": "max_failed_attempts"})
            raise HTTPException(status_code=status.HTTP_423_LOCKED, 
                detail=f"Account locked. Try again in {settings.LOCKOUT_DURATION_MINUTES} minutes.")
        await db.commit()
        remaining_attempts = settings.MAX_LOGIN_ATTEMPTS - user.failed_login_attempts
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Incorrect username or password. {remaining_attempts} attempts remaining.")
    
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
    
    # Check if email is verified
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in. Check your inbox for the verification link."
        )
    
    user.failed_login_attempts = 0
    user.is_locked = False
    user.locked_until = None
    user.last_login = datetime.utcnow()
    await db.commit()
    
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    await log_audit_event(db=db, action="user_login", resource_type="user", resource_id=str(user.id),
        user_id=user.id, ip_address=request.client.host if request.client else None)
    
    logger.info(f"User logged in: {user.username}")
    return Token(access_token=access_token, refresh_token=refresh_token, token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)


@router.post("/refresh", response_model=Token)
async def refresh_token(refresh_data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Refresh access token using refresh token."""
    payload = decode_token(refresh_data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    
    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return Token(access_token=access_token, refresh_token=new_refresh_token, token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)


@router.post("/logout")
async def logout(request: Request, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Logout user."""
    await log_audit_event(db=db, action="user_logout", resource_type="user", resource_id=str(current_user.id),
        user_id=current_user.id, ip_address=request.client.host if request.client else None)
    return {"message": "Successfully logged out"}


@router.post("/forgot-password")
async def forgot_password(
    email: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Request password reset email."""
    result = await db.execute(select(User).where(User.email == email.lower()))
    user = result.scalar_one_or_none()
    
    # Always return same message to prevent email enumeration
    if not user:
        return {"message": "If an account exists with this email, a password reset link has been sent"}
    
    # Invalidate old tokens
    await db.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.user_id == user.id)
        .where(PasswordResetToken.used_at == None)
        .values(used_at=datetime.utcnow())
    )
    
    # Generate reset token
    token = generate_verification_token()
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(hours=1)
    )
    db.add(reset_token)
    await db.commit()
    
    # Send password reset email in background
    background_tasks.add_task(
        email_service.send_password_reset_email,
        to_email=user.email,
        first_name=user.first_name,
        token=token
    )
    
    logger.info(f"Password reset requested for: {user.email}")
    
    return {"message": "If an account exists with this email, a password reset link has been sent"}


@router.post("/reset-password")
async def reset_password(
    token: str,
    new_password: str,
    db: AsyncSession = Depends(get_db),
):
    """Reset password using token from email."""
    # Validate password strength
    is_valid, errors = PasswordValidator.validate(new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"password_errors": errors}
        )
    
    # Find the token
    result = await db.execute(
        select(PasswordResetToken)
        .where(PasswordResetToken.token == token)
        .where(PasswordResetToken.used_at == None)
        .where(PasswordResetToken.expires_at > datetime.utcnow())
    )
    reset_token = result.scalar_one_or_none()
    
    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Get the user
    result = await db.execute(select(User).where(User.id == reset_token.user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # Update password
    user.hashed_password = get_password_hash(new_password)
    user.password_changed_at = datetime.utcnow()
    user.failed_login_attempts = 0
    user.is_locked = False
    user.locked_until = None
    reset_token.used_at = datetime.utcnow()
    
    await db.commit()
    
    logger.info(f"Password reset completed for: {user.email}")
    
    return {"message": "Password reset successfully"}


# Keep old endpoints for backwards compatibility
@router.post("/password-reset-request")
async def request_password_reset(
    reset_request: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Request password reset email (legacy endpoint)."""
    return await forgot_password(reset_request.email, background_tasks, db)


@router.post("/password-reset")
async def password_reset_legacy(reset_data: PasswordReset, db: AsyncSession = Depends(get_db)):
    """Reset password using reset token (legacy endpoint)."""
    # Use the old token verification method for backwards compatibility
    email = verify_password_reset_token(reset_data.token)
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")
    
    is_valid, errors = PasswordValidator.validate(reset_data.new_password)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"password_errors": errors})
    
    result = await db.execute(select(User).where(User.email == email.lower()))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    user.hashed_password = get_password_hash(reset_data.new_password)
    user.password_changed_at = datetime.utcnow()
    user.failed_login_attempts = 0
    user.is_locked = False
    user.locked_until = None
    await db.commit()
    
    logger.info(f"Password reset completed for: {user.email}")
    return {"message": "Password successfully reset"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current authenticated user's information."""
    return current_user