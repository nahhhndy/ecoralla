"""AI Environmental Assistant & Research Copilot API router."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.dependencies import get_current_user, get_db
from backend.app.models.user import User
from backend.app.services.assistant import (
    AIResearchCopilotService,
    CopilotChatRequest,
    CopilotChatResponse,
)

router = APIRouter()


@router.post("/chat", response_model=CopilotChatResponse)
async def chat_with_copilot(
    req: CopilotChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CopilotChatResponse:
    service = AIResearchCopilotService(db)
    return await service.execute_copilot(current_user.id, req)
