"""
core/config.py
Configuración centralizada usando Pydantic Settings.
Lee variables de entorno desde .env automáticamente.
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import os


class Settings(BaseSettings):
    # ── Base de datos interna ──────────────────────────────────
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = ""
    MYSQL_DB: str = "datagenerator_db"

    # ── JWT ────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "secret_key_change_me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24 horas

    # ── OAuth ──────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    MICROSOFT_CLIENT_ID: str = ""
    MICROSOFT_CLIENT_SECRET: str = ""
    MICROSOFT_TENANT_ID: str = "common"

    # ── Superadmin inicial ─────────────────────────────────────
    SUPERADMIN_EMAIL: str = "admin@sistema.com"
    SUPERADMIN_PASSWORD: str = "Admin123!"
    SUPERADMIN_NOMBRE: str = "Super"
    SUPERADMIN_APELLIDO: str = "Admin"

    # ── Frontend / CORS ────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:3000"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8000"

    # ── Faker ──────────────────────────────────────────────────
    FAKER_LOCALE: str = "es_ES"

    # ── Archivos temporales ────────────────────────────────────
    TEMP_DIR: str = "./tmp_exports"

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}"
            f"@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DB}"
        )

    @property
    def CORS_ORIGINS(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


# Instancia global
settings = Settings()

# Crear directorio temporal si no existe
os.makedirs(settings.TEMP_DIR, exist_ok=True)
