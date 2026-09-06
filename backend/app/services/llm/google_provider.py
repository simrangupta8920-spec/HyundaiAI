"""
google_provider.py
Gemini LLM provider stub.
Set LLM_PROVIDER=gemini and GEMINI_API_KEY in .env to activate.
"""
from __future__ import annotations
import json
import re
from typing import List, Dict

from app.services.llm.base import BaseLLMProvider, SYSTEM_PROMPT_TEMPLATE
from app.schemas.customer_state import CustomerState, ChatResult
from app.core.config import settings


class GeminiProvider(BaseLLMProvider):
    """
    Google Gemini provider.
    Requires: pip install google-generativeai
    Set GEMINI_API_KEY in .env
    """

    def __init__(self):
        if not settings.GEMINI_API_KEY:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Add it to backend/.env to use the Gemini provider."
            )
        try:
            import google.generativeai as genai  # type: ignore
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self._model = genai.GenerativeModel("gemini-1.5-flash")
        except ImportError:
            raise RuntimeError(
                "google-generativeai is not installed. Run: pip install google-generativeai"
            )

    def chat(
        self,
        messages: List[Dict[str, str]],
        customer_state: CustomerState,
        showroom_id: str,
    ) -> ChatResult:
        from app.services.conversation_engine import build_vehicle_context, build_customer_context_summary

        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
            vehicle_context=build_vehicle_context(customer_state),
            customer_context=build_customer_context_summary(customer_state),
        )

        # Build Gemini history (user/model turns)
        history = []
        for m in messages[:-1]:
            role = "user" if m["role"] == "user" else "model"
            history.append({"role": role, "parts": [m["content"]]})

        chat = self._model.start_chat(history=history)
        last_user_msg = messages[-1]["content"] if messages else ""
        full_prompt = f"{system_prompt}\n\nCustomer: {last_user_msg}"
        response = chat.send_message(full_prompt)
        raw = response.text

        return _parse_llm_response(raw, customer_state)

    def get_provider_name(self) -> str:
        return "gemini"


def _parse_llm_response(raw: str, current_state: CustomerState) -> ChatResult:
    """Parse the LLM response format: natural reply + STATE_UPDATE: {...}"""
    from app.services.llm.mock_provider import extract_state_updates

    # Split on STATE_UPDATE marker
    parts = re.split(r'\n\s*STATE_UPDATE:\s*', raw, maxsplit=1)
    reply = parts[0].strip()

    updated_state = current_state.model_copy(deep=True)
    if len(parts) == 2:
        try:
            delta = json.loads(parts[1].strip())
            # Apply delta fields
            for k, v in delta.items():
                if k == "objections_add" and v:
                    if v not in updated_state.objections:
                        updated_state.objections.append(v)
                elif hasattr(updated_state, k) and v is not None:
                    setattr(updated_state, k, v)
        except (json.JSONDecodeError, ValueError):
            pass

    return ChatResult(
        reply=reply,
        customer_state=updated_state,
        should_escalate=updated_state.escalation_requested or updated_state.negotiation_requested,
        should_collect_lead=updated_state.known_fields_count() >= 3,
    )