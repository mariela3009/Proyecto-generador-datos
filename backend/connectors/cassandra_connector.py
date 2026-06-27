"""
connectors/cassandra_connector.py
Conector para Apache Cassandra usando cassandra-driver.
"""
try:
    from cassandra.cluster import Cluster
    from cassandra.auth import PlainTextAuthProvider
    from cassandra import ConsistencyLevel
    CASSANDRA_AVAILABLE = True
except Exception as e:
    CASSANDRA_AVAILABLE = False
    Cluster = None
    PlainTextAuthProvider = None
    ConsistencyLevel = None
from typing import List, Dict, Any
from backend.connectors.base import BaseConnector
from backend.models.schemas import DatabaseSchema, TableSchema, ColumnSchema


# Mapeo de tipos Cassandra a tipos genéricos
CASSANDRA_TYPE_MAP = {
    "uuid": "UUID",
    "timeuuid": "UUID",
    "text": "VARCHAR",
    "varchar": "VARCHAR",
    "int": "INT",
    "bigint": "BIGINT",
    "float": "FLOAT",
    "double": "DOUBLE",
    "boolean": "BOOLEAN",
    "timestamp": "DATETIME",
    "date": "DATE",
    "decimal": "DECIMAL",
    "counter": "INT",
}


class CassandraConnector(BaseConnector):

    def connect(self) -> bool:
        if not CASSANDRA_AVAILABLE:
            raise ValueError("El driver de Cassandra no está soportado en Python 3.12+ debido a la remoción de 'asyncore'.")
        auth = PlainTextAuthProvider(username=self.user, password=self.password)
        self._cluster = Cluster(
            [self.host],
            port=self.port,
            auth_provider=auth,
            connect_timeout=10
        )
        self._session = self._cluster.connect()
        self._session.set_keyspace(self.database)
        return True

    def disconnect(self):
        if hasattr(self, "_cluster") and self._cluster:
            self._cluster.shutdown()

    def get_schema(self) -> DatabaseSchema:
        keyspace_meta = self._cluster.metadata.keyspaces.get(self.database)
        if not keyspace_meta:
            return DatabaseSchema(motor="cassandra", database_name=self.database, tables=[])

        tables = []
        for table_name, table_meta in keyspace_meta.tables.items():
            columns = []
            pks = [col.name for col in table_meta.partition_key]
            pks += [col.name for col in table_meta.clustering_key]

            for col_name, col_meta in table_meta.columns.items():
                cass_type = str(col_meta.cql_type).lower().split("<")[0]
                mapped_type = CASSANDRA_TYPE_MAP.get(cass_type, cass_type.upper())
                columns.append(ColumnSchema(
                    name=col_name,
                    data_type=mapped_type,
                    is_nullable=True,
                    is_primary_key=col_name in pks
                ))

            tables.append(TableSchema(
                name=table_name,
                columns=columns,
                primary_keys=pks,
                foreign_keys=[]
            ))

        return DatabaseSchema(motor="cassandra", database_name=self.database, tables=tables)

    def insert_records(
        self,
        table_name: str,
        columns: List[str],
        records: List[List[Any]]
    ) -> Dict[str, int]:
        inserted = 0
        errors = 0
        cols_str = ", ".join(columns)
        placeholders = ", ".join(["?"] * len(columns))
        query = f"INSERT INTO {table_name} ({cols_str}) VALUES ({placeholders})"

        prepared = self._session.prepare(query)
        for record in records:
            try:
                self._session.execute(prepared, record)
                inserted += 1
            except Exception:
                errors += 1

        return {"inserted": inserted, "errors": errors}
