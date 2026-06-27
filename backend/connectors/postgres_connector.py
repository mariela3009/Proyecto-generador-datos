"""
connectors/postgres_connector.py
Conector para PostgreSQL usando psycopg2.
"""
import psycopg2
import psycopg2.extras
import logging
from typing import List, Dict, Any
from backend.connectors.base import BaseConnector
from backend.models.schemas import DatabaseSchema, TableSchema, ColumnSchema

logger = logging.getLogger(__name__)


class PostgreSQLConnector(BaseConnector):

    def connect(self) -> bool:
        self._connection = psycopg2.connect(
            host=self.host,
            port=self.port,
            user=self.user,
            password=self.password,
            dbname=self.database,
            connect_timeout=10
        )
        return True

    def disconnect(self):
        if self._connection:
            self._connection.close()
            self._connection = None

    def get_schema(self) -> DatabaseSchema:
        cursor = self._connection.cursor(cursor_factory=psycopg2.extras.DictCursor)

        # Tablas del schema público
        cursor.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """)
        table_names = [row[0] for row in cursor.fetchall()]

        tables = []
        for table_name in table_names:
            columns = self._get_columns(cursor, table_name)
            pks = self._get_primary_keys(cursor, table_name)
            fks = self._get_foreign_keys(cursor, table_name)

            fk_map = {fk["column"]: fk for fk in fks}
            for col in columns:
                col.is_primary_key = col.name in pks
                if col.name in fk_map:
                    fk = fk_map[col.name]
                    col.foreign_key = {
                        "table": fk["referenced_table"],
                        "column": fk["referenced_column"]
                    }

            tables.append(TableSchema(
                name=table_name,
                columns=columns,
                primary_keys=pks,
                foreign_keys=fks
            ))

        cursor.close()
        return DatabaseSchema(motor="postgresql", database_name=self.database, tables=tables)

    def _get_columns(self, cursor, table_name: str) -> List[ColumnSchema]:
        cursor.execute("""
            SELECT
                column_name, data_type, is_nullable,
                character_maximum_length, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position
        """, (table_name,))
        rows = cursor.fetchall()

        # Columnas únicas (solo schema public)
        cursor.execute("""
            SELECT ccu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu
              ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_schema = 'public'
              AND tc.table_name = %s
              AND tc.constraint_type = 'UNIQUE'
        """, (table_name,))
        unique_cols = {r[0] for r in cursor.fetchall()}

        return [
            ColumnSchema(
                name=row["column_name"],
                data_type=row["data_type"].upper(),
                is_nullable=(row["is_nullable"] == "YES"),
                is_unique=row["column_name"] in unique_cols,
                default_value=str(row["column_default"]) if row["column_default"] else None,
                max_length=row["character_maximum_length"]
            )
            for row in rows
        ]

    def _get_primary_keys(self, cursor, table_name: str) -> List[str]:
        cursor.execute("""
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND kcu.table_schema = 'public'
            WHERE tc.table_schema = 'public'
              AND tc.table_name = %s
              AND tc.constraint_type = 'PRIMARY KEY'
        """, (table_name,))
        return [row[0] for row in cursor.fetchall()]

    def _get_foreign_keys(self, cursor, table_name: str) -> List[Dict]:
        cursor.execute("""
            SELECT
                kcu.column_name as column,
                ccu.table_name AS referenced_table,
                ccu.column_name AS referenced_column
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
             AND kcu.table_schema = 'public'
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_schema = 'public'
              AND tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_name = %s
        """, (table_name,))
        return [{"column": r[0], "referenced_table": r[1], "referenced_column": r[2]}
                for r in cursor.fetchall()]

    def insert_records(
        self,
        table_name: str,
        columns: List[str],
        records: List[List[Any]]
    ) -> Dict[str, int]:
        cursor = self._connection.cursor()
        inserted = 0
        errors = 0

        cols_str = ", ".join(f'"{c}"' for c in columns)
        placeholders = ", ".join(["%s"] * len(columns))
        sql = f'INSERT INTO "{table_name}" ({cols_str}) VALUES ({placeholders})'

        for record in records:
            try:
                cursor.execute(sql, record)
                inserted += 1
            except Exception as e:
                self._connection.rollback()
                errors += 1
                logger.error(f"❌ Error insertando en '{table_name}' — fila {inserted + errors}: {type(e).__name__}: {e}")
                continue

        try:
            self._connection.commit()
        except Exception:
            self._connection.rollback()

        cursor.close()
        return {"inserted": inserted, "errors": errors}
