"""
openai_provider.py
OpenAI (ChatGPT) provider stub.
Set LLM_PROVIDER=openai and OPENAI_API_KEY in .env to activate.
"""
from __future__ import annotations
import json
import re
from typing import List, Dict

from app.services.llm.base import BaseLLMProvider, SYSTEM_PROMPT_TEMPLATE
from app.schemas.customer_state import CustomerState, ChatResult
from app.core.config import settings


class OpenAIProvider(BaseLLMProvider):
    """
    OpenAI ChatCompletion provider.
    Requires: pip install openai
    Set OPENAI_API_KEY in .env
    """

    def __init__(self):
        if not settings.OPENAI_API_KEY:
            raise RuntimeError(
                "OPENAI_API_KEY is not set. Add it to backend/.env to use the OpenAI provider."
            )
        try:
            from openai import OpenAI  # type: ignore
            self._client = OpenAI(api_key=settings.OPENAI_API_KEY)
        except ImportError:
            raise RuntimeError(
                "openai is not installed. Run: pip install openai"
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

        openai_msgs = [{"role": "system", "content": system_prompt}] + messages
        response = self._client.chat.completions.create(
            model="gpt-4o-mini",
            messages=openai_msgs,
            temperature=0.7,
            max_tokens=600,
        )
        raw = response.choices[0].message.content or ""
        return _parse_llm_response(raw, customer_state)

    def get_provider_name(self) -> str:
        return "openai"


def _parse_llm_response(raw: str, current_state: CustomerState) -> ChatResult:
    parts = re.split(r'\n\s*STATE_UPDATE:\s*', raw, maxsplit=1)
    reply = parts[0].strip()

    updated_state = current_state.model_copy(deep=True)
    if len(parts) == 2:
        try:
            delta = json.loads(parts[1].strip())
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