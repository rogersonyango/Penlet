"""
Security Utilities
Password hashing, JWT token management, and security helpers
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from passlib.hash import argon2
import secrets
import re
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# Password hashing context using Argon2
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__memory_cost=65536,
    argon2__time_cost=3,
    argon2__parallelism=4,
)


class PasswordValidator:
    """Password validation with configurable rules."""
    
    @staticmethod
    def validate(password: str) -> tuple[bool, list[str]]:
        """
        Validate password against security requirements.
        Returns (is_valid, list_of_errors)
        """
        errors = []
        
        if len(password) < settings.MIN_PASSWORD_LENGTH:
            errors.append(f"Password must be at least {settings.MIN_PASSWORD_LENGTH} characters")
        
        if settings.REQUIRE_UPPERCASE and not re.search(r"[A-Z]", password):
            errors.append("Password must contain at least one uppercase letter")
        
        if settings.REQUIRE_LOWERCASE and not re.search(r"[a-z]", password):
            errors.append("Password must contain at least one lowercase letter")
        
        if settings.REQUIRE_DIGIT and not re.search(r"\d", password):
            errors.append("Password must contain at least one digit")
        
        if settings.REQUIRE_SPECIAL and not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            errors.append("Password must contain at least one special character")
        
        # Check for common weak patterns
        weak_patterns = [
            r"(.)\1{2,}",  # Three or more repeated characters
            r"(012|123|234|345|456|567|678|789)",  # Sequential numbers
            r"(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)",  # Sequential letters
        ]
        
        for pattern in weak_patterns:
            if re.search(pattern, password.lower()):
                errors.append("Password contains weak patterns")
                break
        
        return len(errors) == 0, errors


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


def get_password_hash(password: str) -> str:
    """Generate password hash using Argon2."""
    return pwd_context.hash(password)


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access",
        "jti": secrets.token_urlsafe(16),  # JWT ID for token revocation
    })
    
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create JWT refresh token."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh",
        "jti": secrets.token_urlsafe(16),
    })
    
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError as e:
        logger.warning(f"JWT decode error: {e}")
        return None


def create_password_reset_token(email: str) -> str:
    """Create password reset token (expires in 1 hour)."""
    expire = datetime.utcnow() + timedelta(hours=1)
    return jwt.encode(
        {
            "sub": email,
            "exp": expire,
            "type": "password_reset",
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def verify_password_reset_token(token: str) -> Optional[str]:
    """Verify password reset token and return email."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        if payload.get("type") != "password_reset":
            return None
        return payload.get("sub")
    except JWTError:
        return None


def generate_verification_code(length: int = 6) -> str:
    """Generate numeric verification code."""
    return "".join(secrets.choice("0123456789") for _ in range(length))


def sanitize_input(input_str: str) -> str:
    """
    Sanitize user input to prevent XSS and injection attacks.
    """
    if not input_str:
        return ""
    
    # Remove null bytes
    sanitized = input_str.replace("\x00", "")
    
    # Escape HTML special characters
    html_escape = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
    }
    
    for char, escape in html_escape.items():
        sanitized = sanitized.replace(char, escape)
    
    return sanitized.strip()
