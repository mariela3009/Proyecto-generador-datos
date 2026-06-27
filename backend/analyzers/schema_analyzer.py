"""
analyzers/schema_analyzer.py
Modulo para analizar el esquema de base de datos extraido por los conectores.
"""
from backend.connectors.base import BaseConnector
from backend.models.schemas import DatabaseSchema

def analyze_schema(connector: BaseConnector) -> DatabaseSchema:
    """
    Usa el conector proporcionado para extraer y analizar el esquema
    de la base de datos a la que está conectado.
    """
    return connector.get_schema()
