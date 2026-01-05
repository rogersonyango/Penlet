"""
Pydantic Schemas for Request/Response Validation
"""

from pydantic import BaseModel, Field, EmailStr, field_validator, ConfigDict
from typing import Optional, List, Any, Dict
from datetime import datetime
from uuid import UUID
import re

from app.models.models import UserRole, StudentClass, ContentType, ContentStatus, AssignmentStatus


# ==================== BASE SCHEMAS ====================

class BaseSchema(BaseModel):
    """Base schema with common configuration."""
    model_config = ConfigDict(from_attributes=True)


class TimestampMixin(BaseModel):
    """Mixin for timestamp fields."""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class PaginationParams(BaseModel):
    """Pagination parameters."""
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)
    
    @property
    def offset(self) -> int:
        return (self.page - 1) * self.per_page


class PaginatedResponse(BaseModel):
    """Generic paginated response."""
    items: List[Any]
    total: int
    page: int
    per_page: int
    pages: int


# ==================== USER SCHEMAS ====================

class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    
    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError("Username can only contain letters, numbers, underscores, and hyphens")
        return v.lower()
    
    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if v and not re.match(r"^\+?[\d\s-]{10,20}$", v):
            raise ValueError("Invalid phone number format")
        return v


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(..., min_length=8)
    role: UserRole = UserRole.STUDENT
    student_class: Optional[StudentClass] = None
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    profile_picture: Optional[str] = None


class UserResponse(UserBase, TimestampMixin, BaseSchema):
    """Schema for user response."""
    id: UUID
    role: UserRole
    student_class: Optional[StudentClass] = None
    is_active: bool
    is_verified: bool
    last_login: Optional[datetime] = None
    profile_picture: Optional[str] = None


class UserBriefResponse(BaseSchema):
    """Brief user info for listings."""
    id: UUID
    username: str
    email: str
    first_name: str
    last_name: str
    role: UserRole
    student_class: Optional[StudentClass] = None
    profile_picture: Optional[str] = None
    is_active: bool = True
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class AdminUserCreate(UserCreate):
    """Schema for admin creating users."""
    is_verified: bool = True
    assigned_subjects: Optional[List[UUID]] = None
    assigned_classes: Optional[List[StudentClass]] = None


class PasswordChange(BaseModel):
    """Schema for password change."""
    current_password: str
    new_password: str = Field(..., min_length=8)
    
    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v


# ==================== AUTH SCHEMAS ====================

class Token(BaseModel):
    """Token response schema."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenPayload(BaseModel):
    """Token payload schema."""
    sub: str
    role: UserRole
    exp: datetime
    type: str


class LoginRequest(BaseModel):
    """Login request schema."""
    username: str
    password: str


class RefreshTokenRequest(BaseModel):
    """Refresh token request."""
    refresh_token: str


class PasswordResetRequest(BaseModel):
    """Password reset request."""
    email: EmailStr


class PasswordReset(BaseModel):
    """Password reset with token."""
    token: str
    new_password: str = Field(..., min_length=8)


# ==================== SUBJECT SCHEMAS ====================

class SubjectBase(BaseModel):
    """Base subject schema."""
    name: str = Field(..., min_length=1, max_length=200)
    code: str = Field(..., min_length=1, max_length=20)
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    class_levels: List[StudentClass] = []
    is_compulsory: bool = False


class SubjectCreate(SubjectBase):
    """Schema for creating a subject."""
    pass


class SubjectUpdate(BaseModel):
    """Schema for updating a subject."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    class_levels: Optional[List[StudentClass]] = None
    is_compulsory: Optional[bool] = None
    is_active: Optional[bool] = None


class SubjectResponse(SubjectBase, TimestampMixin, BaseSchema):
    """Schema for subject response."""
    id: UUID
    is_active: bool
    teacher_count: Optional[int] = 0
    student_count: Optional[int] = 0


class SubjectBriefResponse(BaseSchema):
    """Brief subject info."""
    id: UUID
    name: str
    code: str
    icon: Optional[str] = None
    color: Optional[str] = None


# ==================== CONTENT SCHEMAS ====================

class ContentBase(BaseModel):
    """Base content schema."""
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    content_type: ContentType
    subject_id: UUID
    target_classes: List[StudentClass] = []


class NoteCreate(ContentBase):
    """Schema for creating a note."""
    content_type: ContentType = ContentType.NOTE
    file_url: str


