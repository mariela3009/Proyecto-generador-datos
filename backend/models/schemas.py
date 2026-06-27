"""
models/schemas.py
Schemas Pydantic para request/response de todos los endpoints.
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Any, Dict
from datetime import datetime
from enum import Enum


# ─────────────────────────────────────────────────────────────
# ENUMS
# ─────────────────────────────────────────────────────────────
class RolEnum(str, Enum):
    superadmin = "superadmin"
    usuario = "usuario"


class MetodoLoginEnum(str, Enum):
    email = "email"
    google = "google"
    github = "github"
    microsoft = "microsoft"


class MotorBDEnum(str, Enum):
    mysql = "mysql"
    postgresql = "postgresql"
    sqlserver = "sqlserver"
    mongodb = "mongodb"
    cassandra = "cassandra"
    neo4j = "neo4j"


# ─────────────────────────────────────────────────────────────
# AUTH SCHEMAS
# ─────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    apellido: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError("La contraseña debe tener al menos una mayúscula")
        if not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe tener al menos un número")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class OAuthCallbackRequest(BaseModel):
    provider: MetodoLoginEnum
    access_token: str
    email: EmailStr
    nombre: str
    apellido: str
    avatar_url: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UsuarioResponse"


# ─────────────────────────────────────────────────────────────
# USUARIO SCHEMAS
# ─────────────────────────────────────────────────────────────
class UsuarioResponse(BaseModel):
    id: int
    nombre: str
    apellido: str
    email: str
    rol: RolEnum
    activo: bool
    avatar_url: Optional[str] = None
    created_at: datetime
    ultimo_acceso: Optional[datetime] = None

    class Config:
        from_attributes = True


class UsuarioAdminResponse(UsuarioResponse):
    ultima_ip: Optional[str] = None
    updated_at: Optional[datetime] = None
    sesiones_activas: int = 0


class BlockUserRequest(BaseModel):
    activo: bool


# ─────────────────────────────────────────────────────────────
# SESION SCHEMAS
# ─────────────────────────────────────────────────────────────
class SesionResponse(BaseModel):
    id: int
    usuario_id: int
    ip_address: Optional[str] = None
    metodo_login: MetodoLoginEnum
    activa: bool
    created_at: datetime
    expires_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────
# LOG SCHEMAS
# ─────────────────────────────────────────────────────────────
class LogResponse(BaseModel):
    id: int
    usuario_id: Optional[int] = None
    accion: str
    detalle: Optional[str] = None
    ip_address: Optional[str] = None
    nivel: str
    created_at: datetime
    usuario_nombre: Optional[str] = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────
# CONEXION SCHEMAS
# ─────────────────────────────────────────────────────────────
class ConexionRequest(BaseModel):
    host: str = Field(..., min_length=1)
    puerto: int = Field(..., ge=1, le=65535)
    usuario: str
    password: str
    nombre_bd: str
    motor: Optional[MotorBDEnum] = None  # Auto-detectado si no se proporciona


class ConexionResponse(BaseModel):
    id: int
    motor_bd: str
    host: str
    puerto: int
    nombre_bd: str
    registros_generados: int
    registros_insertados: int
    created_at: datetime

    class Config:
        from_attributes = True


class ConexionGuardadaResponse(BaseModel):
    """Conexión guardada con credenciales (contraseña ya descifrada) para pre-rellenar el formulario."""
    id: int
    nombre_alias: Optional[str] = None
    motor_bd: str
    host: str
    puerto: int
    nombre_bd: str
    usuario_db: Optional[str] = None
    password_db: Optional[str] = None   # devuelta descifrada solo al usuario dueño
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────
# SCHEMA BD EXTERNA
# ─────────────────────────────────────────────────────────────
class ColumnSchema(BaseModel):
    name: str
    data_type: str
    is_nullable: bool = True
    is_primary_key: bool = False
    is_unique: bool = False
    default_value: Optional[str] = None
    foreign_key: Optional[Dict[str, str]] = None  # {"table": "...", "column": "..."}
    max_length: Optional[int] = None


class TableSchema(BaseModel):
    name: str
    columns: List[ColumnSchema]
    primary_keys: List[str] = []
    foreign_keys: List[Dict[str, Any]] = []


class DatabaseSchema(BaseModel):
    motor: str
    database_name: str
    tables: List[TableSchema]


# ─────────────────────────────────────────────────────────────
# GENERACIÓN DE DATOS
# ─────────────────────────────────────────────────────────────
class TableGenerationConfig(BaseModel):
    table_name: str
    record_count: int = Field(..., ge=1, le=100000)
    selected: bool = True


class GenerateRequest(BaseModel):
    schema: DatabaseSchema
    table_configs: List[TableGenerationConfig]
    locale: Optional[str] = "es_ES"


class GeneratePreviewRequest(BaseModel):
    schema: DatabaseSchema
    table_configs: List[TableGenerationConfig]
    preview_rows: int = Field(default=10, ge=1, le=100)
    locale: Optional[str] = "es_ES"


class GeneratedDataResponse(BaseModel):
    table_name: str
    columns: List[str]
    rows: List[List[Any]]
    total_rows: int


class ExportRequest(BaseModel):
    schema: DatabaseSchema
    table_configs: List[TableGenerationConfig]
    format: str = Field(..., pattern="^(sql|csv|json)$")
    locale: Optional[str] = "es_ES"


class ExportResponse(BaseModel):
    file_id: str
    filename: str
    format: str
    download_url: str
    total_records: int


# ─────────────────────────────────────────────────────────────
# INSERCIÓN DIRECTA
# ─────────────────────────────────────────────────────────────
class InsertRequest(BaseModel):
    connection: ConexionRequest
    schema: DatabaseSchema
    table_configs: List[TableGenerationConfig]
    locale: Optional[str] = "es_ES"


class InsertResponse(BaseModel):
    success: bool
    tables_processed: int
    total_inserted: int
    total_errors: int
    logs: List[str]


# ─────────────────────────────────────────────────────────────
# PARSER SQL
# ─────────────────────────────────────────────────────────────
class ParseSQLRequest(BaseModel):
    sql_content: str


class ParseSQLResponse(BaseModel):
    success: bool
    schema: Optional[DatabaseSchema] = None
    warnings: List[str] = []
    error: Optional[str] = None


# ─────────────────────────────────────────────────────────────
# COMENTARIOS
# ─────────────────────────────────────────────────────────────
class ComentarioCreate(BaseModel):
    contenido: str = Field(..., min_length=1, max_length=500)
    calificacion: Optional[int] = Field(None, ge=1, le=5)


class ComentarioUpdate(BaseModel):
    contenido: Optional[str] = Field(None, min_length=1, max_length=500)
    calificacion: Optional[int] = Field(None, ge=1, le=5)


class ComentarioResponse(BaseModel):
    id: int
    usuario_id: int
    contenido: str
    calificacion: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    usuario_nombre: str
    usuario_apellido: str
    usuario_avatar: Optional[str] = None

    class Config:
        from_attributes = True


class PaginatedComentarios(BaseModel):
    items: List[ComentarioResponse]
    total: int
    page: int
    per_page: int
    pages: int


# ─────────────────────────────────────────────────────────────
# ADMIN STATS
# ─────────────────────────────────────────────────────────────
class LoginStatPoint(BaseModel):
    fecha: str
    cantidad: int


class EngineStatPoint(BaseModel):
    motor: str
    cantidad: int


class AdminStatsResponse(BaseModel):
    total_usuarios: int
    usuarios_activos: int
    total_registros_generados: int
    total_registros_insertados: int
    logins_hoy: int


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    per_page: int
    pages: int


# Actualizar referencias forward
TokenResponse.model_rebuild()
