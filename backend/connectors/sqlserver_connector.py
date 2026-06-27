"""
connectors/sqlserver_connector.py
Conector para SQL Server / Azure SQL usando pyodbc.
"""
import pyodbc
from typing import List, Dict, Any
from backend.connectors.base import BaseConnector
from backend.models.schemas import DatabaseSchema, TableSchema, ColumnSchema


class SQLServerConnector(BaseConnector):

    def connect(self) -> bool:
        conn_str = (
            f"DRIVER={{ODBC Driver 17 for SQL Server}};"
            f"SERVER={self.host},{self.port};"
            f"DATABASE={self.database};"
            f"UID={self.user};"
            f"PWD={self.password};"
            f"Connection Timeout=10;"
        )
        self._connection = pyodbc.connect(conn_str)
        return True

    def disconnect(self):
        if self._connection:
            self._connection.close()
            self._connection = None

    def get_schema(self) -> DatabaseSchema:
        cursor = self._connection.cursor()

        # Obtener todas las tablas de usuario (excluir tablas del sistema)
        cursor.execute("""
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
              AND TABLE_CATALOG = ?
            ORDER BY TABLE_NAME
        """, self.database)
        table_names = [row[0] for row in cursor.fetchall()]

        tables = []
        for table_name in table_names:
            columns = self._get_columns(cursor, table_name)
            pks = self._get_primary_keys(cursor, table_name)
            fks = self._get_foreign_keys(cursor, table_name)

            # Enriquecer columnas con info de PK y FK
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
        return DatabaseSchema(
            motor="sqlserver",
            database_name=self.database,
            tables=tables
        )

    def _get_columns(self, cursor, table_name: str) -> List[ColumnSchema]:
        cursor.execute("""
            SELECT
                c.COLUMN_NAME,
                c.DATA_TYPE,
                c.IS_NULLABLE,
                c.CHARACTER_MAXIMUM_LENGTH,
                c.COLUMN_DEFAULT,
                CASE WHEN tc.CONSTRAINT_TYPE = 'UNIQUE' THEN 1 ELSE 0 END AS IS_UNIQUE
            FROM INFORMATION_SCHEMA.COLUMNS c
            LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
                ON kcu.TABLE_NAME = c.TABLE_NAME
                AND kcu.COLUMN_NAME = c.COLUMN_NAME
            LEFT JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
                AND tc.CONSTRAINT_TYPE = 'UNIQUE'
            WHERE c.TABLE_NAME = ?
            ORDER BY c.ORDINAL_POSITION
        """, table_name)

        columns = []
        for row in cursor.fetchall():
            columns.append(ColumnSchema(
                name=row[0],
                data_type=row[1].upper(),
                is_nullable=(row[2] == "YES"),
                max_length=row[3] if row[3] and row[3] > 0 else None,
                default_value=str(row[4]) if row[4] is not None else None,
                is_unique=bool(row[5])
            ))
        return columns

    def _get_primary_keys(self, cursor, table_name: str) -> List[str]:
        cursor.execute("""
            SELECT kcu.COLUMN_NAME
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
            JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
                ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
            WHERE tc.TABLE_NAME = ?
              AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
            ORDER BY kcu.ORDINAL_POSITION
        """, table_name)
        return [row[0] for row in cursor.fetchall()]

    def _get_foreign_keys(self, cursor, table_name: str) -> List[Dict]:
        cursor.execute("""
            SELECT
                kcu.COLUMN_NAME as [column],
                ccu.TABLE_NAME AS referenced_table,
                ccu.COLUMN_NAME AS referenced_column
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
            JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
                ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
            JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
                ON tc.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
            JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu
                ON rc.UNIQUE_CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
            WHERE tc.TABLE_NAME = ?
              AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
        """, table_name)

        fks = []
        for row in cursor.fetchall():
            fks.append({
                "column": row[0],
                "referenced_table": row[1],
                "referenced_column": row[2]
            })
        return fks

    def insert_records(
        self,
        table_name: str,
        columns: List[str],
        records: List[List[Any]]
    ) -> Dict[str, int]:
        cursor = self._connection.cursor()
        inserted = 0
        errors = 0

        cols_str = ", ".join(f"[{c}]" for c in columns)
        placeholders = ", ".join(["?"] * len(columns))
        sql = f"INSERT INTO [{table_name}] ({cols_str}) VALUES ({placeholders})"

        for record in records:
            try:
                cursor.execute(sql, record)
                inserted += 1
            except pyodbc.Error:
                errors += 1

        self._connection.commit()
        cursor.close()
        return {"inserted": inserted, "errors": errors}
