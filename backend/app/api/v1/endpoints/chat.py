"""
AI Chat Endpoints
Handle AI-powered chat interactions using Claude API
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
import anthropic
import json
import logging

from app.core.database import get_db
from app.core.config import settings
from app.models.models import User, Subject
from app.api.deps import get_current_active_user

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize Anthropic client
client = None
if hasattr(settings, 'ANTHROPIC_API_KEY') and settings.ANTHROPIC_API_KEY:
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = []
    subject_context: Optional[str] = None  # Optional subject to focus on


class ChatResponse(BaseModel):
    response: str
    tokens_used: Optional[int] = None


# System prompt for educational assistant
SYSTEM_PROMPT = """You are Penlet AI, a friendly and knowledgeable educational assistant designed to help Ugandan secondary school students (Senior 1-6) with their studies.

Your key characteristics:
- Patient and encouraging with students of all levels
- Explain concepts clearly using simple language and relatable examples
- Focus on the Ugandan curriculum (UNEB syllabus)
- Help with subjects like Mathematics, Physics, Chemistry, Biology, English, History, Geography, etc.
- When solving problems, show step-by-step solutions
- Encourage critical thinking rather than just giving answers
- Use examples relevant to Ugandan context when possible

Guidelines:
- Keep responses concise but comprehensive
- Use bullet points and numbered lists for clarity when appropriate
- If a student seems stuck, ask guiding questions
- Celebrate progress and effort
- If you don't know something specific to the Ugandan curriculum, say so honestly
- Never do homework for students - guide them to understand

{subject_context}

Remember: Your goal is to help students learn and understand, not just to provide answers."""


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to the AI assistant and get a response."""
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not configured. Please contact administrator."
        )
    
    try:
        # Build system prompt with optional subject context
        subject_context = ""
        if request.subject_context:
            subject_context = f"\nCurrent subject focus: {request.subject_context}. Tailor your responses to this subject."
        
        system_prompt = SYSTEM_PROMPT.format(subject_context=subject_context)
        
        # Build messages list
        messages = []
        for msg in request.conversation_history[-10:]:  # Keep last 10 messages for context
            messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # Add current message
        messages.append({
            "role": "user",
            "content": request.message
        })
        
        # Call Claude API
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=system_prompt,
            messages=messages
        )
        
        assistant_message = response.content[0].text
        tokens_used = response.usage.input_tokens + response.usage.output_tokens
        
        logger.info(f"Chat response generated for user {current_user.id}, tokens: {tokens_used}")
        
        return ChatResponse(
            response=assistant_message,
            tokens_used=tokens_used
        )
        
    except anthropic.APIConnectionError:
        logger.error("Failed to connect to Anthropic API")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to connect to AI service. Please try again later."
        )
    except anthropic.RateLimitError:
        logger.error("Anthropic API rate limit exceeded")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI service is busy. Please wait a moment and try again."
        )
    except anthropic.APIStatusError as e:
        logger.error(f"Anthropic API error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI service error. Please try again."
        )
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred."
        )


@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message and stream the response for real-time display."""
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not configured."
        )
    
    async def generate():
        try:
            subject_context = ""
            if request.subject_context:
                subject_context = f"\nCurrent subject focus: {request.subject_context}."
            
            system_prompt = SYSTEM_PROMPT.format(subject_context=subject_context)
            
            messages = []
            for msg in request.conversation_history[-10:]:
                messages.append({"role": msg.role, "content": msg.content})
            messages.append({"role": "user", "content": request.message})
            
            with client.messages.stream(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                system=system_prompt,
                messages=messages
            ) as stream:
                for text in stream.text_stream:
                    yield f"data: {json.dumps({'text': text})}\n\n"
            
            yield f"data: {json.dumps({'done': True})}\n\n"
            
        except Exception as e:
            logger.error(f"Stream error: {str(e)}")
            yield f"data: {json.dumps({'error': 'An error occurred'})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.get("/chat/subjects")
async def get_chat_subjects(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get list of subjects for context selection."""
    result = await db.execute(
        select(Subject).where(Subject.is_active == True).order_by(Subject.name)
    )
    subjects = result.scalars().all()
    
    return [{"id": str(s.id), "name": s.name} for s in subjects]