class VideoCreate(ContentBase):
    """Schema for creating a video."""
    content_type: ContentType = ContentType.VIDEO
    file_url: str
    duration: Optional[int] = None


class AssignmentCreate(ContentBase):
    """Schema for creating an assignment."""
    content_type: ContentType = ContentType.ASSIGNMENT
    instructions: str
    due_date: datetime
    max_score: float = Field(..., gt=0)
    allow_late_submission: bool = False
    file_url: Optional[str] = None
    file_size: Optional[int] = None


class ContentUpdate(BaseModel):
    """Schema for updating content."""
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    description: Optional[str] = None
    target_classes: Optional[List[StudentClass]] = None
    instructions: Optional[str] = None
    due_date: Optional[datetime] = None
    max_score: Optional[float] = Field(None, gt=0)
    allow_late_submission: Optional[bool] = None


class ContentResponse(ContentBase, TimestampMixin, BaseSchema):
    """Schema for content response."""
    id: UUID
    file_url: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    duration: Optional[int] = None
    instructions: Optional[str] = None
    due_date: Optional[datetime] = None
    max_score: Optional[float] = None
    allow_late_submission: bool = False
    status: ContentStatus
    uploaded_by: UUID
    uploader: Optional[UserBriefResponse] = None
    subject: Optional[SubjectBriefResponse] = None
    view_count: int = 0
    download_count: int = 0


class ContentApproval(BaseModel):
    """Schema for content approval/rejection."""
    status: ContentStatus
    rejection_reason: Optional[str] = None


# ==================== SUBMISSION SCHEMAS ====================

class SubmissionCreate(BaseModel):
    """Schema for creating a submission."""
    assignment_id: UUID
    content: Optional[str] = None
    file_url: Optional[str] = None


class SubmissionUpdate(BaseModel):
    """Schema for updating a submission."""
    content: Optional[str] = None
    file_url: Optional[str] = None


class SubmissionGrade(BaseModel):
    """Schema for grading a submission."""
    score: float = Field(..., ge=0)
    feedback: Optional[str] = None


class SubmissionResponse(TimestampMixin, BaseSchema):
    """Schema for submission response."""
    id: UUID
    assignment_id: UUID
    student_id: UUID
    content: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    status: AssignmentStatus
    score: Optional[float] = None
    feedback: Optional[str] = None
    submitted_at: Optional[datetime] = None
    graded_at: Optional[datetime] = None
    student: Optional[UserBriefResponse] = None


# ==================== FLASHCARD SCHEMAS ====================

class FlashcardBase(BaseModel):
    """Base flashcard schema."""
    question: str = Field(..., min_length=1, max_length=1000)
    answer: str = Field(..., min_length=1, max_length=2000)
    subject_id: Optional[UUID] = None


class FlashcardCreate(FlashcardBase):
    """Schema for creating a flashcard."""
    pass


class FlashcardUpdate(BaseModel):
    """Schema for updating a flashcard."""
    question: Optional[str] = Field(None, min_length=1, max_length=1000)
    answer: Optional[str] = Field(None, min_length=1, max_length=2000)
    subject_id: Optional[UUID] = None


class FlashcardReview(BaseModel):
    """Schema for recording flashcard review."""
    was_correct: bool


class FlashcardResponse(FlashcardBase, TimestampMixin, BaseSchema):
    """Schema for flashcard response."""
    id: UUID
    creator_id: UUID
    times_reviewed: int = 0
    times_correct: int = 0
    last_reviewed: Optional[datetime] = None
    difficulty_level: int = 1
    subject: Optional[SubjectBriefResponse] = None


# ==================== TIMETABLE SCHEMAS ====================

class TimetableEntryBase(BaseModel):
    """Base timetable entry schema."""
    title: str = Field(..., min_length=1, max_length=200)
    day_of_week: int = Field(..., ge=0, le=6)
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    location: Optional[str] = Field(None, max_length=200)
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    notes: Optional[str] = None
    subject_id: Optional[UUID] = None
    is_recurring: bool = True


class TimetableEntryCreate(TimetableEntryBase):
    """Schema for creating a timetable entry."""
    pass


