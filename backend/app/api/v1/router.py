"""
API V1 Router
Combines all endpoint routers
"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    users,
    subjects,
    content,
    submissions,
    flashcards,
    timetable,
    alarms,
    games,
    notifications,
    analytics,
    chat,
    admin,
    files,
)

api_router = APIRouter()

# Authentication routes
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"]
)

# User management routes
api_router.include_router(
    users.router,
    prefix="/users",
    tags=["Users"]
)

# Subject routes
api_router.include_router(
    subjects.router,
    prefix="/subjects",
    tags=["Subjects"]
)

# Content routes (notes, videos, assignments)
api_router.include_router(
    content.router,
    prefix="/content",
    tags=["Content"]
)

# Submission routes
api_router.include_router(
    submissions.router,
    prefix="/submissions",
    tags=["Submissions"]
)

# Flashcard routes
api_router.include_router(
    flashcards.router,
    prefix="/flashcards",
    tags=["Flashcards"]
)

# Timetable routes
api_router.include_router(
    timetable.router,
    prefix="/timetable",
    tags=["Timetable"]
)

# Alarm routes
api_router.include_router(
    alarms.router,
    prefix="/alarms",
    tags=["Alarms"]
)

# Game routes
api_router.include_router(
    games.router,
    prefix="/games",
    tags=["Games"]
)

# Notification routes
api_router.include_router(
    notifications.router,
    prefix="/notifications",
    tags=["Notifications"]
)

# Analytics routes
api_router.include_router(
    analytics.router,
    prefix="/analytics",
    tags=["Analytics"]
)

# AI Chat routes
api_router.include_router(
    chat.router,
    prefix="/chat",
    tags=["Chat"]
)

# Admin routes
api_router.include_router(
    admin.router,
    prefix="/admin",
    tags=["Admin"]
)

# File upload routes
api_router.include_router(
    files.router,
    prefix="/files",
    tags=["Files"]
)
