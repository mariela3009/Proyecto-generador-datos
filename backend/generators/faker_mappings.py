"""
generators/faker_mappings.py
Mapeo de nombres de columnas y tipos de datos a métodos de Faker.
"""
import re
from typing import Callable, Any
from faker import Faker

# Regex rules para nombres de columna
# El orden importa: los primeros matches tienen prioridad.
NAME_MAPPINGS = [
    (r"(?i)email|correo", "email"),
    (r"(?i)first_name|nombre", "first_name"),
    (r"(?i)last_name|apellido", "last_name"),
    (r"(?i)full_name|nombre_completo", "name"),
    (r"(?i)phone|telefono|tel", "phone_number"),
    (r"(?i)address|direccion", "address"),
    (r"(?i)city|ciudad", "city"),
    (r"(?i)country|pais", "country"),
    (r"(?i)zip|postal|cp", "postcode"),
    (r"(?i)company|empresa", "company"),
    (r"(?i)job|profesion|puesto", "job"),
    (r"(?i)date_of_birth|dob|fecha_nacimiento", "date_of_birth"),
    (r"(?i)date|fecha", "date"),
    (r"(?i)time|hora", "time"),
    (r"(?i)uuid|guid", "uuid4"),
    (r"(?i)password|clave|pwd", "password"),
    (r"(?i)url|website|web", "url"),
    (r"(?i)ip|ip_address", "ipv4"),
    (r"(?i)color", "color_name"),
    (r"(?i)iban", "iban"),
    (r"(?i)credit_card|tarjeta", "credit_card_number"),
    (r"(?i)price|precio|amount|monto|total|costo|cost|valor|value", "pyfloat"),
    (r"(?i)quantity|cantidad|qty|stock|inventory|inventario", "random_int"),
    (r"(?i)description|descripcion|bio|notes|notas", "text"),
    (r"(?i)status|estado", "word"),
]

# Mapping by generic SQL types
TYPE_MAPPINGS = {
    "VARCHAR": "word",
    "CHARACTER VARYING": "word",
    "CHAR": "random_letter",
    "TEXT": "text",
    "INT": "random_int",
    "INTEGER": "random_int",
    "BIGINT": "random_number",
    "SMALLINT": "random_int",
    "TINYINT": "boolean",
    "FLOAT": "pyfloat",
    "DOUBLE": "pyfloat",
    "DOUBLE PRECISION": "pyfloat",
    "REAL": "pyfloat",
    "DECIMAL": "pyfloat",
    "NUMERIC": "pyfloat",
    "DATE": "date",
    "DATETIME": "date_time",
    "TIMESTAMP": "date_time",
    "TIMESTAMP WITH TIME ZONE": "date_time",
    "TIMESTAMP WITHOUT TIME ZONE": "date_time",
    "TIMESTAMPTZ": "date_time",
    "TIME": "time",
    "TIME WITH TIME ZONE": "time",
    "BOOLEAN": "boolean",
    "BOOL": "boolean",
    "JSON": "json",
    "JSONB": "json",
    "UUID": "uuid4",
    "BYTEA": "binary",
}

def get_faker_method_for_column(fake: Faker, column_name: str, data_type: str) -> Callable[[], Any]:
    """
    Determina qué método de Faker usar para una columna basándose
    en su nombre o, en su defecto, en su tipo de dato.
    """
    # 1. Intentar por nombre de columna
    for pattern, method_name in NAME_MAPPINGS:
        if re.search(pattern, column_name):
            # Precio: devolver float positivo con 2 decimales (no pricetag)
            if method_name == "pyfloat":
                return lambda: round(fake.pyfloat(left_digits=4, right_digits=2, positive=True, min_value=0.01, max_value=9999.99), 2)
            # Stock/cantidad: entero positivo pequeño
            if method_name == "random_int":
                return lambda: fake.random_int(min=0, max=1000)
            if hasattr(fake, method_name):
                return getattr(fake, method_name)

    # 2. Intentar por tipo de dato (simplificado, ej. ignorando la longitud)
    base_type = data_type.split('(')[0].upper().strip()
    method_name = TYPE_MAPPINGS.get(base_type)
    if method_name and hasattr(fake, method_name):
        return getattr(fake, method_name)

    # 3. Fallback: un número o palabra aleatoria
    if any(t in base_type for t in ("INT", "NUM", "SERIAL", "REAL", "FLOAT", "DOUBLE", "DECIMAL", "NUMERIC")):
        return lambda: round(fake.pyfloat(left_digits=4, right_digits=2, positive=True), 2)
    return fake.word

