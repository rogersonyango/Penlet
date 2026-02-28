"""
Timetable Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.models.models import User, TimetableEntry, Subject
from app.schemas.schemas import TimetableEntryCreate, TimetableEntryUpdate, TimetableEntryResponse
from app.api.deps import get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[TimetableEntryResponse])
async def list_timetable_entries(
    day_of_week: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's timetable entries."""
    query = select(TimetableEntry).options(selectinload(TimetableEntry.subject)).where(
        TimetableEntry.user_id == current_user.id
    )
    
    if day_of_week is not None:
        query = query.where(TimetableEntry.day_of_week == day_of_week)
    
    query = query.order_by(TimetableEntry.day_of_week, TimetableEntry.start_time)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=TimetableEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_timetable_entry(
    entry_data: TimetableEntryCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new timetable entry."""
    if entry_data.subject_id:
        result = await db.execute(select(Subject).where(Subject.id == entry_data.subject_id))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    
    new_entry = TimetableEntry(
        user_id=current_user.id,
        title=entry_data.title,
        day_of_week=entry_data.day_of_week,
        start_time=entry_data.start_time,
        end_time=entry_data.end_time,
        location=entry_data.location,
        color=entry_data.color,
        notes=entry_data.notes,
        subject_id=entry_data.subject_id,
        is_recurring=entry_data.is_recurring,
    )
    db.add(new_entry)
    await db.commit()
    
    # Reload with subject relationship
    result = await db.execute(
        select(TimetableEntry)
        .options(selectinload(TimetableEntry.subject))
        .where(TimetableEntry.id == new_entry.id)
    )
    return result.scalar_one()


@router.get("/{entry_id}", response_model=TimetableEntryResponse)
async def get_timetable_entry(
    entry_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get timetable entry by ID."""
    result = await db.execute(
        select(TimetableEntry).options(selectinload(TimetableEntry.subject)).where(TimetableEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    
    if entry.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    return entry


@router.put("/{entry_id}", response_model=TimetableEntryResponse)
async def update_timetable_entry(
    entry_id: UUID,
    update_data: TimetableEntryUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a timetable entry."""
    result = await db.execute(select(TimetableEntry).where(TimetableEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    
    if entry.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    
    await db.commit()
    
    # Reload with subject relationship
    result = await db.execute(
        select(TimetableEntry)
        .options(selectinload(TimetableEntry.subject))
        .where(TimetableEntry.id == entry_id)
    )
    return result.scalar_one()


@router.delete("/{entry_id}")
async def delete_timetable_entry(
    entry_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a timetable entry."""
    result = await db.execute(select(TimetableEntry).where(TimetableEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    
    if entry.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    await db.delete(entry)
    await db.commit()
    return {"message": "Entry deleted"}


@router.get("/week/current")
async def get_current_week_schedule(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get full week schedule for the current user."""
    result = await db.execute(
        select(TimetableEntry)
        .options(selectinload(TimetableEntry.subject))
        .where(TimetableEntry.user_id == current_user.id)
        .order_by(TimetableEntry.day_of_week, TimetableEntry.start_time)
    )
    entries = result.scalars().all()
    
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    schedule = {day: [] for day in days}
    
    for entry in entries:
        day_name = days[entry.day_of_week]
        schedule[day_name].append(entry)
    
    return schedule