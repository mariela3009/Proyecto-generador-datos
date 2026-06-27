"""
connectors/mongodb_connector.py
Conector para MongoDB usando pymongo.
"""
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from typing import List, Dict, Any
from backend.connectors.base import BaseConnector
from backend.models.schemas import DatabaseSchema, TableSchema, ColumnSchema


class MongoDBConnector(BaseConnector):

    def connect(self) -> bool:
        uri = f"mongodb://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"
        self._client = MongoClient(uri, serverSelectionTimeoutMS=10000)
        # Verificar conexión
        self._client.admin.command("ping")
        self._db = self._client[self.database]
        return True

    def disconnect(self):
        if hasattr(self, "_client") and self._client:
            self._client.close()
            self._client = None

    def get_schema(self) -> DatabaseSchema:
        """
        MongoDB es schema-less. Inferimos el esquema muestreando
        los primeros 100 documentos de cada colección.
        """
        collection_names = self._db.list_collection_names()
        tables = []

        for coll_name in collection_names:
            collection = self._db[coll_name]
            sample_docs = list(collection.find({}).limit(100))

            # Inferir campos únicos y sus tipos
            field_types: Dict[str, set] = {}
            for doc in sample_docs:
                for key, value in doc.items():
                    if key not in field_types:
                        field_types[key] = set()
                    field_types[key].add(type(value).__name__)

            columns = []
            pks = []
            for field, types in field_types.items():
                # Determinar tipo predominante
                type_str = list(types)[0].upper() if types else "STRING"
                is_pk = field == "_id"
                if is_pk:
                    pks.append(field)

                columns.append(ColumnSchema(
                    name=field,
                    data_type=type_str,
                    is_nullable=True,
                    is_primary_key=is_pk
                ))

            tables.append(TableSchema(
                name=coll_name,
                columns=columns,
                primary_keys=pks,
                foreign_keys=[]
            ))

        return DatabaseSchema(
            motor="mongodb",
            database_name=self.database,
            tables=tables
        )

    def insert_records(
        self,
        table_name: str,
        columns: List[str],
        records: List[List[Any]]
    ) -> Dict[str, int]:
        """Inserta documentos en una colección MongoDB."""
        collection = self._db[table_name]
        inserted = 0
        errors = 0

        documents = [dict(zip(columns, record)) for record in records]

        try:
            result = collection.insert_many(documents, ordered=False)
            inserted = len(result.inserted_ids)
        except Exception as e:
            errors = len(documents)

        return {"inserted": inserted, "errors": errors}
