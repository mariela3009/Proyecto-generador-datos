"""
auth/jwt_handler.py
Creación, decodificación y validación de tokens JWT con python-jose.
"""
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from backend.core.config import settings


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> tuple[str, datetime]:
    """
    Crea un JWT con los datos proporcionados.
    Retorna (token_string, expires_at).
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    )
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    })
    token = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    return token, expire


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodifica y valida un JWT.
    Retorna el payload si es válido, None si está expirado o es inválido.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def get_user_id_from_token(token: str) -> Optional[int]:
    """Extrae el user_id del payload del JWT."""
    payload = decode_token(token)
    if payload is None:
        return None
    return payload.get("sub")


def get_user_role_from_token(token: str) -> Optional[str]:
    """Extrae el rol del usuario del payload del JWT."""
    payload = decode_token(token)
    if payload is None:
        return None
    return payload.get("rol")
