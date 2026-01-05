"""
AI Chat Endpoints
Conversational AI assistant
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
import secrets
import logging

from app.core.database import get_db
from app.core.config import settings
from app.models.models import User, ChatMessage
from app.schemas.schemas import ChatRequest, ChatResponse
from app.api.deps import get_current_active_user

router = APIRouter()
logger = logging.getLogger(__name__)


# Simple rule-based responses for educational queries
EDUCATIONAL_RESPONSES = {
    "help": "I'm your Penlet study assistant! I can help you with:\n- Understanding subjects\n- Study tips\n- Assignment guidance\n- Exam preparation\n\nWhat would you like help with?",
    "study": "Here are some effective study tips:\n1. Break study sessions into 25-minute chunks (Pomodoro)\n2. Review notes within 24 hours of class\n3. Practice active recall with flashcards\n4. Teach concepts to others\n5. Get enough sleep before exams",
    "math": "For math problems, try these steps:\n1. Read the problem carefully\n2. Identify what you need to find\n3. Write down given information\n4. Choose the right formula\n5. Solve step by step\n6. Check your answer",
    "exam": "Exam preparation tips:\n1. Start early - don't cram\n2. Create a study schedule\n3. Practice past papers\n4. Focus on weak areas\n5. Stay healthy - eat well and sleep\n6. Take breaks during study",
    "essay": "Essay writing structure:\n1. Introduction - Hook + Thesis statement\n2. Body paragraphs - Topic sentence + Evidence + Analysis\n3. Conclusion - Summarize + Final thoughts\n4. Proofread before submitting",
}


async def get_ai_response(message: str, context: List[dict] = None) -> str:
    """
    Generate AI response using OpenAI API or fallback to rule-based.
    """
    message_lower = message.lower()
    
    # Check for keyword matches
    for keyword, response in EDUCATIONAL_RESPONSES.items():
        if keyword in message_lower:
            return response
    
    # Check if AI API is configured
    if settings.AI_API_KEY:
        try:
            import httpx
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.AI_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.AI_MODEL,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a helpful educational assistant for students in Uganda. Help with subjects, study tips, and academic guidance. Keep responses concise and appropriate for secondary school students (Senior 1-6)."
                            },
                            {"role": "user", "content": message}
                        ],
                        "max_tokens": 500,
                        "temperature": 0.7,
                    },
                    timeout=30.0,
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"AI API error: {e}")
    
    # Default response
    return (
        "I'm here to help with your studies! You can ask me about:\n"
        "- Study techniques\n"
        "- Subject-specific help (math, science, English, etc.)\n"
        "- Exam preparation\n"
        "- Essay writing\n\n"
        "What would you like to learn about today?"
    )


@router.post("/", response_model=ChatResponse)
async def send_message(
    chat_request: ChatRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to the AI chatbot."""
    session_id = chat_request.session_id or secrets.token_urlsafe(16)
    
    # Save user message
    user_message = ChatMessage(
        user_id=current_user.id,
        session_id=session_id,
        role="user",
        content=chat_request.message,
    )
    db.add(user_message)
    
    # Get conversation history for context
    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(10)
    )
    history = history_result.scalars().all()
    
    context = [{"role": msg.role, "content": msg.content} for msg in reversed(history)]
    
    # Generate AI response
    ai_response = await get_ai_response(chat_request.message, context)
    
    # Save AI response
    assistant_message = ChatMessage(
        user_id=current_user.id,
        session_id=session_id,
        role="assistant",
        content=ai_response,
    )
    db.add(assistant_message)
    await db.commit()
    
    return ChatResponse(
        message=ai_response,
        session_id=session_id
    )


@router.get("/history/{session_id}")
async def get_chat_history(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get chat history for a session."""
    result = await db.execute(
        select(ChatMessage)
        .where(
            ChatMessage.session_id == session_id,
            ChatMessage.user_id == current_user.id
        )
        .order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()
    
    return [
        {
            "role": msg.role,
            "content": msg.content,
            "timestamp": msg.created_at
        }
        for msg in messages
    ]


@router.get("/sessions")
async def get_chat_sessions(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's chat sessions."""
    from sqlalchemy import func, distinct
    
    result = await db.execute(
        select(
            ChatMessage.session_id,
            func.min(ChatMessage.created_at).label("started_at"),
            func.max(ChatMessage.created_at).label("last_message"),
            func.count(ChatMessage.id).label("message_count")
        )
        .where(ChatMessage.user_id == current_user.id)
        .group_by(ChatMessage.session_id)
        .order_by(func.max(ChatMessage.created_at).desc())
        .limit(20)
    )
    
    sessions = []
    for row in result:
        sessions.append({
            "session_id": row.session_id,
            "started_at": row.started_at,
            "last_message": row.last_message,
            "message_count": row.message_count
        })
    
    return sessions


@router.delete("/sessions/{session_id}")
async def delete_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a chat session."""
    from sqlalchemy import delete
    
    await db.execute(
        delete(ChatMessage).where(
            ChatMessage.session_id == session_id,
            ChatMessage.user_id == current_user.id
        )
    )
    await db.commit()
    return {"message": "Session deleted"}
