"""
Logging Configuration
Sets up application-wide logging
"""

import logging
import os
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
from datetime import datetime

from app.core.config import settings


def setup_logging():
    """Configure application logging."""
    
    # Create logs directory if it doesn't exist
    log_dir = os.path.dirname(settings.LOG_FILE)
    if log_dir and not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    # Create formatter
    formatter = logging.Formatter(settings.LOG_FORMAT)
    
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))
    
    # Clear existing handlers
    root_logger.handlers = []
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # File handler with rotation
    if settings.LOG_FILE:
        file_handler = RotatingFileHandler(
            settings.LOG_FILE,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5,
            encoding="utf-8"
        )
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)
    
    # Security audit log (separate file)
    audit_log_file = os.path.join(log_dir, "audit.log") if log_dir else "audit.log"
    audit_handler = TimedRotatingFileHandler(
        audit_log_file,
        when="midnight",
        interval=1,
        backupCount=30,
        encoding="utf-8"
    )
    audit_handler.setLevel(logging.INFO)
    audit_formatter = logging.Formatter(
        "%(asctime)s - AUDIT - %(message)s"
    )
    audit_handler.setFormatter(audit_formatter)
    
    # Create audit logger
    audit_logger = logging.getLogger("audit")
    audit_logger.addHandler(audit_handler)
    audit_logger.setLevel(logging.INFO)
    
    # Suppress noisy loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if settings.DEBUG else logging.WARNING
    )
    
    logging.info("Logging configured successfully")


class AuditLogger:
    """Specialized logger for audit events."""
    
    def __init__(self):
        self.logger = logging.getLogger("audit")
    
    def log(self, action: str, user_id: str = None, details: str = None):
        """Log an audit event."""
        message = f"ACTION={action}"
        if user_id:
            message += f" USER={user_id}"
        if details:
            message += f" DETAILS={details}"
        self.logger.info(message)


# Global audit logger instance
audit_logger = AuditLogger()
