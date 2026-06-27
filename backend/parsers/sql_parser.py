"""
parsers/sql_parser.py
Parser de scripts SQL usando sqlparse.
Extrae: tablas, columnas, tipos, constraints, PK y FK.
Compatible con MySQL, PostgreSQL y SQL Server.
"""
import re
import sqlparse
from sqlparse.sql import Statement, Parenthesis, IdentifierList, Identifier
from sqlparse.tokens import Keyword, DDL, Punctuation, Name
from typing import List, Dict, Optional, Tuple, Any
from backend.models.schemas import DatabaseSchema, TableSchema, ColumnSchema


# Tipos SQL → tipo normalizado
SQL_TYPE_MAP = {
    "INT": "INT", "INTEGER": "INT", "SMALLINT": "SMALLINT",
    "BIGINT": "BIGINT", "TINYINT": "TINYINT", "MEDIUMINT": "INT",
    "FLOAT": "FLOAT", "DOUBLE": "DOUBLE", "REAL": "FLOAT",
    "DECIMAL": "DECIMAL", "NUMERIC": "DECIMAL", "MONEY": "DECIMAL",
    "VARCHAR": "VARCHAR", "NVARCHAR": "VARCHAR", "CHAR": "CHAR",
    "NCHAR": "CHAR", "TEXT": "TEXT", "MEDIUMTEXT": "TEXT",
    "LONGTEXT": "TEXT", "TINYTEXT": "TEXT", "CLOB": "TEXT",
    "BOOLEAN": "BOOLEAN", "BOOL": "BOOLEAN", "BIT": "BOOLEAN",
    "DATE": "DATE", "TIME": "TIME", "DATETIME": "DATETIME",
    "TIMESTAMP": "TIMESTAMP", "YEAR": "INT",
    "JSON": "JSON", "JSONB": "JSON",
    "UUID": "UUID", "UNIQUEIDENTIFIER": "UUID",
    "BLOB": "BLOB", "BINARY": "BLOB", "VARBINARY": "BLOB",
    "SERIAL": "INT", "BIGSERIAL": "BIGINT", "SMALLSERIAL": "SMALLINT",
}


def normalize_type(raw_type: str) -> Tuple[str, Optional[int]]:
    """Normaliza el tipo de dato SQL y extrae longitud máxima."""
    raw = raw_type.strip().upper()
    max_length = None

    if "(" in raw:
        parts = raw.split("(")
        base = parts[0].strip()
        try:
            length_part = parts[1].rstrip(")").split(",")[0]
            max_length = int(length_part)
        except (ValueError, IndexError):
            pass
    else:
        base = raw

    normalized = SQL_TYPE_MAP.get(base, base)
    return normalized, max_length


def _clean_sql(sql_text: str) -> str:
    """Limpia comentarios y normaliza el SQL."""
    # Eliminar comentarios de línea
    sql_text = re.sub(r"--[^\n]*", "", sql_text)
    # Eliminar comentarios de bloque
    sql_text = re.sub(r"/\*.*?\*/", "", sql_text, flags=re.DOTALL)
    return sql_text


def _parse_create_table(stmt_str: str) -> Optional[TableSchema]:
    """
    Parsea una sentencia CREATE TABLE y retorna un TableSchema.
    """
    # Extraer nombre de tabla
    table_match = re.search(
        r"CREATE\s+(?:TEMPORARY\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`\"']?(\w+)[`\"']?",
        stmt_str, re.IGNORECASE
    )
    if not table_match:
        return None

    table_name = table_match.group(1)

    # Extraer contenido entre paréntesis
    paren_match = re.search(r"\((.+)\)", stmt_str, re.DOTALL)
    if not paren_match:
        return None

    body = paren_match.group(1)

    columns: List[ColumnSchema] = []
    primary_keys: List[str] = []
    foreign_keys: List[Dict] = []

    # Dividir en líneas/definiciones respetando paréntesis anidados
    definitions = _split_definitions(body)

    for defn in definitions:
        defn = defn.strip().rstrip(",").strip()
        if not defn:
            continue

        upper = defn.upper().lstrip()

        # PRIMARY KEY a nivel tabla
        pk_match = re.match(
            r"PRIMARY\s+KEY\s*\(([^)]+)\)", upper
        )
        if pk_match:
            pks = [k.strip().strip("`\"'") for k in pk_match.group(1).split(",")]
            primary_keys.extend(pks)
            continue

        # FOREIGN KEY
        fk_match = re.match(
            r"(?:CONSTRAINT\s+\w+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+[`\"']?(\w+)[`\"']?\s*\(([^)]+)\)",
            defn, re.IGNORECASE
        )
        if fk_match:
            fk_col = fk_match.group(1).strip().strip("`\"'")
            ref_table = fk_match.group(2).strip()
            ref_col = fk_match.group(3).strip().strip("`\"'")
            foreign_keys.append({
                "column": fk_col,
                "referenced_table": ref_table,
                "referenced_column": ref_col
            })
            continue

        # UNIQUE KEY / INDEX a nivel tabla
        if re.match(r"(UNIQUE\s+(KEY|INDEX)|KEY|INDEX|CHECK)\s+", upper):
            # Detectar UNIQUE a nivel tabla
            unique_match = re.match(
                r"UNIQUE\s+(?:KEY|INDEX)\s+\w*\s*\(([^)]+)\)", defn, re.IGNORECASE
            )
            if unique_match:
                for col in unique_match.group(1).split(","):
                    col_name = col.strip().strip("`\"'")
                    # Marcar la columna como unique
                    for c in columns:
                        if c.name == col_name:
                            c.is_unique = True
            continue

        # Definición de columna
        col = _parse_column_definition(defn)
        if col:
            columns.append(col)

    # Marcar columnas PK
    for col in columns:
        if col.name in primary_keys or col.is_primary_key:
            col.is_primary_key = True
            if col.name not in primary_keys:
                primary_keys.append(col.name)

    # Marcar FK en columnas
    fk_col_map = {fk["column"]: fk for fk in foreign_keys}
    for col in columns:
        if col.name in fk_col_map:
            fk = fk_col_map[col.name]
            col.foreign_key = {
                "table": fk["referenced_table"],
                "column": fk["referenced_column"]
            }

    return TableSchema(
        name=table_name,
        columns=columns,
        primary_keys=primary_keys,
        foreign_keys=foreign_keys
    )


