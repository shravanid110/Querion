import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PORT: int = 4000
    DATABASE_URL: str = "sqlite:///./querion.db"
    ENCRYPTION_KEY: str = "default-secret-key-change-me"
    LLM_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    GROK_API_KEY: str = ""
    LLM_BASE_URL: str = "https://openrouter.ai/api/v1"

    class Config:
        env_file = ".env"

settings = Settings()
