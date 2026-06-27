"""
connectors/neo4j_connector.py
Conector para Neo4j usando el driver oficial de Neo4j.
"""
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable
from typing import List, Dict, Any
from backend.connectors.base import BaseConnector
from backend.models.schemas import DatabaseSchema, TableSchema, ColumnSchema


class Neo4jConnector(BaseConnector):

    def connect(self) -> bool:
        uri = f"bolt://{self.host}:{self.port}"
        self._driver = GraphDatabase.driver(
            uri,
            auth=(self.user, self.password),
            connection_timeout=10
        )
        # Verificar conectividad
        self._driver.verify_connectivity()
        return True

    def disconnect(self):
        if hasattr(self, "_driver") and self._driver:
            self._driver.close()

    def get_schema(self) -> DatabaseSchema:
        """
        Neo4j no tiene tablas relacionales. Representamos
        cada etiqueta (label) como una "tabla" e inferimos
        propiedades muestreando nodos.
        """
        tables = []
        with self._driver.session(database=self.database if self.database != "" else "neo4j") as session:
            # Obtener todas las labels
            result = session.run("CALL db.labels()")
            labels = [record["label"] for record in result]

            for label in labels:
                # Muestrear nodos de esta label
                sample = session.run(
                    f"MATCH (n:`{label}`) RETURN n LIMIT 50"
                )

                # Inferir propiedades únicas y sus tipos
                prop_types: Dict[str, set] = {}
                for record in sample:
                    node = record["n"]
                    for key, value in node.items():
                        if key not in prop_types:
                            prop_types[key] = set()
                        prop_types[key].add(type(value).__name__)

                columns = []
                for prop, types in prop_types.items():
                    py_type = list(types)[0] if types else "str"
                    type_map = {
                        "str": "VARCHAR",
                        "int": "INT",
                        "float": "FLOAT",
                        "bool": "BOOLEAN",
                        "NoneType": "VARCHAR"
                    }
                    columns.append(ColumnSchema(
                        name=prop,
                        data_type=type_map.get(py_type, "VARCHAR"),
                        is_nullable=True
                    ))

                tables.append(TableSchema(
                    name=label,
                    columns=columns,
                    primary_keys=[],
                    foreign_keys=[]
                ))

        return DatabaseSchema(
            motor="neo4j",
            database_name=self.database or "neo4j",
            tables=tables
        )

    def insert_records(
        self,
        table_name: str,
        columns: List[str],
        records: List[List[Any]]
    ) -> Dict[str, int]:
        """Crea nodos Neo4j con la label = table_name."""
        inserted = 0
        errors = 0

        with self._driver.session() as session:
            for record in records:
                props = dict(zip(columns, record))
                try:
                    session.run(
                        f"CREATE (n:`{table_name}` $props)",
                        props=props
                    )
                    inserted += 1
                except Exception:
                    errors += 1

        return {"inserted": inserted, "errors": errors}
