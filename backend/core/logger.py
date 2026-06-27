"""
core/logger.py
Registro de acciones del sistema en la tabla logs.
"""
from sqlalchemy.orm import Session
from backend.models.models import Log
from typing import Optional


def log_action(
    db: Session,
    accion: str,
    detalle: Optional[str] = None,
    usuario_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    nivel: str = "INFO"
):
    """Registra una acción en la tabla logs del sistema."""
    entry = Log(
        usuario_id=usuario_id,
        accion=accion,
        detalle=detalle,
        ip_address=ip_address,
        nivel=nivel
    )
    db.add(entry)
    db.commit()
