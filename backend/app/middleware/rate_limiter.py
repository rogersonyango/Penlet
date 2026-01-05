"""
Rate Limiting Middleware
Implements sliding window rate limiting with Redis or in-memory fallback
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from typing import Dict, Tuple
from datetime import datetime, timezone
import time
import asyncio
from collections import defaultdict
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class InMemoryRateLimiter:
    """
    In-memory rate limiter using sliding window algorithm.
    Falls back to this when Redis is unavailable.
    """
    
    def __init__(self):
        self.requests: Dict[str, list] = defaultdict(list)
        self._lock = asyncio.Lock()
        self._cleanup_task = None
    
    async def is_rate_limited(
        self,
        key: str,
        limit: int = settings.RATE_LIMIT_REQUESTS,
        window: int = settings.RATE_LIMIT_WINDOW_SECONDS
    ) -> Tuple[bool, int, int]:
        """
        Check if request should be rate limited.
        Returns: (is_limited, remaining, reset_time)
        """
        async with self._lock:
            now = time.time()
            window_start = now - window
            
            # Clean old requests
            self.requests[key] = [
                req_time for req_time in self.requests[key]
                if req_time > window_start
            ]
            
            current_count = len(self.requests[key])
            
            if current_count >= limit:
                # Calculate reset time
                oldest_request = min(self.requests[key]) if self.requests[key] else now
                reset_time = int(oldest_request + window - now)
                return True, 0, reset_time
            
            # Add current request
            self.requests[key].append(now)
            remaining = limit - current_count - 1
            reset_time = window
            
            return False, remaining, reset_time
    
    async def cleanup(self):
        """Periodic cleanup of old entries."""
        while True:
            await asyncio.sleep(60)  # Run every minute
            async with self._lock:
                now = time.time()
                window = settings.RATE_LIMIT_WINDOW_SECONDS
                
                keys_to_remove = []
                for key, timestamps in self.requests.items():
                    # Remove old timestamps
                    self.requests[key] = [
                        t for t in timestamps
                        if t > now - window
                    ]
                    # Mark empty keys for removal
                    if not self.requests[key]:
                        keys_to_remove.append(key)
                
                for key in keys_to_remove:
                    del self.requests[key]


# Global rate limiter instance
rate_limiter = InMemoryRateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware that limits requests per IP/user.
    """
    
    # Endpoints exempt from rate limiting
    EXEMPT_PATHS = {
        "/health",
        "/",
        "/api/v1/docs",
        "/api/v1/redoc",
        "/api/v1/openapi.json",
    }
    
    # Endpoints with stricter limits
    STRICT_PATHS = {
        "/api/v1/auth/login": (5, 60),      # 5 requests per minute
        "/api/v1/auth/register": (3, 60),    # 3 requests per minute
        "/api/v1/auth/password-reset": (3, 300),  # 3 per 5 minutes
    }
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Process request with rate limiting."""
        
        # Skip rate limiting for exempt paths
        if request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)
        
        # Skip OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # Get client identifier (IP address or user ID from token)
        client_id = self._get_client_identifier(request)
        
        # Determine rate limit for this path
        limit, window = self._get_rate_limit(request.url.path)
        
        # Create unique key for this client + path combination
        rate_key = f"rate_limit:{client_id}:{request.url.path}"
        
        # Check rate limit
        is_limited, remaining, reset_time = await rate_limiter.is_rate_limited(
            rate_key, limit, window
        )
        
        if is_limited:
            logger.warning(f"Rate limit exceeded for {client_id} on {request.url.path}")
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests. Please try again later.",
                    "retry_after": reset_time,
                },
                headers={
                    "Retry-After": str(reset_time),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + reset_time),
                }
            )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers to response
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + reset_time)
        
        return response
    
    def _get_client_identifier(self, request: Request) -> str:
        """
        Get unique identifier for the client.
        Prefers user ID from auth token, falls back to IP address.
        """
        # Try to get user ID from request state (set by auth middleware)
        user_id = getattr(request.state, "user_id", None)
        if user_id:
            return f"user:{user_id}"
        
        # Fall back to IP address
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # Take the first IP in the chain (client IP)
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"
        
        return f"ip:{client_ip}"
    
    def _get_rate_limit(self, path: str) -> Tuple[int, int]:
        """
        Get rate limit for a specific path.
        Returns (limit, window_seconds)
        """
        # Check for strict path limits
        for strict_path, limits in self.STRICT_PATHS.items():
            if path.startswith(strict_path):
                return limits
        
        # Return default limits
        return settings.RATE_LIMIT_REQUESTS, settings.RATE_LIMIT_WINDOW_SECONDS
