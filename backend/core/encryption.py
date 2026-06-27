"""
core/encryption.py
Utilidades de cifrado simétrico (Fernet) para contraseñas de conexiones guardadas.
"""
import base64
import hashlib
from cryptography.fernet import Fernet
from backend.core.config import settings


def _get_fernet() -> Fernet:
    """Deriva una clave Fernet de 32 bytes desde el JWT_SECRET_KEY."""
    key_bytes = settings.JWT_SECRET_KEY.encode("utf-8")
    # SHA-256 siempre produce 32 bytes, perfecto para Fernet (necesita 32 bytes en base64-url)
    digest = hashlib.sha256(key_bytes).digest()
    fernet_key = base64.urlsafe_b64encode(digest)
    return Fernet(fernet_key)


def encrypt_password(plain: str) -> str:
    """Cifra una contraseña en texto plano y devuelve el token Fernet como string."""
    f = _get_fernet()
    return f.encrypt(plain.encode("utf-8")).decode("utf-8")


def decrypt_password(token: str) -> str:
    """Descifra un token Fernet y devuelve la contraseña original."""
    f = _get_fernet()
    return f.decrypt(token.encode("utf-8")).decode("utf-8")
