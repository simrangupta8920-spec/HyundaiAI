from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any
from app.services.agora.agora_service import AgoraService

router = APIRouter(prefix="/agora", tags=["agora"])


# ── Request / Response models ─────────────────────────────────────────────────

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
    agent_uid: Optional[int] = None

class AgentStopRequest(BaseModel):
    agent_id: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

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
    Starts the Agora Conversational AI Agent for the given channel.
    The agent joins the RTC channel as a separate participant and handles:
      Customer mic → ASR (Deepgram nova-3) → LLM (GPT-4.1-mini) → TTS (Minimax) → RTC audio

    Returns agent_id needed to stop the agent later.
    """
    if not req.channel_name or not req.session_id:
        raise HTTPException(status_code=400, detail="channel_name and session_id are required")

    result = AgoraService.start_conversational_ai_agent(
        channel_name=req.channel_name,
        session_id=req.session_id,
        agent_uid=req.agent_uid,
    )
    return result


@router.post("/conversational-agent/stop")
def stop_conversational_agent(req: AgentStopRequest):
    """
    Stops a running Agora Conversational AI Agent by agent_id.
    Call this when the user ends their voice session.
    """
    if not req.agent_id:
        raise HTTPException(status_code=400, detail="agent_id is required")

    result = AgoraService.stop_conversational_ai_agent(agent_id=req.agent_id)
    return result


@router.get("/status")
def get_agora_status():
    """Returns the backend Agora voice and Conversational AI configuration status."""
    is_rtc_configured = AgoraService.is_agora_configured()
    is_convo_ai_configured = AgoraService.is_conversational_ai_configured()
    return {
        "agora_rtc_configured": is_rtc_configured,
        "agora_conversational_ai_configured": is_convo_ai_configured,
        "mock_voice": not is_rtc_configured,
        "channel_prefix": "hyundai",
    }
