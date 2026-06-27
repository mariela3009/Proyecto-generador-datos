"""
api/parser_router.py
Rutas para procesar scripts SQL enviados por el usuario.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any

from backend.auth.dependencies import get_current_user
from backend.models.schemas import (
    ParseSQLRequest,
    ParseSQLResponse,
    UsuarioResponse
)
from backend.parsers.sql_parser import parse_sql_script

router = APIRouter(prefix="/parser", tags=["Parser"])

@router.post("/analyze", response_model=ParseSQLResponse)
def analyze_sql_script(req: ParseSQLRequest, current_user: UsuarioResponse = Depends(get_current_user)):
    """
    Recibe un script SQL (CREATE TABLEs) y lo parsea para extraer el esquema.
    """
    if not req.sql_content or not req.sql_content.strip():
        raise HTTPException(status_code=400, detail="El contenido SQL no puede estar vacío.")
        
    try:
        schema, warnings = parse_sql_script(req.sql_content)
        
        if not schema.tables:
            return ParseSQLResponse(
                success=False,
                error="No se encontraron sentencias CREATE TABLE válidas en el script.",
                warnings=warnings
            )
            
        return ParseSQLResponse(
            success=True,
            schema=schema,
            warnings=warnings
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al parsear el script: {str(e)}")
