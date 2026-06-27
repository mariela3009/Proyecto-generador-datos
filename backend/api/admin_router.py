"""
api/admin_router.py
Endpoints exclusivos para el superadmin: gestión de usuarios, estadísticas, logs y comentarios.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from backend.core.database import get_db
from backend.core.logger import log_action
from backend.models.models import Usuario, Sesion, Log, Conexion, Comentario
from backend.models.schemas import (
    UsuarioAdminResponse, BlockUserRequest, LogResponse,
    LoginStatPoint, EngineStatPoint, AdminStatsResponse,
    ComentarioResponse
)
from backend.auth.dependencies import require_superadmin

router = APIRouter(prefix="/admin", tags=["Superadmin"])


# ─────────────────────────────────────────────────────────────
# GESTIÓN DE USUARIOS
# ─────────────────────────────────────────────────────────────
@router.get("/users", response_model=dict)
def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_superadmin)
):
    """Lista paginada de todos los usuarios con metadatos."""
    query = db.query(Usuario)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Usuario.email.like(search_term)) |
            (Usuario.nombre.like(search_term)) |
            (Usuario.apellido.like(search_term))
        )

    total = query.count()
    usuarios = query.order_by(desc(Usuario.created_at)) \
                    .offset((page - 1) * per_page).limit(per_page).all()

    # Contar sesiones activas por usuario
    now = datetime.now(timezone.utc)
    result = []
    for u in usuarios:
        sesiones_activas = db.query(Sesion).filter(
            Sesion.usuario_id == u.id,
            Sesion.activa == True,
            Sesion.expires_at > now
        ).count()

        data = UsuarioAdminResponse.model_validate(u)
        data.sesiones_activas = sesiones_activas
        result.append(data)

    return {
        "items": [r.model_dump() for r in result],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page
    }


@router.get("/users/active")
def get_active_users(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_superadmin)
):
    """Retorna usuarios con sesiones activas en este momento."""
    now = datetime.now(timezone.utc)
    sesiones = db.query(Sesion).filter(
        Sesion.activa == True,
        Sesion.expires_at > now
    ).all()

    user_ids = list(set(s.usuario_id for s in sesiones))
    usuarios = db.query(Usuario).filter(Usuario.id.in_(user_ids)).all()

    return {
        "total_activos": len(usuarios),
        "usuarios": [
            {
                "id": u.id,
                "nombre": u.nombre,
                "apellido": u.apellido,
                "email": u.email,
                "ultima_ip": u.ultima_ip,
                "ultimo_acceso": u.ultimo_acceso
            }
            for u in usuarios
        ]
    }


@router.put("/users/{user_id}/block")
def block_user(
    user_id: int,
    body: BlockUserRequest,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_superadmin)
):
    """Bloquea o desbloquea un usuario."""
    usuario = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if usuario.id == current_admin.id:
        raise HTTPException(status_code=400, detail="No puedes bloquearte a ti mismo")

    usuario.activo = body.activo
    if not body.activo:
        # Invalidar todas las sesiones activas
        db.query(Sesion).filter(
            Sesion.usuario_id == user_id,
            Sesion.activa == True
        ).update({"activa": False})

    db.commit()
    log_action(
        db, "BLOQUEO_USUARIO" if not body.activo else "DESBLOQUEO_USUARIO",
        f"Usuario {usuario.email} {'bloqueado' if not body.activo else 'desbloqueado'}",
        current_admin.id
    )

    return {"message": f"Usuario {'bloqueado' if not body.activo else 'desbloqueado'} correctamente"}


@router.delete("/users/{user_id}/session")
def kill_user_sessions(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_superadmin)
):
    """Invalida todas las sesiones activas de un usuario específico."""
    count = db.query(Sesion).filter(
        Sesion.usuario_id == user_id,
        Sesion.activa == True
    ).update({"activa": False})
    db.commit()

    log_action(db, "KILL_SESIONES", f"Sesiones eliminadas para usuario ID {user_id}", current_admin.id)
    return {"message": f"{count} sesión(es) eliminada(s)"}


# ─────────────────────────────────────────────────────────────
# ESTADÍSTICAS
# ─────────────────────────────────────────────────────────────
@router.get("/stats/overview", response_model=AdminStatsResponse)
def get_stats_overview(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_superadmin)
):
    """Estadísticas generales del sistema."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_usuarios = db.query(Usuario).count()
    usuarios_activos = db.query(Sesion).filter(
        Sesion.activa == True, Sesion.expires_at > now
    ).distinct(Sesion.usuario_id).count()

    stats_gen = db.query(
        func.sum(Conexion.registros_generados),
        func.sum(Conexion.registros_insertados)
    ).first()

    logins_hoy = db.query(Log).filter(
        Log.accion.in_(["LOGIN", "LOGIN_OAUTH", "REGISTRO"]),
        Log.created_at >= today_start
    ).count()

    return AdminStatsResponse(
        total_usuarios=total_usuarios,
        usuarios_activos=usuarios_activos or 0,
        total_registros_generados=stats_gen[0] or 0,
        total_registros_insertados=stats_gen[1] or 0,
        logins_hoy=logins_hoy
    )