def _split_definitions(body: str) -> List[str]:
    """Divide el cuerpo de CREATE TABLE respetando paréntesis anidados."""
    definitions = []
    depth = 0
    current = []

    for char in body:
        if char == "(":
            depth += 1
            current.append(char)
        elif char == ")":
            depth -= 1
            current.append(char)
        elif char == "," and depth == 0:
            definitions.append("".join(current))
            current = []
        else:
            current.append(char)

    if current:
        definitions.append("".join(current))

    return definitions


def _parse_column_definition(defn: str) -> Optional[ColumnSchema]:
    """Parsea una línea de definición de columna."""
    # Patrón: `nombre` TIPO(len) [restricciones]
    col_match = re.match(
        r"[`\"']?(\w+)[`\"']?\s+(\w+(?:\s*\([^)]*\))?)(.*)",
        defn.strip(), re.IGNORECASE | re.DOTALL
    )
    if not col_match:
        return None

    col_name = col_match.group(1)
    raw_type = col_match.group(2).strip()
    rest = col_match.group(3).upper()

    # Ignorar palabras clave que no son columnas
    if col_name.upper() in (
        "PRIMARY", "FOREIGN", "UNIQUE", "INDEX", "KEY",
        "CONSTRAINT", "CHECK", "ENGINE", "DEFAULT", "CHARSET"
    ):
        return None

    data_type, max_length = normalize_type(raw_type)

    is_nullable = "NOT NULL" not in rest
    is_unique = "UNIQUE" in rest
    is_pk = "PRIMARY KEY" in rest
    is_auto = "AUTO_INCREMENT" in rest or "AUTOINCREMENT" in rest or "SERIAL" in raw_type.upper()

    # Extraer DEFAULT
    default_match = re.search(r"DEFAULT\s+('?[^,\s]+'?)", rest)
    default_value = default_match.group(1).strip("'") if default_match else None

    # AUTO_INCREMENT implica NOT NULL
    if is_auto or is_pk:
        is_nullable = False

    return ColumnSchema(
        name=col_name,
        data_type=data_type,
        is_nullable=is_nullable,
        is_primary_key=is_pk,
        is_unique=is_unique,
        default_value=default_value,
        max_length=max_length
    )


def parse_sql_script(sql_text: str) -> DatabaseSchema:
    """
    Parsea un script SQL completo y retorna un DatabaseSchema.
    Soporta múltiples sentencias CREATE TABLE.
    """
    warnings = []
    sql_clean = _clean_sql(sql_text)

    # Dividir por sentencias
    statements = sqlparse.split(sql_clean)

    tables = []
    for stmt_str in statements:
        stmt_str = stmt_str.strip()
        if not stmt_str:
            continue

        upper = stmt_str.upper()
        if not ("CREATE" in upper and "TABLE" in upper):
            continue

        table = _parse_create_table(stmt_str)
        if table:
            tables.append(table)
        else:
            warnings.append(f"No se pudo parsear: {stmt_str[:80]}...")

    return DatabaseSchema(
        motor="sql_script",
        database_name="script",
        tables=tables
    ), warnings
