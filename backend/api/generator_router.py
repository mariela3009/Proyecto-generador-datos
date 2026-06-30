"""
api/generator_router.py
Rutas para la generación y exportación de datos.
"""
import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from typing import Dict, Any

from backend.auth.dependencies import get_current_user
from backend.models.schemas import (
    GeneratePreviewRequest,
    GeneratedDataResponse,
    ExportRequest,
    ExportResponse,
    UsuarioResponse
)
from backend.generators.data_generator import DataGenerator
from backend.generators.exporters import export_sql, export_csv, export_json, TEMP_DIR

router = APIRouter(prefix="/generate", tags=["Generator"])

@router.post("/preview", response_model=Dict[str, GeneratedDataResponse])
def generate_preview(req: GeneratePreviewRequest, current_user: UsuarioResponse = Depends(get_current_user)):
    """
    Genera un pequeño conjunto de datos para vista previa.
    """
    # Ajustamos la configuración para generar sólo 'preview_rows'
    preview_configs = []
    for tc in req.table_configs:
        if tc.selected:
            tc_copy = tc.model_copy()
            tc_copy.record_count = min(tc.record_count, req.preview_rows)
            preview_configs.append(tc_copy)
            
    generator = DataGenerator(locale=req.locale or "es_ES")
    
    try:
        data = generator.generate(req.schema, preview_configs, ai_prompt=req.ai_prompt)
        
        # Transformar al formato de respuesta
        result = {}
        for table_name, t_data in data.items():
            result[table_name] = GeneratedDataResponse(
                table_name=table_name,
                columns=t_data["columns"],
                rows=t_data["rows"],
                total_rows=len(t_data["rows"])
            )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando preview: {str(e)}")

@router.post("/export", response_model=ExportResponse)
def export_data(req: ExportRequest, current_user: UsuarioResponse = Depends(get_current_user)):
    """
    Genera los datos completos y los exporta al formato solicitado.
    """
    generator = DataGenerator(locale=req.locale or "es_ES")
    
    try:
        data = generator.generate(req.schema, req.table_configs, ai_prompt=req.ai_prompt)
        
        total_records = sum(len(t["rows"]) for t in data.values())
        if total_records == 0:
            raise HTTPException(status_code=400, detail="No se generaron registros para exportar.")
            
        file_id = None
        ext = ""
        
        if req.format == "sql":
            file_id = export_sql(data, req.schema)
            ext = "sql"
        elif req.format == "csv":
            file_id = export_csv(data)
            ext = "csv" if len(data) == 1 else "zip"
        elif req.format == "json":
            file_id = export_json(data)
            ext = "json"
        else:
            raise HTTPException(status_code=400, detail="Formato no soportado.")
            
        filename = f"{req.schema.database_name}_data.{ext}"
        
        return ExportResponse(
            file_id=file_id,
            filename=filename,
            format=req.format,
            download_url=f"/api/v1/generate/download/{file_id}.{ext}",
            total_records=total_records
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error durante la exportación: {str(e)}")

@router.get("/download/{filename}")
def download_file(filename: str):
    """
    Sirve el archivo generado. No requiere autenticación por simplicidad de descarga,
    pero el ID es un UUID que hace difícil adivinar URLs.
    """
    filepath = os.path.join(TEMP_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Archivo no encontrado.")
        
    return FileResponse(filepath, filename=filename)
