try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic.v1 import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "AI Showroom Sales Executive"
    DEBUG: bool = False
    DATABASE_URL: str = "sqlite:///./showroom.db"
    SECRET_KEY: str = "changeme_use_a_long_random_string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    LLM_PROVIDER: str = "mock"
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    AGORA_APP_ID: str = "5d246d9f099648f2a247015227855219"
    AGORA_APP_CERTIFICATE: str = "060bc5b6dded477ea9e9c69fd682dc25"
    AGORA_CHANNEL_PREFIX: str = "hyundai"
    MOCK_VOICE: bool = False

    class Config:
        env_file = ".env"

settings = Settings()