class TimetableEntryUpdate(BaseModel):
    """Schema for updating a timetable entry."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    start_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    end_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    location: Optional[str] = Field(None, max_length=200)
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    notes: Optional[str] = None
    subject_id: Optional[UUID] = None
    is_recurring: Optional[bool] = None


class TimetableEntryResponse(TimetableEntryBase, TimestampMixin, BaseSchema):
    """Schema for timetable entry response."""
    id: UUID
    user_id: UUID
    subject: Optional[SubjectBriefResponse] = None


# ==================== ALARM SCHEMAS ====================

class AlarmBase(BaseModel):
    """Base alarm schema."""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    alarm_time: datetime
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None


class AlarmCreate(AlarmBase):
    """Schema for creating an alarm."""
    is_active: bool = True


class AlarmUpdate(BaseModel):
    """Schema for updating an alarm."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    alarm_time: Optional[datetime] = None
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[str] = None
    is_active: Optional[bool] = None


class AlarmSnooze(BaseModel):
    """Schema for snoozing an alarm."""
    snooze_minutes: int = Field(default=5, ge=1, le=60)


class AlarmResponse(BaseModel):
    """Schema for alarm response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    user_id: UUID
    title: str
    description: Optional[str] = None
    alarm_time: datetime
    is_recurring: bool
    recurrence_pattern: Optional[str] = None
    is_active: bool
    is_snoozed: bool
    snooze_until: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ==================== GAME SCHEMAS ====================

class GameScoreCreate(BaseModel):
    """Schema for creating a game score."""
    game_type: str = Field(..., min_length=1, max_length=50)
    score: int = Field(..., ge=0)
    level: int = Field(default=1, ge=1)
    time_taken: Optional[int] = Field(None, ge=0)
    accuracy: Optional[float] = Field(None, ge=0, le=100)
    subject_id: Optional[UUID] = None
    game_data: Optional[Dict[str, Any]] = None


class GameScoreResponse(BaseSchema):
    """Schema for game score response."""
    id: UUID
    user_id: UUID
    game_type: str
    score: int
    level: int
    time_taken: Optional[int] = None
    accuracy: Optional[float] = None
    subject_id: Optional[UUID] = None
    game_data: Optional[Dict[str, Any]] = None
    played_at: datetime


class LeaderboardEntry(BaseModel):
    """Schema for leaderboard entry."""
    rank: int
    user: UserBriefResponse
    score: int
    game_type: str


# ==================== NOTIFICATION SCHEMAS ====================

class NotificationCreate(BaseModel):
    """Schema for creating a notification."""
    user_id: UUID
    title: str = Field(..., min_length=1, max_length=200)
    message: str
    notification_type: str
    reference_type: Optional[str] = None
    reference_id: Optional[UUID] = None


class NotificationResponse(BaseSchema):
    """Schema for notification response."""
    id: UUID
    user_id: UUID
    title: str
    message: str
    notification_type: str
    reference_type: Optional[str] = None
    reference_id: Optional[UUID] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime


# ==================== ANALYTICS SCHEMAS ====================

class StudentAnalytics(BaseModel):
    """Schema for student analytics."""
    total_assignments: int
    completed_assignments: int
    pending_assignments: int
    average_score: Optional[float] = None
    games_played: int
    total_game_score: int
    flashcards_created: int
    flashcards_reviewed: int
    study_time_minutes: int


class TeacherAnalytics(BaseModel):
    """Schema for teacher analytics."""
    total_students: int
    subjects_assigned: int
    content_uploaded: int
    pending_submissions: int
    graded_submissions: int
    average_class_score: Optional[float] = None


class AdminAnalytics(BaseModel):
    """Schema for admin analytics."""
    total_users: int
    total_students: int
    total_teachers: int
    total_subjects: int
    total_content: int
    pending_approvals: int
    active_users_today: int
    new_users_this_week: int


# ==================== CHAT SCHEMAS ====================

class ChatMessage(BaseModel):
    """Schema for chat message."""
    role: str
    content: str


class ChatRequest(BaseModel):
    """Schema for chat request."""
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    """Schema for chat response."""
    message: str
    session_id: str


# ==================== FILE UPLOAD SCHEMAS ====================

class FileUploadResponse(BaseModel):
    """Schema for file upload response."""
    file_url: str
    file_name: str
    file_size: int
    mime_type: str


# ==================== AUDIT LOG SCHEMAS ====================

class AuditLogResponse(BaseSchema):
    """Schema for audit log response."""
    id: UUID
    user_id: Optional[UUID] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    user: Optional[UserBriefResponse] = None