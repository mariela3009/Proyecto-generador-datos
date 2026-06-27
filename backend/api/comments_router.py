"""
api/comments_router.py
Rutas para la gestión de comentarios públicos del sistema.
"""
import math
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.core.database import get_db
from backend.auth.dependencies import get_current_user, get_optional_user
from backend.models.models import Comentario, Usuario, RolEnum
from backend.models.schemas import (
    ComentarioCreate,
    ComentarioUpdate,
    ComentarioResponse,
    PaginatedComentarios,
    UsuarioResponse
)

router = APIRouter(prefix="/comentarios", tags=["Comentarios"])

@router.get("", response_model=PaginatedComentarios)
def get_comentarios(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Obtiene lista paginada de comentarios. Público.
    """
    query = db.query(Comentario).order_by(desc(Comentario.created_at))
    total = query.count()
    comentarios = query.offset((page - 1) * per_page).limit(per_page).all()
    
    items = []
    for c in comentarios:
        usuario = c.usuario
        items.append(ComentarioResponse(
            id=c.id,
            usuario_id=c.usuario_id,
            contenido=c.contenido,
            calificacion=c.calificacion,
            created_at=c.created_at,
            updated_at=c.updated_at,
            usuario_nombre=usuario.nombre,
            usuario_apellido=usuario.apellido,
            usuario_avatar=usuario.avatar_url
        ))
        
    pages = math.ceil(total / per_page)
    
    return PaginatedComentarios(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages
    )

@router.post("", response_model=ComentarioResponse)
def create_comentario(
    req: ComentarioCreate,
    db: Session = Depends(get_db),
    current_user: UsuarioResponse = Depends(get_current_user)
):
    """
    Crea un nuevo comentario (solo usuarios autenticados).
    """
    nuevo_comentario = Comentario(
        usuario_id=current_user.id,
        contenido=req.contenido,
        calificacion=req.calificacion
    )
    db.add(nuevo_comentario)
    db.commit()
    db.refresh(nuevo_comentario)
    
    # Recuperar el usuario para rellenar los datos del response
    usuario_db = db.query(Usuario).filter(Usuario.id == current_user.id).first()
    
    return ComentarioResponse(
        id=nuevo_comentario.id,
        usuario_id=nuevo_comentario.usuario_id,
        contenido=nuevo_comentario.contenido,
        calificacion=nuevo_comentario.calificacion,
        created_at=nuevo_comentario.created_at,
        updated_at=nuevo_comentario.updated_at,
        usuario_nombre=usuario_db.nombre,
        usuario_apellido=usuario_db.apellido,
        usuario_avatar=usuario_db.avatar_url
    )

@router.put("/{comentario_id}", response_model=ComentarioResponse)
def update_comentario(
    comentario_id: int,
    req: ComentarioUpdate,
    db: Session = Depends(get_db),
    current_user: UsuarioResponse = Depends(get_current_user)
):
    """
    Edita un comentario propio.
    """
    comentario = db.query(Comentario).filter(Comentario.id == comentario_id).first()
    if not comentario:
        raise HTTPException(status_code=404, detail="Comentario no encontrado.")
        
    if comentario.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No puedes editar un comentario que no es tuyo.")
        
    if req.contenido is not None:
        comentario.contenido = req.contenido
    if req.calificacion is not None:
        comentario.calificacion = req.calificacion
        
    db.commit()
    db.refresh(comentario)
    
    usuario_db = db.query(Usuario).filter(Usuario.id == current_user.id).first()
    
    return ComentarioResponse(
        id=comentario.id,
        usuario_id=comentario.usuario_id,
        contenido=comentario.contenido,
        calificacion=comentario.calificacion,
        created_at=comentario.created_at,
        updated_at=comentario.updated_at,
        usuario_nombre=usuario_db.nombre,
        usuario_apellido=usuario_db.apellido,
        usuario_avatar=usuario_db.avatar_url
    )

@router.delete("/{comentario_id}")
def delete_comentario(
    comentario_id: int,
    db: Session = Depends(get_db),
    current_user: UsuarioResponse = Depends(get_current_user)
):
    """
    Elimina un comentario (owner o superadmin).
    """
    comentario = db.query(Comentario).filter(Comentario.id == comentario_id).first()
    if not comentario:
        raise HTTPException(status_code=404, detail="Comentario no encontrado.")
        
    # Verificar permisos (owner o superadmin)
    if comentario.usuario_id != current_user.id and current_user.rol != RolEnum.superadmin:
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar este comentario.")
        
    db.delete(comentario)
    db.commit()
    return {"message": "Comentario eliminado correctamente."}
