"""
connectors/mysql_connector.py
Conector para MySQL usando PyMySQL.
"""
import pymysql
import pymysql.cursors
from typing import List, Dict, Any
from backend.connectors.base import BaseConnector
from backend.models.schemas import DatabaseSchema, TableSchema, ColumnSchema


class MySQLConnector(BaseConnector):

    def connect(self) -> bool:
        self._connection = pymysql.connect(
            host=self.host,
            port=self.port,
            user=self.user,
            password=self.password,
            database=self.database,
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=10
        )
        return True

    def disconnect(self):
        if self._connection:
            self._connection.close()
            self._connection = None

    def get_schema(self) -> DatabaseSchema:
        cursor = self._connection.cursor()

        # Obtener lista de tablas
        cursor.execute("SHOW TABLES")
        tables_raw = cursor.fetchall()
        table_names = [list(t.values())[0] for t in tables_raw]

        tables = []
        for table_name in table_names:
            columns = self._get_columns(cursor, table_name)
            fks = self._get_foreign_keys(cursor, table_name)
            pks = self._get_primary_keys(cursor, table_name)

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
            motor="mysql",
            database_name=self.database,
            tables=tables
        )

    def _get_columns(self, cursor, table_name: str) -> List[ColumnSchema]:
        cursor.execute(f"SHOW FULL COLUMNS FROM `{table_name}`")
        rows = cursor.fetchall()
        columns = []
        for row in rows:
            # Extraer longitud máxima del tipo (ej: varchar(255) → 255)
            raw_type = row["Type"]
            max_length = None
            if "(" in raw_type:
                try:
                    max_length = int(raw_type.split("(")[1].rstrip(")").split(",")[0])
                except (ValueError, IndexError):
                    pass
            base_type = raw_type.split("(")[0].upper()

            columns.append(ColumnSchema(
                name=row["Field"],
                data_type=base_type,
                is_nullable=(row["Null"] == "YES"),
                is_unique=(row["Key"] == "UNI"),
                default_value=str(row["Default"]) if row["Default"] is not None else None,
                max_length=max_length
            ))
        return columns

    def _get_primary_keys(self, cursor, table_name: str) -> List[str]:
        cursor.execute(f"SHOW KEYS FROM `{table_name}` WHERE Key_name = 'PRIMARY'")
        rows = cursor.fetchall()
        return [row["Column_name"] for row in rows]

    def _get_foreign_keys(self, cursor, table_name: str) -> List[Dict]:
        cursor.execute("""
            SELECT
                kcu.COLUMN_NAME as `column`,
                kcu.REFERENCED_TABLE_NAME as referenced_table,
                kcu.REFERENCED_COLUMN_NAME as referenced_column
            FROM information_schema.KEY_COLUMN_USAGE kcu
            WHERE kcu.TABLE_SCHEMA = %s
              AND kcu.TABLE_NAME = %s
              AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
        """, (self.database, table_name))
        return cursor.fetchall()

    def insert_records(
        self,
        table_name: str,
        columns: List[str],
        records: List[List[Any]]
    ) -> Dict[str, int]:
        cursor = self._connection.cursor()
        inserted = 0
        errors = 0

        cols_str = ", ".join(f"`{c}`" for c in columns)
        placeholders = ", ".join(["%s"] * len(columns))
        sql = f"INSERT INTO `{table_name}` ({cols_str}) VALUES ({placeholders})"

        for record in records:
            try:
                cursor.execute(sql, record)
                inserted += 1
            except pymysql.Error:
                errors += 1

        self._connection.commit()
        cursor.close()
        return {"inserted": inserted, "errors": errors}