@router.get("/stats/logins")
def get_login_stats(
    period: str = Query("week", pattern="^(day|week|month)$"),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_superadmin)
):
    """Estadísticas de logins por periodo."""
    now = datetime.now(timezone.utc)

    if period == "day":
        days = 24
        delta = timedelta(hours=1)
        fmt = "%Y-%m-%d %H:00"
    elif period == "week":
        days = 7
        delta = timedelta(days=1)
        fmt = "%Y-%m-%d"
    else:  # month
        days = 30
        delta = timedelta(days=1)
        fmt = "%Y-%m-%d"

    since = now - (timedelta(hours=days) if period == "day" else timedelta(days=days))

    logs = db.query(Log).filter(
        Log.accion.in_(["LOGIN", "LOGIN_OAUTH", "REGISTRO"]),
        Log.created_at >= since
    ).all()

    # Agrupar por intervalo
    from collections import defaultdict
    counts = defaultdict(int)
    for log in logs:
        key = log.created_at.strftime(fmt)
        counts[key] += 1

    # Generar todos los puntos del rango (incluyendo ceros)
    result = []
    current = since
    while current <= now:
        key = current.strftime(fmt)
        result.append({"fecha": key, "cantidad": counts.get(key, 0)})
        current += delta
        # Evitar duplicados en modo hora
        if period == "day" and len(result) >= 24:
            break

    return {"period": period, "data": result}


@router.get("/stats/engines")
def get_engine_stats(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_superadmin)
):
    """Motores de BD más utilizados."""
    results = db.query(
        Conexion.motor_bd,
        func.count(Conexion.id).label("cantidad")
    ).group_by(Conexion.motor_bd).order_by(desc("cantidad")).all()

    return {
        "data": [{"motor": r[0], "cantidad": r[1]} for r in results]
    }


# ─────────────────────────────────────────────────────────────
# LOGS
# ─────────────────────────────────────────────────────────────
@router.get("/logs")
def get_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    nivel: Optional[str] = Query(None),
    accion: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_superadmin)
):
    """Logs del sistema con paginación y filtros."""
    query = db.query(Log)
    if nivel:
        query = query.filter(Log.nivel == nivel.upper())
    if accion:
        query = query.filter(Log.accion.like(f"%{accion}%"))

    total = query.count()
    logs = query.order_by(desc(Log.created_at)) \
                .offset((page - 1) * per_page).limit(per_page).all()

    result = []
    for log in logs:
        nombre = None
        if log.usuario:
            nombre = f"{log.usuario.nombre} {log.usuario.apellido}"
        result.append({
            "id": log.id,
            "usuario_id": log.usuario_id,
            "usuario_nombre": nombre,
            "accion": log.accion,
            "detalle": log.detalle,
            "ip_address": log.ip_address,
            "nivel": log.nivel,
            "created_at": log.created_at
        })

    return {
        "items": result,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page
    }


# ─────────────────────────────────────────────────────────────
# GESTIÓN DE COMENTARIOS
# ─────────────────────────────────────────────────────────────
@router.get("/comentarios")
def admin_list_comentarios(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_superadmin)
):
    """Lista todos los comentarios para moderación."""
    total = db.query(Comentario).count()
    comentarios = db.query(Comentario) \
                    .order_by(desc(Comentario.created_at)) \
                    .offset((page - 1) * per_page).limit(per_page).all()

    return {
        "items": [
            {
                "id": c.id,
                "usuario_id": c.usuario_id,
                "usuario_nombre": f"{c.usuario.nombre} {c.usuario.apellido}",
                "usuario_email": c.usuario.email,
                "contenido": c.contenido,
                "calificacion": c.calificacion,
                "created_at": c.created_at
            }
            for c in comentarios
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page
    }


@router.delete("/comentarios/{comentario_id}")
def admin_delete_comentario(
    comentario_id: int,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_superadmin)
):
    """El superadmin puede eliminar cualquier comentario."""
    comentario = db.query(Comentario).filter(Comentario.id == comentario_id).first()
    if not comentario:
        raise HTTPException(status_code=404, detail="Comentario no encontrado")

    db.delete(comentario)
    db.commit()
    log_action(db, "ELIMINAR_COMENTARIO", f"Comentario ID {comentario_id} eliminado por admin", current_admin.id)

    return {"message": "Comentario eliminado"}
