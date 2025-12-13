from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "SIG - Sistema Integrado de Gestão"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    
    # Database (PostgreSQL SIG - Leitura e Escrita)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/sig_db"
    
    # CORPORERM (SQL Server - Somente Leitura)
    CORPORERM_HOST: str = "172.22.0.19"
    CORPORERM_PORT: int = 1433
    CORPORERM_DATABASE: str = "CORPORERM"
    CORPORERM_USER: str = "ricardo.pimenta"
    CORPORERM_PASSWORD: str = "Senha@2024"
    CORPORERM_CODCOLIGADA: int = 1
    
    # JWT Authentication
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Superadmin (created on first run)
    SUPERADMIN_EMAIL: str = "admin@sig.com"
    SUPERADMIN_PASSWORD: str = "admin123"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

