"""
auth/dependencies.py
Dependencias FastAPI para autenticación y autorización por rol.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.auth.jwt_handler import decode_token
from backend.models.models import Usuario, Sesion, RolEnum
from datetime import datetime, timezone
from typing import Optional

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> Usuario:
    """
    Dependencia que extrae y valida el usuario desde el Bearer token JWT.
    Lanza 401 si el token es inválido o la sesión está inactiva.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticación requerido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token malformado",
        )

    # Verificar que la sesión sigue activa en la BD
    sesion = db.query(Sesion).filter(
        Sesion.usuario_id == int(user_id),
        Sesion.activa == True,
        Sesion.expires_at > datetime.now(timezone.utc)
    ).first()

    if sesion is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión expirada o inactiva",
        )

    usuario = db.query(Usuario).filter(
        Usuario.id == int(user_id),
        Usuario.activo == True
    ).first()

    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o bloqueado",
        )

    return usuario


def require_superadmin(
    current_user: Usuario = Depends(get_current_user)
) -> Usuario:
    """
    Dependencia que exige rol superadmin.
    Lanza 403 si el usuario no tiene permisos suficientes.
    """
    if current_user.rol != RolEnum.superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido: se requiere rol superadmin",
        )
    return current_user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> Optional[Usuario]:
    """
    Dependencia opcional: retorna el usuario si hay token válido, None si no.
    Útil para endpoints públicos que muestran datos extra si hay sesión.
    """
    if credentials is None:
        return None
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None
