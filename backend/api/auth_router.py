"""
api/auth_router.py
Endpoints de autenticación: registro, login, OAuth callback, logout, perfil.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from backend.core.database import get_db
from backend.core.config import settings
from backend.core.logger import log_action
from backend.models.models import Usuario, Sesion, RolEnum, MetodoLoginEnum
from backend.models.schemas import (
    RegisterRequest, LoginRequest, OAuthCallbackRequest,
    TokenResponse, UsuarioResponse
)
from backend.auth.password import hash_password, verify_password
from backend.auth.jwt_handler import create_access_token
from backend.auth.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Autenticación"])


def _get_client_ip(request: Request) -> str:
    """Extrae la IP real del cliente, considerando proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _create_session(
    db: Session,
    usuario: Usuario,
    metodo: MetodoLoginEnum,
    ip: str
) -> str:
    """Crea sesión en BD y retorna el token JWT."""
    expires_delta = timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    token, expires_at = create_access_token(
        data={"sub": str(usuario.id), "rol": usuario.rol.value},
        expires_delta=expires_delta
    )

    # Invalidar sesiones previas del mismo usuario
    db.query(Sesion).filter(
        Sesion.usuario_id == usuario.id,
        Sesion.activa == True
    ).update({"activa": False})

    # Crear nueva sesión
    sesion = Sesion(
        usuario_id=usuario.id,
        token_jwt=token,
        ip_address=ip,
        metodo_login=metodo,
        activa=True,
        expires_at=expires_at
    )
    db.add(sesion)

    # Actualizar último acceso
    usuario.ultimo_acceso = datetime.now(timezone.utc)
    usuario.ultima_ip = ip
    db.commit()

    return token, expires_at


# ─────────────────────────────────────────────────────────────
# REGISTRO
# ─────────────────────────────────────────────────────────────
@router.post("/register", response_model=TokenResponse, status_code=201)
def register(
    body: RegisterRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Registra un nuevo usuario con email y contraseña."""
    existing = db.query(Usuario).filter(Usuario.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El correo electrónico ya está registrado"
        )

    usuario = Usuario(
        nombre=body.nombre,
        apellido=body.apellido,
        email=body.email,
        password_hash=hash_password(body.password),
        rol=RolEnum.usuario,
        activo=True
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    ip = _get_client_ip(request)
    token, expires_at = _create_session(db, usuario, MetodoLoginEnum.email, ip)

    log_action(db, "REGISTRO", f"Nuevo usuario: {usuario.email}", usuario.id, ip)

    return TokenResponse(
        access_token=token,
        expires_in=settings.JWT_EXPIRE_MINUTES * 60,
        user=UsuarioResponse.model_validate(usuario)
    )


# ─────────────────────────────────────────────────────────────
# LOGIN TRADICIONAL
# ─────────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
def login(
    body: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Login con email y contraseña."""
    usuario = db.query(Usuario).filter(Usuario.email == body.email).first()
    ip = _get_client_ip(request)

    if not usuario or not usuario.password_hash:
        log_action(db, "LOGIN_FALLIDO", f"Email no encontrado: {body.email}", ip_address=ip, nivel="WARNING")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas"
        )

    if not verify_password(body.password, usuario.password_hash):
        log_action(db, "LOGIN_FALLIDO", f"Contraseña incorrecta: {body.email}", usuario.id, ip, nivel="WARNING")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas"
        )

    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario bloqueado. Contacte al administrador."
        )

    token, expires_at = _create_session(db, usuario, MetodoLoginEnum.email, ip)
    log_action(db, "LOGIN", f"Login exitoso por email: {usuario.email}", usuario.id, ip)

    return TokenResponse(
        access_token=token,
        expires_in=settings.JWT_EXPIRE_MINUTES * 60,
        user=UsuarioResponse.model_validate(usuario)
    )


# ─────────────────────────────────────────────────────────────
# OAUTH CALLBACK (llamado por el frontend NextAuth)
# ─────────────────────────────────────────────────────────────
@router.post("/oauth/callback", response_model=TokenResponse)
def oauth_callback(
    body: OAuthCallbackRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Recibe datos de un proveedor OAuth desde el frontend (NextAuth).
    Crea el usuario si no existe, o inicia sesión si ya existe.
    """
    ip = _get_client_ip(request)

    # Buscar usuario existente
    usuario = db.query(Usuario).filter(Usuario.email == body.email).first()

    if usuario is None:
        # Crear nuevo usuario OAuth
        nombres = body.nombre.split(" ", 1)
        usuario = Usuario(
            nombre=nombres[0],
            apellido=nombres[1] if len(nombres) > 1 else body.apellido,
            email=body.email,
            password_hash=None,  # Sin contraseña para usuarios OAuth
            rol=RolEnum.usuario,
            activo=True,
            avatar_url=body.avatar_url
        )
        db.add(usuario)
        db.commit()
        db.refresh(usuario)
        log_action(db, "REGISTRO_OAUTH", f"Nuevo usuario via {body.provider}: {body.email}", usuario.id, ip)

    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario bloqueado"
        )

    metodo = MetodoLoginEnum(body.provider.value)
    token, expires_at = _create_session(db, usuario, metodo, ip)
    log_action(db, "LOGIN_OAUTH", f"Login via {body.provider}: {body.email}", usuario.id, ip)

    return TokenResponse(
        access_token=token,
        expires_in=settings.JWT_EXPIRE_MINUTES * 60,
        user=UsuarioResponse.model_validate(usuario)
    )


# ─────────────────────────────────────────────────────────────
# LOGOUT
# ─────────────────────────────────────────────────────────────
@router.post("/logout")
def logout(
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Invalida todas las sesiones activas del usuario."""
    db.query(Sesion).filter(
        Sesion.usuario_id == current_user.id,
        Sesion.activa == True
    ).update({"activa": False})
    db.commit()

    ip = _get_client_ip(request)
    log_action(db, "LOGOUT", f"Logout: {current_user.email}", current_user.id, ip)

    return {"message": "Sesión cerrada correctamente"}


# ─────────────────────────────────────────────────────────────
# PERFIL ACTUAL
# ─────────────────────────────────────────────────────────────
@router.get("/me", response_model=UsuarioResponse)
def get_me(current_user: Usuario = Depends(get_current_user)):
    """Retorna el perfil del usuario autenticado."""
    return UsuarioResponse.model_validate(current_user)
