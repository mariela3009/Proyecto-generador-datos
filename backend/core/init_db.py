"""
core/init_db.py
Inicializa las tablas y crea el superadmin por defecto.
Ejecutar una sola vez: python -m backend.core.init_db
"""
from backend.core.database import engine, Base, SessionLocal
from backend.models.models import Usuario, RolEnum
from backend.auth.password import hash_password
from backend.core.config import settings
from sqlalchemy.orm import Session
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_tables():
    """Crea todas las tablas en la base de datos interna."""
    logger.info("Creando tablas en la base de datos...")
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Tablas creadas correctamente.")


def create_superadmin(db: Session):
    """Crea el superadmin inicial si no existe."""
    existing = db.query(Usuario).filter(
        Usuario.email == settings.SUPERADMIN_EMAIL
    ).first()

    if existing:
        logger.info(f"ℹ️  Superadmin ya existe: {settings.SUPERADMIN_EMAIL}")
        return

    superadmin = Usuario(
        nombre=settings.SUPERADMIN_NOMBRE,
        apellido=settings.SUPERADMIN_APELLIDO,
        email=settings.SUPERADMIN_EMAIL,
        password_hash=hash_password(settings.SUPERADMIN_PASSWORD),
        rol=RolEnum.superadmin,
        activo=True,
    )
    db.add(superadmin)
    db.commit()
    logger.info(f"✅ Superadmin creado: {settings.SUPERADMIN_EMAIL}")


def init():
    create_tables()
    db = SessionLocal()
    try:
        create_superadmin(db)
    finally:
        db.close()


if __name__ == "__main__":
    init()
