from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any
from app.services.agora.agora_service import AgoraService

router = APIRouter(prefix="/agora", tags=["agora"])

class AgoraTokenRequest(BaseModel):
    showroom_id: str
    session_id: str
    uid: Optional[int] = None

class AgoraTokenResponse(BaseModel):
    app_id: str
    channel_name: str
    token: str
    uid: int
    showroom_id: str
    session_id: str
    conversation_id: str
    mock_voice: bool
    expires_in: int
    model_config = ConfigDict(from_attributes=True)

class AgentStartRequest(BaseModel):
    channel_name: str
    session_id: str

@router.post("/token", response_model=AgoraTokenResponse)
def get_agora_token(req: AgoraTokenRequest):
    """
    Generates a secure Agora RTC token for real-time voice communication.
    Associates the session with showroom_id and conversation session_id.
    Never exposes AGORA_APP_CERTIFICATE.
    """
    if not req.showroom_id or not req.session_id:
        raise HTTPException(status_code=400, detail="showroom_id and session_id are required")

    session_data = AgoraService.create_rtc_session(
        showroom_id=req.showroom_id,
        session_id=req.session_id,
        uid=req.uid
    )
    return session_data

@router.post("/conversational-agent/start")
def start_conversational_agent(req: AgentStartRequest):
    """
    Triggers the Agora Conversational AI Agent for real-time STT -> LLM -> TTS voice loop.
    Contains TODO markers for external Agora console & REST API configuration.
    """
    return AgoraService.start_conversational_ai_agent(
        channel_name=req.channel_name,
        session_id=req.session_id
    )

@router.get("/status")
def get_agora_status():
    """Returns the backend Agora voice configuration status."""
    is_configured = AgoraService.is_agora_configured()
    return {
        "agora_configured": is_configured,
        "mock_voice": not is_configured,
        "channel_prefix": "hyundai"
    }
