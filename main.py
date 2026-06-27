"""
main.py
Punto de entrada de la aplicación FastAPI.
Configura CORS, incluye todos los routers, e inicializa eventos.
"""
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.core.config import settings
from backend.core.database import engine, Base
from backend.api import (
    auth_router,
    admin_router,
    connector_router,
    parser_router,
    generator_router,
    comments_router
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Crear tablas si no existen en la BD interna
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown
    pass

app = FastAPI(
    title="Sistema Inteligente Generador de Datos",
    description="API para conexión, análisis y generación de datos sintéticos.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configuración CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Crear sub-router para prefijo /api/v1
api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router.router)
api_router.include_router(admin_router.router)
api_router.include_router(connector_router.router)
api_router.include_router(parser_router.router)
api_router.include_router(generator_router.router)
api_router.include_router(comments_router.router)

app.include_router(api_router)

@app.get("/")
def read_root():
    return {"message": "Bienvenido a la API del Generador Inteligente de Datos"}
