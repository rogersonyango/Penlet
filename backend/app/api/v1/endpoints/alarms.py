"""
Alarms Endpoints
Handle student alarms and reminders
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import User, Alarm
from app.api.deps import get_current_active_user

router = APIRouter()


# ============ Pydantic Schemas ============

class AlarmCreate(BaseModel):
    title: str
    description: Optional[str] = None
    alarm_time: datetime
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None  # daily, weekly, etc.


class AlarmUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    alarm_time: Optional[datetime] = None
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[str] = None
    is_active: Optional[bool] = None


class AlarmResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    description: Optional[str]
    alarm_time: datetime
    is_recurring: bool
    recurrence_pattern: Optional[str]
    is_active: bool
    is_snoozed: bool
    snooze_until: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class SnoozeRequest(BaseModel):
    snooze_minutes: int = 5


# ============ Endpoints ============

@router.get("/", response_model=List[AlarmResponse])
async def list_alarms(
    active_only: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """List all alarms for current user."""
    query = select(Alarm).where(Alarm.user_id == current_user.id)
    
    if active_only:
        query = query.where(Alarm.is_active == True)
    
    query = query.order_by(Alarm.alarm_time)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=AlarmResponse, status_code=status.HTTP_201_CREATED)
async def create_alarm(
    alarm_data: AlarmCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new alarm."""
    alarm = Alarm(
        user_id=current_user.id,
        title=alarm_data.title,
        description=alarm_data.description,
        alarm_time=alarm_data.alarm_time,
        is_recurring=alarm_data.is_recurring,
        recurrence_pattern=alarm_data.recurrence_pattern,
        is_active=True,
        is_snoozed=False,
    )
    db.add(alarm)
    await db.commit()
    await db.refresh(alarm)
    return alarm


@router.get("/{alarm_id}", response_model=AlarmResponse)
async def get_alarm(
    alarm_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific alarm."""
    result = await db.execute(
        select(Alarm).where(Alarm.id == alarm_id, Alarm.user_id == current_user.id)
    )
    alarm = result.scalar_one_or_none()
    
    if not alarm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alarm not found")
    
    return alarm


@router.put("/{alarm_id}", response_model=AlarmResponse)
async def update_alarm(
    alarm_id: UUID,
    alarm_data: AlarmUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an alarm."""
    result = await db.execute(
        select(Alarm).where(Alarm.id == alarm_id, Alarm.user_id == current_user.id)
    )
    alarm = result.scalar_one_or_none()
    
    if not alarm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alarm not found")
    
    # Update fields if provided
    if alarm_data.title is not None:
        alarm.title = alarm_data.title
    if alarm_data.description is not None:
        alarm.description = alarm_data.description
    if alarm_data.alarm_time is not None:
        alarm.alarm_time = alarm_data.alarm_time
    if alarm_data.is_recurring is not None:
        alarm.is_recurring = alarm_data.is_recurring
    if alarm_data.recurrence_pattern is not None:
        alarm.recurrence_pattern = alarm_data.recurrence_pattern
    if alarm_data.is_active is not None:
        alarm.is_active = alarm_data.is_active
    
    await db.commit()
    await db.refresh(alarm)
    return alarm


@router.delete("/{alarm_id}")
async def delete_alarm(
    alarm_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an alarm."""
    result = await db.execute(
        select(Alarm).where(Alarm.id == alarm_id, Alarm.user_id == current_user.id)
    )
    alarm = result.scalar_one_or_none()
    
    if not alarm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alarm not found")
    
    await db.delete(alarm)
    await db.commit()
    return {"message": "Alarm deleted successfully"}


@router.post("/{alarm_id}/snooze", response_model=AlarmResponse)
async def snooze_alarm(
    alarm_id: UUID,
    snooze_data: SnoozeRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Snooze an alarm for a specified number of minutes."""
    result = await db.execute(
        select(Alarm).where(Alarm.id == alarm_id, Alarm.user_id == current_user.id)
    )
    alarm = result.scalar_one_or_none()
    
    if not alarm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alarm not found")
    
    # Set snooze
    alarm.is_snoozed = True
    alarm.snooze_until = datetime.now(timezone.utc) + timedelta(minutes=snooze_data.snooze_minutes)
    
    await db.commit()
    await db.refresh(alarm)
    return alarm


@router.post("/{alarm_id}/dismiss", response_model=AlarmResponse)
async def dismiss_alarm(
    alarm_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Dismiss an alarm (deactivate it)."""
    result = await db.execute(
        select(Alarm).where(Alarm.id == alarm_id, Alarm.user_id == current_user.id)
    )
    alarm = result.scalar_one_or_none()
    
    if not alarm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alarm not found")
    
    # If recurring, schedule next occurrence instead of deactivating
    if alarm.is_recurring and alarm.recurrence_pattern:
        if alarm.recurrence_pattern == 'daily':
            alarm.alarm_time = alarm.alarm_time + timedelta(days=1)
        elif alarm.recurrence_pattern == 'weekly':
            alarm.alarm_time = alarm.alarm_time + timedelta(weeks=1)
        alarm.is_snoozed = False
        alarm.snooze_until = None
    else:
        # Non-recurring: deactivate
        alarm.is_active = False
        alarm.is_snoozed = False
        alarm.snooze_until = None
    
    await db.commit()
    await db.refresh(alarm)
    return alarm


@router.get("/upcoming/today", response_model=List[AlarmResponse])
async def get_today_alarms(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all alarms scheduled for today."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    result = await db.execute(
        select(Alarm)
        .where(
            Alarm.user_id == current_user.id,
            Alarm.is_active == True,
            Alarm.alarm_time >= today_start,
            Alarm.alarm_time < today_end,
        )
        .order_by(Alarm.alarm_time)
    )
    return result.scalars().all()