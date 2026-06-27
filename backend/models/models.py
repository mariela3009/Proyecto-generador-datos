"""
models/models.py
Modelos ORM SQLAlchemy para la base de datos interna del sistema.
"""
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean,
    ForeignKey, Enum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.core.database import Base
import enum


class RolEnum(str, enum.Enum):
    superadmin = "superadmin"
    usuario = "usuario"


class MetodoLoginEnum(str, enum.Enum):
    email = "email"
    google = "google"
    github = "github"
    microsoft = "microsoft"


# ─────────────────────────────────────────────────────────────
# USUARIOS
# ─────────────────────────────────────────────────────────────
class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)   # Null para OAuth puro
    rol = Column(Enum(RolEnum), nullable=False, default=RolEnum.usuario)
    activo = Column(Boolean, nullable=False, default=True)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    ultimo_acceso = Column(DateTime, nullable=True)
    ultima_ip = Column(String(45), nullable=True)

    # Relaciones
    sesiones = relationship("Sesion", back_populates="usuario", cascade="all, delete-orphan")
    logs = relationship("Log", back_populates="usuario", cascade="all, delete-orphan")
    conexiones = relationship("Conexion", back_populates="usuario", cascade="all, delete-orphan")
    comentarios = relationship("Comentario", back_populates="usuario", cascade="all, delete-orphan")


# ─────────────────────────────────────────────────────────────
# SESIONES
# ─────────────────────────────────────────────────────────────
class Sesion(Base):
    __tablename__ = "sesiones"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    token_jwt = Column(Text, nullable=False)
    ip_address = Column(String(45), nullable=True)
    metodo_login = Column(Enum(MetodoLoginEnum), nullable=False, default=MetodoLoginEnum.email)
    activa = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=False)

    usuario = relationship("Usuario", back_populates="sesiones")


# ─────────────────────────────────────────────────────────────
# LOGS DEL SISTEMA
# ─────────────────────────────────────────────────────────────
class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    accion = Column(String(100), nullable=False)
    detalle = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    nivel = Column(String(20), nullable=False, default="INFO")   # INFO, WARNING, ERROR
    created_at = Column(DateTime, server_default=func.now())

    usuario = relationship("Usuario", back_populates="logs")


# ─────────────────────────────────────────────────────────────
# CONEXIONES (historial de conexiones a BD externas)
# ─────────────────────────────────────────────────────────────
class Conexion(Base):
    __tablename__ = "conexiones"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    nombre_alias = Column(String(100), nullable=True)       # Nombre amigable para la conexión
    motor_bd = Column(String(50), nullable=False)           # mysql, postgresql, mongodb, etc.
    host = Column(String(255), nullable=False)
    puerto = Column(Integer, nullable=False)
    nombre_bd = Column(String(255), nullable=False)
    usuario_db = Column(String(255), nullable=True)         # Usuario de la BD externa
    password_db = Column(Text, nullable=True)               # Contraseña cifrada con Fernet
    registros_generados = Column(Integer, nullable=False, default=0)
    registros_insertados = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now())

    usuario = relationship("Usuario", back_populates="conexiones")


# ─────────────────────────────────────────────────────────────
# COMENTARIOS
# ─────────────────────────────────────────────────────────────
class Comentario(Base):
    __tablename__ = "comentarios"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    contenido = Column(String(500), nullable=False)
    calificacion = Column(Integer, nullable=True)   # 1-5, opcional
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    usuario = relationship("Usuario", back_populates="comentarios")
