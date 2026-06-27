"""
generators/exporters.py
Funciones para exportar los datos generados a distintos formatos.
"""
import os
import csv
import json
import uuid
from typing import Dict, Any
from backend.models.schemas import DatabaseSchema

TEMP_DIR = "/tmp/data_generator"
os.makedirs(TEMP_DIR, exist_ok=True)

def export_sql(data: Dict[str, Dict[str, Any]], schema: DatabaseSchema) -> str:
    """
    Genera un archivo .sql con sentencias INSERT.
    """
    file_id = str(uuid.uuid4())
    filepath = os.path.join(TEMP_DIR, f"{file_id}.sql")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(f"-- Datos generados para {schema.database_name}\n\n")
        
        for table_name, table_data in data.items():
            columns = table_data["columns"]
            rows = table_data["rows"]
            
            if not rows:
                continue
                
            f.write(f"-- Tabla: {table_name}\n")
            cols_str = ", ".join(f"`{c}`" for c in columns)
            
            for row in rows:
                vals = []
                for val in row:
                    if val is None:
                        vals.append("NULL")
                    elif isinstance(val, bool):
                        vals.append("TRUE" if val else "FALSE")
                    elif isinstance(val, (int, float)):
                        vals.append(str(val))
                    else:
                        # Escapar comillas simples
                        escaped_val = str(val).replace("'", "''")
                        vals.append(f"'{escaped_val}'")
                        
                vals_str = ", ".join(vals)
                f.write(f"INSERT INTO `{table_name}` ({cols_str}) VALUES ({vals_str});\n")
            
            f.write("\n")
            
    return file_id

def export_csv(data: Dict[str, Dict[str, Any]]) -> str:
    """
    Genera un archivo CSV. Si hay múltiples tablas, crea un ZIP con varios CSV.
    Por simplicidad, si es una tabla, retorna el CSV directo.
    Para múltiples tablas en este MVP concatena con separadores, o crea un JSON (mejor usar export_json).
    Aquí crearemos un archivo CSV si es una sola tabla, si son varias, tomaremos la primera o 
    crearemos un archivo .csv general con nombre de tabla.
    """
    import zipfile
    
    file_id = str(uuid.uuid4())
    
    if len(data) == 1:
        table_name = list(data.keys())[0]
        filepath = os.path.join(TEMP_DIR, f"{file_id}.csv")
        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(data[table_name]["columns"])
            writer.writerows(data[table_name]["rows"])
        return file_id
    
    # Si hay múltiples tablas, crear un ZIP con los CSV
    zip_filepath = os.path.join(TEMP_DIR, f"{file_id}.zip")
    with zipfile.ZipFile(zip_filepath, 'w') as zipf:
        for table_name, table_data in data.items():
            csv_path = os.path.join(TEMP_DIR, f"{table_name}.csv")
            with open(csv_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(table_data["columns"])
                writer.writerows(table_data["rows"])
            zipf.write(csv_path, f"{table_name}.csv")
            os.remove(csv_path)
            
    return file_id

def export_json(data: Dict[str, Dict[str, Any]]) -> str:
    """
    Genera un archivo .json estructurado.
    """
    file_id = str(uuid.uuid4())
    filepath = os.path.join(TEMP_DIR, f"{file_id}.json")
    
    output = {}
    for table_name, table_data in data.items():
        columns = table_data["columns"]
        rows = table_data["rows"]
        # Convert list of rows to list of dicts
        output[table_name] = [dict(zip(columns, row)) for row in rows]
        
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
        
    return file_id
