"""
core/database.py
Engine SQLAlchemy y sesiones para la base de datos interna MySQL.
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from backend.core.config import settings

# Motor de conexión
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,       # Verifica conexión antes de usarla
    pool_recycle=3600,        # Recicla conexiones cada hora
    echo=False,               # True para debug de SQL
)

# Fábrica de sesiones
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para todos los modelos ORM
Base = declarative_base()


def get_db():
    """
    Dependencia FastAPI para obtener sesión de base de datos.
    Garantiza el cierre de la sesión al finalizar la request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
