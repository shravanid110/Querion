import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PORT: int = 4000
    DATABASE_URL: str = "sqlite:///./querion.db"
    ENCRYPTION_KEY: str = "default-secret-key-change-me"
    LLM_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    GROK_API_KEY: str = ""
    VOICE_API_KEY: str = ""
    LLM_BASE_URL: str = "https://openrouter.ai/api/v1"
    
    # AI / Ollama Settings
    OLLAMA_API_URL: str = "http://localhost:11434/api/generate"
    OLLAMA_MODEL: str = "deepseek-coder"
    
    # SMTP Settings
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASS: str = os.getenv("SMTP_PASS", "")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
