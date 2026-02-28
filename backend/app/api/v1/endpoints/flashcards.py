"""
Flashcard Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.models import User, Flashcard, Subject, UserRole
from app.schemas.schemas import FlashcardCreate, FlashcardUpdate, FlashcardReview, FlashcardResponse
from app.api.deps import get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[FlashcardResponse])
async def list_flashcards(
    subject_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's flashcards."""
    query = select(Flashcard).options(selectinload(Flashcard.subject)).where(Flashcard.creator_id == current_user.id)
    
    if subject_id:
        query = query.where(Flashcard.subject_id == subject_id)
    
    query = query.order_by(Flashcard.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=FlashcardResponse, status_code=status.HTTP_201_CREATED)
async def create_flashcard(
    flashcard_data: FlashcardCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new flashcard."""
    if flashcard_data.subject_id:
        result = await db.execute(select(Subject).where(Subject.id == flashcard_data.subject_id))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    
    new_flashcard = Flashcard(
        question=flashcard_data.question,
        answer=flashcard_data.answer,
        subject_id=flashcard_data.subject_id,
        creator_id=current_user.id,
    )
    db.add(new_flashcard)
    await db.commit()
    
    # Reload with subject relationship
    result = await db.execute(
        select(Flashcard)
        .options(selectinload(Flashcard.subject))
        .where(Flashcard.id == new_flashcard.id)
    )
    return result.scalar_one()


@router.get("/{flashcard_id}", response_model=FlashcardResponse)
async def get_flashcard(
    flashcard_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get flashcard by ID."""
    result = await db.execute(
        select(Flashcard).options(selectinload(Flashcard.subject)).where(Flashcard.id == flashcard_id)
    )
    flashcard = result.scalar_one_or_none()
    if not flashcard:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flashcard not found")
    
    if flashcard.creator_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    return flashcard


@router.put("/{flashcard_id}", response_model=FlashcardResponse)
async def update_flashcard(
    flashcard_id: UUID,
    update_data: FlashcardUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a flashcard."""
    result = await db.execute(select(Flashcard).where(Flashcard.id == flashcard_id))
    flashcard = result.scalar_one_or_none()
    if not flashcard:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flashcard not found")
    
    if flashcard.creator_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(flashcard, field, value)
    
    await db.commit()
    
    # Reload with subject relationship
    result = await db.execute(
        select(Flashcard)
        .options(selectinload(Flashcard.subject))
        .where(Flashcard.id == flashcard_id)
    )
    return result.scalar_one()


@router.delete("/{flashcard_id}")
async def delete_flashcard(
    flashcard_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a flashcard."""
    result = await db.execute(select(Flashcard).where(Flashcard.id == flashcard_id))
    flashcard = result.scalar_one_or_none()
    if not flashcard:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flashcard not found")
    
    if flashcard.creator_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    await db.delete(flashcard)
    await db.commit()
    return {"message": "Flashcard deleted"}


@router.post("/{flashcard_id}/review", response_model=FlashcardResponse)
async def review_flashcard(
    flashcard_id: UUID,
    review_data: FlashcardReview,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Record a flashcard review."""
    result = await db.execute(select(Flashcard).where(Flashcard.id == flashcard_id))
    flashcard = result.scalar_one_or_none()
    if not flashcard:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flashcard not found")
    
    if flashcard.creator_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    flashcard.times_reviewed += 1
    if review_data.was_correct:
        flashcard.times_correct += 1
        flashcard.difficulty_level = max(1, flashcard.difficulty_level - 1)
    else:
        flashcard.difficulty_level = min(5, flashcard.difficulty_level + 1)
    
    flashcard.last_reviewed = datetime.utcnow()
    await db.commit()
    
    # Reload with subject relationship
    result = await db.execute(
        select(Flashcard)
        .options(selectinload(Flashcard.subject))
        .where(Flashcard.id == flashcard_id)
    )
    return result.scalar_one()


@router.get("/study/session")
async def get_study_session(
    subject_id: Optional[UUID] = None,
    count: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get flashcards for a study session, prioritizing ones that need review."""
    from sqlalchemy import func
    
    query = select(Flashcard).options(selectinload(Flashcard.subject)).where(Flashcard.creator_id == current_user.id)
    
    if subject_id:
        query = query.where(Flashcard.subject_id == subject_id)
    
    query = query.order_by(
        Flashcard.difficulty_level.desc(),
        Flashcard.last_reviewed.asc().nullsfirst()
    ).limit(count)
    
    result = await db.execute(query)
    flashcards = result.scalars().all()
    
    return {
        "flashcards": flashcards,
        "total": len(flashcards)
    }