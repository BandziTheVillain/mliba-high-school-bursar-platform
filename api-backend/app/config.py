from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ADMIN_USERNAME: str
    ADMIN_PASSWORD: str
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    JWT_ACCESS_COOKIE_NAME: str = "jwt-access-token"
    ACCESS_TOKEN_MAX_AGE: int = 60 * 60 * 12  # seconds; used for both JWT exp and cookie max_age
    COOKIE_SECURE: bool = False  # set True in production (HTTPS)
    FRONTEND_URL: Optional[str] = None  # shown as a link on the API index page when set

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

Config = Settings()
base_dir = Path(__file__).resolve().parent
static_folder = Path.joinpath(base_dir, "static")
