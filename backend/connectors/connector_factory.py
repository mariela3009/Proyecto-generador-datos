"""
connectors/connector_factory.py
Fábrica de conectores: detecta el motor por puerto o selección manual.
"""
from typing import Optional
from backend.connectors.base import BaseConnector
from backend.connectors.mysql_connector import MySQLConnector
from backend.connectors.postgres_connector import PostgreSQLConnector
from backend.connectors.mongodb_connector import MongoDBConnector
from backend.connectors.cassandra_connector import CassandraConnector
from backend.connectors.neo4j_connector import Neo4jConnector
from backend.connectors.sqlserver_connector import SQLServerConnector
from backend.models.schemas import ConexionRequest, MotorBDEnum

# Mapeo de puertos estándar → motor
PORT_TO_ENGINE = {
    3306: MotorBDEnum.mysql,
    5432: MotorBDEnum.postgresql,
    1433: MotorBDEnum.sqlserver,
    27017: MotorBDEnum.mongodb,
    9042: MotorBDEnum.cassandra,
    7687: MotorBDEnum.neo4j,
}

# Mapeo de motor → clase conector
ENGINE_CLASSES = {
    MotorBDEnum.mysql: MySQLConnector,
    MotorBDEnum.postgresql: PostgreSQLConnector,
    MotorBDEnum.sqlserver: SQLServerConnector,
    MotorBDEnum.mongodb: MongoDBConnector,
    MotorBDEnum.cassandra: CassandraConnector,
    MotorBDEnum.neo4j: Neo4jConnector,
}


def detect_engine(port: int, explicit: Optional[MotorBDEnum] = None) -> MotorBDEnum:
    """
    Detecta el motor de base de datos por puerto estándar.
    Si el puerto no es estándar, usa la selección manual del usuario.
    Lanza ValueError si no se puede determinar el motor.
    """
    if explicit is not None:
        return explicit

    engine = PORT_TO_ENGINE.get(port)
    if engine is None:
        raise ValueError(
            f"Puerto {port} no es estándar. Por favor selecciona el motor manualmente."
        )
    return engine


def get_connector(req: ConexionRequest) -> BaseConnector:
    """
    Retorna una instancia del conector apropiado basado en la solicitud.
    """
    engine = detect_engine(req.puerto, req.motor)
    connector_class = ENGINE_CLASSES[engine]
    return connector_class(
        host=req.host,
        port=req.puerto,
        user=req.usuario,
        password=req.password,
        database=req.nombre_bd
    )
