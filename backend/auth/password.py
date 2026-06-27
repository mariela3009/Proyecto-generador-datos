"""
auth/password.py
Funciones de hashing y verificación de contraseñas con bcrypt.
"""
import bcrypt

def hash_password(plain_password: str) -> str:
    """Genera el hash bcrypt de una contraseña en texto plano."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(plain_password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica que una contraseña en texto plano coincida con su hash."""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'), 
        hashed_password.encode('utf-8')
    )
