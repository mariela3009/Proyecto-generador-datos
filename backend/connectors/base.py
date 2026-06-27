"""
connectors/base.py
Clase abstracta base para todos los conectores de bases de datos externas.
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from backend.models.schemas import DatabaseSchema, TableSchema


class BaseConnector(ABC):
    """
    Interfaz común que todos los conectores de BD deben implementar.
    """

    def __init__(self, host: str, port: int, user: str, password: str, database: str):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.database = database
        self._connection = None

    @abstractmethod
    def connect(self) -> bool:
        """Establece la conexión. Retorna True si exitosa."""
        pass

    @abstractmethod
    def disconnect(self):
        """Cierra la conexión."""
        pass

    @abstractmethod
    def get_schema(self) -> DatabaseSchema:
        """Extrae el esquema completo de la base de datos."""
        pass

    @abstractmethod
    def insert_records(
        self,
        table_name: str,
        columns: List[str],
        records: List[List[Any]]
    ) -> Dict[str, int]:
        """
        Inserta registros en la tabla especificada.
        Retorna {"inserted": N, "errors": M}.
        """
        pass

    def test_connection(self) -> Dict[str, Any]:
        """Prueba la conexión y retorna información básica."""
        try:
            success = self.connect()
            if success:
                schema = self.get_schema()
                self.disconnect()
                return {
                    "success": True,
                    "motor": self.__class__.__name__,
                    "database": self.database,
                    "tables_count": len(schema.tables)
                }
            return {"success": False, "error": "No se pudo conectar"}
        except Exception as e:
            return {"success": False, "error": str(e)}
        finally:
            try:
                self.disconnect()
            except Exception:
                pass

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()
