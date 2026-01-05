"""
Games Endpoints
Educational games and scoring
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.models.models import User, GameScore, Subject
from app.schemas.schemas import GameScoreCreate, GameScoreResponse, LeaderboardEntry, UserBriefResponse
from app.api.deps import get_current_active_user

router = APIRouter()

AVAILABLE_GAMES = [
    {"id": "memory_match", "name": "Memory Match", "description": "Match pairs of cards", "icon": "🧠"},
    {"id": "word_scramble", "name": "Word Scramble", "description": "Unscramble words", "icon": "🔤"},
    {"id": "quick_math", "name": "Quick Math", "description": "Solve math problems quickly", "icon": "🔢"},
    {"id": "typing_race", "name": "Typing Race", "description": "Test your typing speed", "icon": "⌨️"},
    {"id": "quiz_challenge", "name": "Quiz Challenge", "description": "Subject-based quiz", "icon": "❓"},
    {"id": "flashcard_game", "name": "Flashcard Game", "description": "Review flashcards", "icon": "📚"},
]


@router.get("/available")
async def get_available_games():
    """Get list of available games."""
    return AVAILABLE_GAMES


@router.post("/scores", response_model=GameScoreResponse, status_code=status.HTTP_201_CREATED)
async def record_game_score(
    score_data: GameScoreCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Record a game score."""
    valid_games = [g["id"] for g in AVAILABLE_GAMES]
    if score_data.game_type not in valid_games:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid game type")
    
    if score_data.subject_id:
        result = await db.execute(select(Subject).where(Subject.id == score_data.subject_id))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    
    new_score = GameScore(
        user_id=current_user.id,
        game_type=score_data.game_type,
        score=score_data.score,
        level=score_data.level,
        time_taken=score_data.time_taken,
        accuracy=score_data.accuracy,
        subject_id=score_data.subject_id,
        game_data=score_data.game_data,
    )
    db.add(new_score)
    await db.commit()
    await db.refresh(new_score)
    return new_score


@router.get("/scores", response_model=List[GameScoreResponse])
async def get_my_scores(
    game_type: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's game scores."""
    query = select(GameScore).where(GameScore.user_id == current_user.id)
    
    if game_type:
        query = query.where(GameScore.game_type == game_type)
    
    query = query.order_by(GameScore.played_at.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/scores/best")
async def get_best_scores(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's best scores for each game."""
    result = await db.execute(
        select(
            GameScore.game_type,
            func.max(GameScore.score).label("best_score"),
            func.count(GameScore.id).label("times_played"),
        )
        .where(GameScore.user_id == current_user.id)
        .group_by(GameScore.game_type)
    )
    
    scores = {}
    for row in result:
        scores[row.game_type] = {
            "best_score": row.best_score,
            "times_played": row.times_played
        }
    
    return scores


@router.get("/leaderboard/{game_type}")
async def get_leaderboard(
    game_type: str,
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get leaderboard for a specific game."""
    valid_games = [g["id"] for g in AVAILABLE_GAMES]
    if game_type not in valid_games:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid game type")
    
    from sqlalchemy.orm import aliased
    
    subquery = (
        select(
            GameScore.user_id,
            func.max(GameScore.score).label("max_score")
        )
        .where(GameScore.game_type == game_type)
        .group_by(GameScore.user_id)
        .subquery()
    )
    
    result = await db.execute(
        select(User, subquery.c.max_score)
        .join(subquery, User.id == subquery.c.user_id)
        .order_by(desc(subquery.c.max_score))
        .limit(limit)
    )
    
    leaderboard = []
    for rank, (user, score) in enumerate(result, 1):
        leaderboard.append({
            "rank": rank,
            "user": {
                "id": user.id,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "profile_picture": user.profile_picture,
            },
            "score": score,
            "game_type": game_type
        })
    
    return leaderboard


@router.get("/stats/summary")
async def get_game_stats(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get overall game statistics for the user."""
    result = await db.execute(
        select(
            func.count(GameScore.id).label("total_games"),
            func.sum(GameScore.score).label("total_score"),
            func.avg(GameScore.accuracy).label("avg_accuracy"),
        )
        .where(GameScore.user_id == current_user.id)
    )
    stats = result.one()
    
    return {
        "total_games_played": stats.total_games or 0,
        "total_score": stats.total_score or 0,
        "average_accuracy": round(stats.avg_accuracy, 2) if stats.avg_accuracy else None
    }
