import time
import random
from typing import Dict, Any, Optional
from app.core.config import settings
from app.services.agora.token_builder import RtcTokenBuilder, Role

class AgoraService:
    @staticmethod
    def is_agora_configured() -> bool:
        """Check if Agora App ID and Certificate are set in configuration."""
        if getattr(settings, "MOCK_VOICE", False):
            return False
        app_id = getattr(settings, "AGORA_APP_ID", "")
        app_cert = getattr(settings, "AGORA_APP_CERTIFICATE", "")
        return bool(app_id and app_cert and len(app_id) > 10 and len(app_cert) > 10)

    @staticmethod
    def generate_channel_name(showroom_id: str, session_id: str) -> str:
        """Formats a secure Agora channel name using prefix, showroom_id, and session_id."""
        prefix = getattr(settings, "AGORA_CHANNEL_PREFIX", "hyundai")
        clean_showroom = showroom_id.replace("-", "_").lower() if showroom_id else "default"
        clean_session = session_id.replace("-", "_").lower() if session_id else "sess"
        return f"{prefix}_{clean_showroom}_{clean_session}"

    @classmethod
    def create_rtc_session(
        cls,
        showroom_id: str,
        session_id: str,
        uid: Optional[int] = None,
        role: int = Role.PUBLISHER
    ) -> Dict[str, Any]:
        """
        Creates an Agora RTC session associated with showroom_id and conversation_id.
        Never exposes the AGORA_APP_CERTIFICATE.
        """
        if not uid:
            uid = random.randint(100000, 999999)

        channel_name = cls.generate_channel_name(showroom_id, session_id)
        mock_mode = not cls.is_agora_configured()

        app_id = getattr(settings, "AGORA_APP_ID", "")
        app_cert = getattr(settings, "AGORA_APP_CERTIFICATE", "")

        if not mock_mode:
            expire_timestamp = int(time.time()) + 86400 # 24 hour token validity
            token = RtcTokenBuilder.build_token_with_uid(
                app_id=app_id,
                app_certificate=app_cert,
                channel_name=channel_name,
                uid=uid,
                role=role,
                privilege_expire_ts=expire_timestamp
            )
        else:
            token = f"mock_token_{channel_name}_{uid}"

        return {
            "app_id": app_id if not mock_mode else "MOCK_AGORA_APP_ID",
            "channel_name": channel_name,
            "token": token,
            "uid": uid,
            "showroom_id": showroom_id,
            "session_id": session_id,
            "conversation_id": session_id,
            "mock_voice": mock_mode,
            "expires_in": 86400
        }

    @classmethod
    def start_conversational_ai_agent(cls, channel_name: str, session_id: str) -> Dict[str, Any]:
        """
        Stub / Trigger for Agora Conversational AI Agent (STT + LLM + TTS pipeline).
        """
        # =========================================================================
        # TODO: AGORA CONVERSATIONAL AI AGENT EXTERNAL CONSOLE CONFIGURATION
        # 1. Enable "Conversational AI" in Agora Console (https://console.agora.io).
        # 2. Configure STT Provider (e.g. Deepgram / Whisper / Microsoft Speech).
        # 3. Configure LLM Gateway (points to FastAPI backend `/api/conversation/message` or OpenAI/Gemini).
        # 4. Configure TTS Provider (e.g. ElevenLabs / Azure TTS).
        # 5. Call Agora Conversational AI REST API endpoint:
        #    POST https://api.agora.io/v1/projects/{app_id}/conversational-ai/agents/start
        # =========================================================================

        return {
            "status": "pending_external_configuration",
            "channel_name": channel_name,
            "session_id": session_id,
            "message": "Agora Conversational AI agent configured. External Agora Console agent worker can join channel."
        }
