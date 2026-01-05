"""
Alarm/Reminder Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.models.models import User, Alarm
from app.schemas.schemas import AlarmCreate, AlarmUpdate, AlarmSnooze, AlarmResponse
from app.api.deps import get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[AlarmResponse])
async def list_alarms(
    active_only: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's alarms."""
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
    # Convert timezone-aware datetime to naive (remove timezone info)
    alarm_time = alarm_data.alarm_time
    if alarm_time.tzinfo is not None:
        alarm_time = alarm_time.replace(tzinfo=None)
    
    new_alarm = Alarm(
        user_id=current_user.id,
        title=alarm_data.title,
        description=alarm_data.description,
        alarm_time=alarm_time,
        is_recurring=alarm_data.is_recurring,
        recurrence_pattern=alarm_data.recurrence_pattern,
        is_active=alarm_data.is_active,
    )
    db.add(new_alarm)
    await db.commit()
    await db.refresh(new_alarm)
    return new_alarm


@router.get("/{alarm_id}", response_model=AlarmResponse)
async def get_alarm(
    alarm_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get alarm by ID."""
    result = await db.execute(select(Alarm).where(Alarm.id == alarm_id))
    alarm = result.scalar_one_or_none()
    if not alarm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alarm not found")
    
    if alarm.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    return alarm


@router.put("/{alarm_id}", response_model=AlarmResponse)
async def update_alarm(
    alarm_id: UUID,
    update_data: AlarmUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an alarm."""
    result = await db.execute(select(Alarm).where(Alarm.id == alarm_id))
    alarm = result.scalar_one_or_none()
    if not alarm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alarm not found")
    
    if alarm.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(alarm, field, value)
    
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
    result = await db.execute(select(Alarm).where(Alarm.id == alarm_id))
    alarm = result.scalar_one_or_none()
    if not alarm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alarm not found")
    
    if alarm.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    await db.delete(alarm)
    await db.commit()
    return {"message": "Alarm deleted"}


@router.post("/{alarm_id}/snooze", response_model=AlarmResponse)
async def snooze_alarm(
    alarm_id: UUID,
    snooze_data: AlarmSnooze,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Snooze an alarm."""
    result = await db.execute(select(Alarm).where(Alarm.id == alarm_id))
    alarm = result.scalar_one_or_none()
    if not alarm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alarm not found")
    
    if alarm.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    alarm.is_snoozed = True
    alarm.snooze_until = datetime.utcnow() + timedelta(minutes=snooze_data.snooze_minutes)
    await db.commit()
    await db.refresh(alarm)
    return alarm


@router.post("/{alarm_id}/dismiss", response_model=AlarmResponse)
async def dismiss_alarm(
    alarm_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Dismiss an alarm."""
    result = await db.execute(select(Alarm).where(Alarm.id == alarm_id))
    alarm = result.scalar_one_or_none()
    if not alarm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alarm not found")
    
    if alarm.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    alarm.is_snoozed = False
    alarm.snooze_until = None
    
    if not alarm.is_recurring:
        alarm.is_active = False
    
    await db.commit()
    await db.refresh(alarm)
    return alarm


@router.get("/upcoming/today")
async def get_today_alarms(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get today's upcoming alarms."""
    now = datetime.utcnow()
    end_of_day = now.replace(hour=23, minute=59, second=59)
    
    result = await db.execute(
        select(Alarm).where(
            Alarm.user_id == current_user.id,
            Alarm.is_active == True,
            Alarm.alarm_time >= now,
            Alarm.alarm_time <= end_of_day
        ).order_by(Alarm.alarm_time)
    )
    return result.scalars().all()