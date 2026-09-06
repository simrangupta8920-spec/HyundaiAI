import time
import random
import base64
import httpx
from typing import Dict, Any, Optional
from app.core.config import settings
from app.services.agora.token_builder import RtcTokenBuilder, Role

# Agora Conversational AI v2 REST API base
AGORA_CONVO_AI_BASE = "https://api.agora.io/api/conversational-ai-agent/v2/projects"


class AgoraService:
    # ── Configuration checks ──────────────────────────────────────────────────

    @staticmethod
    def is_agora_configured() -> bool:
        """Check if Agora App ID and Certificate are set."""
        if getattr(settings, "MOCK_VOICE", False):
            return False
        app_id = getattr(settings, "AGORA_APP_ID", "")
        app_cert = getattr(settings, "AGORA_APP_CERTIFICATE", "")
        return bool(app_id and app_cert and len(app_id) > 10 and len(app_cert) > 10)

    @staticmethod
    def is_conversational_ai_configured() -> bool:
        """Check if Agora Conversational AI REST API credentials are set."""
        customer_id = getattr(settings, "AGORA_CUSTOMER_ID", "")
        customer_secret = getattr(settings, "AGORA_CUSTOMER_SECRET", "")
        pipeline_id = getattr(settings, "AGORA_PIPELINE_ID", "")
        return bool(customer_id and customer_secret and pipeline_id)

    @staticmethod
    def _get_basic_auth_header() -> str:
        """Build HTTP Basic Auth header from Customer ID and Customer Secret."""
        customer_id = getattr(settings, "AGORA_CUSTOMER_ID", "")
        customer_secret = getattr(settings, "AGORA_CUSTOMER_SECRET", "")
        credentials = f"{customer_id}:{customer_secret}"
        encoded = base64.b64encode(credentials.encode("utf-8")).decode("utf-8")
        return f"Basic {encoded}"

    # ── Channel name ──────────────────────────────────────────────────────────

    @staticmethod
    def generate_channel_name(showroom_id: str, session_id: str) -> str:
        """Formats a secure Agora channel name using prefix, showroom_id, and session_id."""
        prefix = getattr(settings, "AGORA_CHANNEL_PREFIX", "hyundai")
        clean_showroom = showroom_id.replace("-", "_").lower() if showroom_id else "default"
        clean_session = session_id.replace("-", "_").lower() if session_id else "sess"
        return f"{prefix}_{clean_showroom}_{clean_session}"

    # ── RTC session (token for browser) ──────────────────────────────────────

    @classmethod
    def create_rtc_session(
        cls,
        showroom_id: str,
        session_id: str,
        uid: Optional[int] = None,
        role: int = Role.PUBLISHER
    ) -> Dict[str, Any]:
        """
        Creates an Agora RTC session token for the customer browser.
        Never exposes the AGORA_APP_CERTIFICATE.
        """
        if not uid:
            uid = random.randint(100000, 999999)

        channel_name = cls.generate_channel_name(showroom_id, session_id)
        mock_mode = not cls.is_agora_configured()

        app_id = getattr(settings, "AGORA_APP_ID", "")
        app_cert = getattr(settings, "AGORA_APP_CERTIFICATE", "")

        if not mock_mode:
            expire_timestamp = int(time.time()) + 86400  # 24 hour token validity
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

    # ── Voice Agent System Prompt (dynamic from Excel) ────────────────────────

    @classmethod
    def _build_voice_agent_system_prompt(cls) -> str:
        """
        Build the Agora Conversational AI system prompt using LIVE data from the Excel file.
        No hardcoded prices, models, or specs — everything comes from the dataset.
        """
        try:
            from app.services.vehicle_service import get_brand_summary_table
            hyundai_table = get_brand_summary_table("Hyundai", "Delhi")
            tata_table    = get_brand_summary_table("Tata Motors", "Delhi")
            maruti_table  = get_brand_summary_table("Maruti Suzuki", "Delhi")
        except Exception as e:
            print(f"[AgoraService] Warning: Could not load vehicle data for system prompt: {e}")
            hyundai_table = "Vehicle data unavailable."
            tata_table    = "Vehicle data unavailable."
            maruti_table  = "Vehicle data unavailable."

        return f"""You are the EchoSphere voice sales agent for an authorised Hyundai showroom in India.
A walk-in customer is speaking with you about Hyundai vehicles.
Your primary brand is Hyundai. Tata Motors and Maruti Suzuki are competitor brands — use their data only for honest comparisons, never to sell them.

=== HYUNDAI VEHICLES (live data, Delhi on-road prices) ===
{hyundai_table}

=== TATA MOTORS COMPETITOR REFERENCE (use for comparisons only) ===
{tata_table}

=== MARUTI SUZUKI COMPETITOR REFERENCE (use for comparisons only) ===
{maruti_table}

=== PRICING RULES ===
- All prices shown are Delhi ex-showroom or on-road from the official dataset.
- Do NOT invent, estimate, or fabricate prices, discounts, or specs not in the table above.
- If a customer asks about a variant, state, or detail not in the data, say you will check and don't guess.
- For special discounts or price approvals, offer to connect them with a human sales executive.

=== NEGOTIATION & OBJECTION HANDLING ===
- "Why Hyundai over Tata/Maruti?": Focus on the customer's actual needs, features, safety, and service. Never disparage competitors with unsupported claims.
- "Price is too high": Acknowledge, then connect price to safety, features, and long-term value. Offer a lower-priced Hyundai alternative from the table.
- "Can you give a discount?": Do not promise a discount. Explain final pricing depends on variant, state, offers, and dealer terms. Offer to connect a human executive.
- "I need better mileage": Ask about city vs highway use and fuel preference, then recommend accordingly from the table.
- "I want an automatic": Confirm budget, then recommend from the table.
- "I need a 7-seater": Look for vehicles with 6+ seating capacity in the table.
- "I want an electric car": Ask budget, daily range, and charging access, then recommend EVs from the table.
- "I need a family car": Ask family size, budget, and fuel preference, then recommend.

=== HOW TO SPEAK ===
- This is a real-time VOICE conversation — keep responses SHORT (2-3 sentences max).
- Speak naturally like a knowledgeable showroom salesperson, not like a chatbot reading a list.
- Do NOT read out the full table. Mention 1-2 specific model names with a price and key feature.
- If the customer shows buying intent (asks about test drives, says "I want this"), proactively offer to book a test drive.
- Start with a brief, warm greeting as a Hyundai showroom sales executive."""

    # ── Conversational AI Agent ───────────────────────────────────────────────

    @classmethod
    def start_conversational_ai_agent(
        cls,
        channel_name: str,
        session_id: str,
        agent_uid: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Starts an Agora Conversational AI Agent that joins the RTC channel.
        The agent handles: customer mic audio → ASR (Deepgram) → LLM (OpenAI) → TTS (Minimax) → RTC audio.

        Calls:
          POST https://api.agora.io/api/conversational-ai-agent/v2/projects/{appId}/join

        Returns agent_id which is used later to stop the agent.
        """
        if not cls.is_conversational_ai_configured():
            return {
                "status": "not_configured",
                "channel_name": channel_name,
                "session_id": session_id,
                "message": (
                    "Agora Conversational AI credentials not set. "
                    "Add AGORA_CUSTOMER_ID, AGORA_CUSTOMER_SECRET, and AGORA_PIPELINE_ID to .env"
                )
            }

        app_id = getattr(settings, "AGORA_APP_ID", "")
        pipeline_id = getattr(settings, "AGORA_PIPELINE_ID", "")

        # The AI agent joins as a separate UID in the same channel
        if not agent_uid:
            agent_uid = random.randint(1000, 9999)

        url = f"{AGORA_CONVO_AI_BASE}/{app_id}/join"

        headers = {
            "Authorization": cls._get_basic_auth_header(),
            "Content-Type": "application/json",
        }

        app_cert = getattr(settings, "AGORA_APP_CERTIFICATE", "")
        agent_expire_timestamp = int(time.time()) + 86400  # 24 hour token validity
        agent_token = RtcTokenBuilder.build_token_with_uid(
            app_id=app_id,
            app_certificate=app_cert,
            channel_name=channel_name,
            uid=agent_uid,
            role=Role.PUBLISHER,
            privilege_expire_ts=agent_expire_timestamp
        )

        # Full Conversational AI pipeline configuration matching the user's curl spec
        body = {
            "name": f"{channel_name}-{int(time.time())}",
            "pipeline_id": pipeline_id,
            "properties": {
                "channel": channel_name,
                "token": agent_token,
                "agent_rtc_uid": str(agent_uid),
                "remote_rtc_uids": ["*"],
                "asr": {
                    "vendor": "deepgram",
                    "params": {
                        "resource_id": "2ca6dcf4ded340b6b67f0ccf4972a00d",
                        "model": "nova-3",
                        "keyterm": "",
                        "language": "en"
                    }
                },
                "llm": {
                    "vendor": "openai",
                    "params": {
                        "model": "gpt-4.1-mini",
                        "resource_id": "24731f4ef93e4d33a85a4c4088633bcb"
                    },
                    "system_messages": [
                        {
                            "role": "system",
                            "content": cls._build_voice_agent_system_prompt()
                        }
                    ],

                    "greeting_message": "Hi! Welcome to Hyundai. I'm your AI Sales Executive. How can I help you find your perfect Hyundai today?",
                    "failure_message": "Please hold on a second."
                },
                "tts": {
                    "vendor": "minimax",
                    "params": {
                        "model": "speech-2.8-turbo",
                        "resource_id": "155b2afcadce4c93a85231c74e2e71d6",
                        "voice_setting": {
                            "voice_id": "English_radiant_girl"
                        }
                    }
                },
                "mllm": {
                    "enable": False,
                    "params": {
                        "model": "gpt-realtime",
                        "voice": "coral",
                        "instructions": "You are a helpful chatbot",
                        "input_audio_transcription": {
                            "model": "gpt-4o-mini-transcribe",
                            "language": "en"
                        }
                    },
                    "vendor": "openai",
                    "turn_detection": {
                        "mode": "server_vad",
                        "server_vad_config": {
                            "threshold": 0.5,
                            "prefix_padding_ms": 800,
                            "silence_duration_ms": 640
                        }
                    },
                    "greeting_message": "Hello, how are you?",
                    "input_modalities": ["audio", "text"],
                    "output_modalities": ["text", "audio"]
                }
            }
        }

        try:
            response = httpx.post(url, headers=headers, json=body, timeout=30.0)
            response.raise_for_status()
            data = response.json()

            agent_id = data.get("agent_id") or data.get("id") or data.get("agentId", "")
            print(f"[AgoraService] Conversational AI agent started: agent_id={agent_id}, channel={channel_name}")

            return {
                "status": "active",
                "agent_id": agent_id,
                "channel_name": channel_name,
                "session_id": session_id,
                "agent_uid": agent_uid,
                "raw_response": data,
            }

        except httpx.HTTPStatusError as e:
            error_body = ""
            try:
                error_body = e.response.text
            except Exception:
                pass
            print(f"[AgoraService] Conversational AI agent start failed: {e.response.status_code} — {error_body}")
            return {
                "status": "error",
                "channel_name": channel_name,
                "session_id": session_id,
                "error": f"HTTP {e.response.status_code}: {error_body}",
            }
        except Exception as e:
            print(f"[AgoraService] Conversational AI agent start exception: {e}")
            return {
                "status": "error",
                "channel_name": channel_name,
                "session_id": session_id,
                "error": str(e),
            }

    @classmethod
    def stop_conversational_ai_agent(cls, agent_id: str) -> Dict[str, Any]:
        """
        Stops a running Agora Conversational AI Agent.

        Calls:
          POST https://api.agora.io/api/conversational-ai-agent/v2/projects/{appId}/agents/{agentId}/leave
        """
        if not agent_id:
            return {"status": "error", "error": "agent_id is required"}

        if not cls.is_conversational_ai_configured():
            return {"status": "not_configured", "agent_id": agent_id}

        app_id = getattr(settings, "AGORA_APP_ID", "")
        url = f"{AGORA_CONVO_AI_BASE}/{app_id}/agents/{agent_id}/leave"

        headers = {
            "Authorization": cls._get_basic_auth_header(),
            "Content-Type": "application/json",
        }

        try:
            response = httpx.post(url, headers=headers, timeout=15.0)
            response.raise_for_status()
            print(f"[AgoraService] Conversational AI agent stopped: agent_id={agent_id}")
            return {"status": "stopped", "agent_id": agent_id}
        except httpx.HTTPStatusError as e:
            error_body = ""
            try:
                error_body = e.response.text
            except Exception:
                pass
            print(f"[AgoraService] Agent stop failed: {e.response.status_code} — {error_body}")
            return {
                "status": "error",
                "agent_id": agent_id,
                "error": f"HTTP {e.response.status_code}: {error_body}",
            }
        except Exception as e:
            print(f"[AgoraService] Agent stop exception: {e}")
            return {"status": "error", "agent_id": agent_id, "error": str(e)}
