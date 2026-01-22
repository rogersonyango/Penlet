"""
Database Models
SQLAlchemy ORM models for Penlet application
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey,
    Enum, Float, JSON, LargeBinary, UniqueConstraint, Index, Table
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
import enum

from app.core.database import Base


# ==================== ENUMS ====================

class UserRole(str, enum.Enum):
    """User role enumeration."""
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"


class StudentClass(str, enum.Enum):
    """Student class/grade levels."""
    SENIOR_1 = "S1"
    SENIOR_2 = "S2"
    SENIOR_3 = "S3"
    SENIOR_4 = "S4"
    SENIOR_5 = "S5"
    SENIOR_6 = "S6"


class ContentType(str, enum.Enum):
    """Type of educational content."""
    NOTE = "note"
    VIDEO = "video"
    ASSIGNMENT = "assignment"


class AssignmentStatus(str, enum.Enum):
    """Assignment submission status."""
    PENDING = "pending"
    SUBMITTED = "submitted"
    GRADED = "graded"
    LATE = "late"
    RETURNED = "returned"


class ContentStatus(str, enum.Enum):
    """Content approval status."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


# ==================== ASSOCIATION TABLES ====================

# Student-Subject enrollment
student_subjects = Table(
    "student_subjects",
    Base.metadata,
    Column("student_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("subject_id", UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True),
    Column("enrolled_at", DateTime, default=datetime.utcnow),
)

# Teacher-Subject assignment
teacher_subjects = Table(
    "teacher_subjects",
    Base.metadata,
    Column("teacher_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("subject_id", UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True),
    Column("assigned_at", DateTime, default=datetime.utcnow),
)

# Teacher-Class assignment
teacher_classes = Table(
    "teacher_classes",
    Base.metadata,
    Column("teacher_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("class_level", Enum(StudentClass), primary_key=True),
    Column("assigned_at", DateTime, default=datetime.utcnow),
)


# ==================== USER MODEL ====================

class User(Base):
    """User model for all roles (students, teachers, admins)."""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    
    # Profile information
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    profile_picture = Column(String(500), nullable=True)
    
    # Role and classification
    role = Column(Enum(UserRole), nullable=False, default=UserRole.STUDENT)
    student_class = Column(Enum(StudentClass), nullable=True)  # For students only
    
    # Account status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_locked = Column(Boolean, default=False)
    
    # Security fields
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)
    password_changed_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    subjects = relationship("Subject", secondary=student_subjects, back_populates="students")
    teaching_subjects = relationship("Subject", secondary=teacher_subjects, back_populates="teachers")
    uploaded_content = relationship("Content", back_populates="uploader", foreign_keys="Content.uploaded_by")
    submissions = relationship("Submission", back_populates="student", foreign_keys="Submission.student_id")
    graded_submissions = relationship("Submission", foreign_keys="Submission.graded_by")
    flashcards = relationship("Flashcard", back_populates="creator")
    timetable_entries = relationship("TimetableEntry", back_populates="user")
    alarms = relationship("Alarm", back_populates="user")
    game_scores = relationship("GameScore", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")
    
    # Indexes
    __table_args__ = (
        Index("idx_user_role", "role"),
        Index("idx_user_class", "student_class"),
        Index("idx_user_active", "is_active"),
    )
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


# ==================== SUBJECT MODEL ====================

class Subject(Base):
    """Subject/Course model."""
    __tablename__ = "subjects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    code = Column(String(20), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    icon = Column(String(100), nullable=True)  # Icon class or emoji
    color = Column(String(7), nullable=True)  # Hex color code
    
    # Classification
    class_levels = Column(JSONB, default=list)  # List of StudentClass values
    is_compulsory = Column(Boolean, default=False)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    students = relationship("User", secondary=student_subjects, back_populates="subjects")
    teachers = relationship("User", secondary=teacher_subjects, back_populates="teaching_subjects")
    content = relationship("Content", back_populates="subject")
    flashcards = relationship("Flashcard", back_populates="subject")
    
    __table_args__ = (
        Index("idx_subject_code", "code"),
        Index("idx_subject_active", "is_active"),
    )


# ==================== CONTENT MODEL ====================

class Content(Base):
    """Educational content model (notes, videos, assignments)."""
    __tablename__ = "content"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    content_type = Column(Enum(ContentType), nullable=False)
    
    # Content details
    file_url = Column(String(500), nullable=True)  # For notes/videos
    thumbnail_url = Column(String(500), nullable=True)  # For video thumbnails
    file_size = Column(Integer, nullable=True)  # In bytes
    mime_type = Column(String(100), nullable=True)
    duration = Column(Integer, nullable=True)  # For videos, in seconds
    
    # Assignment specific
    instructions = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=True)
    max_score = Column(Float, nullable=True)
    allow_late_submission = Column(Boolean, default=False)
    
    # Classification
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    target_classes = Column(JSONB, default=list)  # List of StudentClass values
    
    # Approval workflow
    status = Column(Enum(ContentStatus), default=ContentStatus.PENDING)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Metadata
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    view_count = Column(Integer, default=0)
    download_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    subject = relationship("Subject", back_populates="content")
    uploader = relationship("User", back_populates="uploaded_content", foreign_keys=[uploaded_by])
    approver = relationship("User", foreign_keys=[approved_by])
    submissions = relationship("Submission", back_populates="assignment")
    
    __table_args__ = (
        Index("idx_content_type", "content_type"),
        Index("idx_content_subject", "subject_id"),
        Index("idx_content_status", "status"),
        Index("idx_content_uploader", "uploaded_by"),
    )


# ==================== SUBMISSION MODEL ====================

class Submission(Base):
    """Assignment submission model."""
    __tablename__ = "submissions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign keys
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("content.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Submission content
    content = Column(Text, nullable=True)  # Rich text content
    file_url = Column(String(500), nullable=True)  # Uploaded file
    file_name = Column(String(255), nullable=True)
    
    # Status and grading
    status = Column(Enum(AssignmentStatus), default=AssignmentStatus.PENDING)
    score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    graded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    graded_at = Column(DateTime, nullable=True)
    
    # Timestamps
    submitted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    assignment = relationship("Content", back_populates="submissions")
    student = relationship("User", back_populates="submissions", foreign_keys=[student_id])
    grader = relationship("User", foreign_keys=[graded_by])
    
    __table_args__ = (
        UniqueConstraint("assignment_id", "student_id", name="uq_submission"),
        Index("idx_submission_assignment", "assignment_id"),
        Index("idx_submission_student", "student_id"),
        Index("idx_submission_status", "status"),
    )


# ==================== FLASHCARD MODEL ====================

class Flashcard(Base):
    """Student-created flashcard model."""
    __tablename__ = "flashcards"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Content
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    
    # Classification
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Learning tracking
    times_reviewed = Column(Integer, default=0)
    times_correct = Column(Integer, default=0)
    last_reviewed = Column(DateTime, nullable=True)
    difficulty_level = Column(Integer, default=1)  # 1-5 scale
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    subject = relationship("Subject", back_populates="flashcards")
    creator = relationship("User", back_populates="flashcards")
    
    __table_args__ = (
        Index("idx_flashcard_creator", "creator_id"),
        Index("idx_flashcard_subject", "subject_id"),
    )


# ==================== TIMETABLE MODEL ====================

class TimetableEntry(Base):
    """Personal timetable entry model."""
    __tablename__ = "timetable_entries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Entry details
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    
    title = Column(String(200), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time = Column(String(5), nullable=False)  # HH:MM format
    end_time = Column(String(5), nullable=False)
    location = Column(String(200), nullable=True)
    color = Column(String(7), nullable=True)  # Hex color
    notes = Column(Text, nullable=True)
    
    # Recurrence
    is_recurring = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="timetable_entries")
    subject = relationship("Subject")
    
    __table_args__ = (
        Index("idx_timetable_user", "user_id"),
        Index("idx_timetable_day", "day_of_week"),
    )


# ==================== ALARM MODEL ====================

class Alarm(Base):
    """Personal alarm/reminder model."""
    __tablename__ = "alarms"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    alarm_time = Column(DateTime, nullable=False)
    
    # Recurrence
    is_recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(String(50), nullable=True)  # daily, weekly, etc.
    
    # Status
    is_active = Column(Boolean, default=True)
    is_snoozed = Column(Boolean, default=False)
    snooze_until = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="alarms")
    
    __table_args__ = (
        Index("idx_alarm_user", "user_id"),
        Index("idx_alarm_time", "alarm_time"),
    )


# ==================== GAME SCORE MODEL ====================

class GameScore(Base):
    """Game score and progress tracking model."""
    __tablename__ = "game_scores"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    game_type = Column(String(50), nullable=False)  # memory_match, word_scramble, etc.
    score = Column(Integer, nullable=False)
    level = Column(Integer, default=1)
    time_taken = Column(Integer, nullable=True)  # In seconds
    accuracy = Column(Float, nullable=True)  # Percentage
    
    # Subject association (for subject-specific games)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    
    # Metadata
    game_data = Column(JSONB, nullable=True)  # Additional game-specific data
    
    # Timestamps
    played_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="game_scores")
    subject = relationship("Subject")
    
    __table_args__ = (
        Index("idx_game_user", "user_id"),
        Index("idx_game_type", "game_type"),
        Index("idx_game_score", "score"),
    )


# ==================== NOTIFICATION MODEL ====================

class NotificationType(str, enum.Enum):
    ASSIGNMENT_NEW = "assignment_new"
    ASSIGNMENT_DUE = "assignment_due"
    ASSIGNMENT_GRADED = "assignment_graded"
    CONTENT_NEW = "content_new"
    ALARM = "alarm"
    SYSTEM = "system"
    WELCOME = "welcome"

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    link = Column(String(500), nullable=True)
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", backref="user_notifications")


# ==================== AUDIT LOG MODEL ====================

class AuditLog(Base):
    """Audit log for admin actions and important events."""
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(100), nullable=True)
    
    # Details
    details = Column(JSONB, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Status
    status = Column(String(20), default="success")  # success, failure
    error_message = Column(Text, nullable=True)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    
    __table_args__ = (
        Index("idx_audit_user", "user_id"),
        Index("idx_audit_action", "action"),
        Index("idx_audit_created", "created_at"),
    )


# ==================== CHAT MESSAGE MODEL ====================

class ChatMessage(Base):
    """AI Chatbot conversation history."""
    __tablename__ = "chat_messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(String(100), nullable=False)
    
    role = Column(String(20), nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_chat_user", "user_id"),
        Index("idx_chat_session", "session_id"),
    )


# ==================== SYSTEM SETTINGS MODEL ====================

class SystemSetting(Base):
    """System-wide settings."""
    __tablename__ = "system_settings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    key = Column(String(100), unique=True, nullable=False)
    value = Column(JSONB, nullable=False)
    description = Column(Text, nullable=True)
    
    # Timestamps
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

# ==================== EMAIL VERIFICATION TOKEN MODEL ====================

class EmailVerificationToken(Base):
    """Email verification tokens for user registration."""
    __tablename__ = "email_verification_tokens"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    user = relationship("User", backref="verification_tokens")


class PasswordResetToken(Base):
    """Password reset tokens."""
    __tablename__ = "password_reset_tokens"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    user = relationship("User", backref="reset_tokens")