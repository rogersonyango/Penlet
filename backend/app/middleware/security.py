"""
Security Headers Middleware
Adds essential security headers to all responses
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse
import secrets

from app.core.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware that adds security headers to all responses.
    Implements OWASP recommended security headers.
    """
    
    async def dispatch(self, request: Request, call_next) -> StarletteResponse:
        """Add security headers to response."""
        
        # Generate nonce for CSP
        nonce = secrets.token_urlsafe(16)
        request.state.csp_nonce = nonce
        
        response = await call_next(request)
        
        # Content Security Policy
        csp_directives = [
            "default-src 'self'",
            f"script-src 'self' 'nonce-{nonce}'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https: blob:",
            "connect-src 'self' https://api.openai.com",
            "frame-ancestors 'none'",
            "form-action 'self'",
            "base-uri 'self'",
            "object-src 'none'",
        ]
        
        # Less strict CSP for development (allow Swagger UI CDN)
        if settings.ENVIRONMENT == "development":
            csp_directives = [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
                "font-src 'self' https://fonts.gstatic.com data:",
                "img-src 'self' data: https: blob:",
                "connect-src 'self' http://localhost:* ws://localhost:*",
            ]
        
        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)
        
        # Prevent XSS attacks
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        
        # Enable XSS filter in browsers
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Control referrer information
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions Policy (formerly Feature-Policy)
        response.headers["Permissions-Policy"] = (
            "geolocation=(), "
            "midi=(), "
            "notifications=(self), "
            "push=(self), "
            "sync-xhr=(), "
            "microphone=(), "
            "camera=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "speaker=(self), "
            "vibrate=(), "
            "fullscreen=(self), "
            "payment=()"
        )
        
        # HSTS (only in production with HTTPS)
        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
        
        # Prevent MIME type sniffing
        response.headers["X-Download-Options"] = "noopen"
        
        # Cache control for sensitive endpoints
        if "/api/v1/auth" in str(request.url.path):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        
        return response


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    CSRF Protection Middleware.
    Validates CSRF tokens for state-changing requests.
    """
    
    # Methods that require CSRF protection
    PROTECTED_METHODS = {"POST", "PUT", "DELETE", "PATCH"}
    
    # Paths exempt from CSRF (API endpoints using JWT)
    EXEMPT_PATHS = {
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/api/v1/auth/refresh",
    }
    
    async def dispatch(self, request: Request, call_next) -> StarletteResponse:
        """Validate CSRF token for protected requests."""
        
        # Skip CSRF check for safe methods
        if request.method not in self.PROTECTED_METHODS:
            return await call_next(request)
        
        # Skip CSRF check for API endpoints (they use JWT)
        if request.url.path.startswith("/api/"):
            return await call_next(request)
        
        # Skip exempt paths
        if request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)
        
        # For form submissions, validate CSRF token
        csrf_token_header = request.headers.get("X-CSRF-Token")
        csrf_token_cookie = request.cookies.get("csrf_token")
        
        if not csrf_token_header or not csrf_token_cookie:
            return StarletteResponse(
                content='{"detail": "CSRF token missing"}',
                status_code=403,
                media_type="application/json"
            )
        
        if csrf_token_header != csrf_token_cookie:
            return StarletteResponse(
                content='{"detail": "CSRF token mismatch"}',
                status_code=403,
                media_type="application/json"
            )
        
        return await call_next(request)