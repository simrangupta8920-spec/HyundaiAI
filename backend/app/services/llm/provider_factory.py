"""
provider_factory.py
Returns the configured LLM provider singleton.
Switch via LLM_PROVIDER env var: mock | gemini | openai
"""
from app.core.config import settings
from app.services.llm.base import BaseLLMProvider
from app.services.llm.mock_provider import MockLLMProvider

_provider: BaseLLMProvider | None = None


def get_llm_provider() -> BaseLLMProvider:
    global _provider
    if _provider is None:
        name = settings.LLM_PROVIDER.lower().strip()
        if name == "gemini":
            from app.services.llm.google_provider import GeminiProvider
            _provider = GeminiProvider()
        elif name in ("openai", "gpt"):
            from app.services.llm.openai_provider import OpenAIProvider
            _provider = OpenAIProvider()
        else:
            # Default: mock structured provider
            _provider = MockLLMProvider()
    return _provider


def reset_provider() -> None:
    """Force re-initialisation (useful in tests)."""
    global _provider
    _provider = None