<!-- BEGIN:agent-rules -->
# Sistema Inteligente Generador de Datos — Skill

Este documento contiene la arquitectura, convenciones y patrones del proyecto **Data Generator** para guiar a cualquier asistente de IA.

## 1. Resumen del Proyecto
- **Nombre**: Sistema Inteligente Generador de Datos
- **Propósito**: Generar datos sintéticos realistas para bases de datos relacionales y NoSQL.
- **Flujo Principal**: Lee el esquema de una BD, envía una muestra a Google Gemini para generar datos contexto-conscientes ("semillas") y los multiplica usando un escalador local (Faker) para generar miles de registros instantáneamente.

## 2. Stack Tecnológico
| Capa | Tecnología |
|------|-----------|
| **Backend** | Python + FastAPI |
| **Frontend** | Next.js 16 + React 19 + TypeScript |
| **BD Interna** | SQLite (via SQLAlchemy) |
| **UI Components** | Radix UI + Tailwind CSS 4 |
| **IA** | Google Gemini 2.5 Flash |
| **Generación** | Faker + Hybrid Multiplier |
| **Auth** | JWT + OAuth (Google/GitHub/Microsoft) |

## 3. Arquitectura del Sistema
```text
┌─────────────────────────────────────────────────┐
│                  FRONTEND (Next.js)             │
│  /login, /register, /(app)/dashboard, /admin    │
└─────────────────┬───────────────────────────────┘
                  │ HTTP (fetch)
                  ▼
┌─────────────────────────────────────────────────┐
│              BACKEND (FastAPI)                  │
│  main.py → /api/v1/*                            │
│                                                 │
│  api/       → Rutas (auth, admin, generator, etc)│
│  generators/→ Lógica de generación (DataGenerator)│
│  connectors/→ Clases de conexión a BD (Factory)  │
│  parsers/   → Análisis de scripts SQL            │
│  core/      → Configuración y BD interna        │
└─────────────────────────────────────────────────┘
```

## 4. Patrones de Diseño Clave
- **Factory Pattern (`connector_factory.py`)**: Detecta el motor de BD por puerto y devuelve la instancia adecuada (`MySQLConnector`, `PostgreSQLConnector`, etc.).
- **Template Method (`BaseConnector`)**: Define la interfaz estándar (`connect`, `disconnect`, `get_schema`, `insert_records`) que deben implementar todos los conectores.
- **Hybrid Pipeline (`data_generator.py`)**: 
  1. `ai_generator.py`: Genera 8 registros semilla usando Gemini.
  2. `hybrid_multiplier.py`: Usa mutación y Faker para escalar a miles.
- **Topological Sort**: Resuelve dependencias de llaves foráneas (FK) antes de generar datos, asegurando la integridad referencial.

## 5. Convenciones de Código
- **Idioma**: Backend en español (nombres de variables y funciones en su mayoría), aunque se mezclan términos técnicos en inglés (ej. `table_name`, `record_count`).
- **Schemas**: Todos los modelos Pydantic de Request/Response están centralizados en `models/schemas.py`.
- **Inyección de Dependencias**: Uso intensivo de dependencias FastAPI (ej. `Depends(get_current_user)`, `Depends(get_db)`).

## 6. Variables de Entorno Clave (`.env`)
- `GEMINI_API_KEY`: Requerido para la IA.
- `DATABASE_URL` (o variables `MYSQL_*`): Conexión a la BD interna (actualmente configurada para forzar SQLite por simplicidad en local).
- `JWT_SECRET_KEY`: Para autenticación.
- `FRONTEND_URL`: Para configuración de CORS.

## 7. Reglas para Modificaciones
- **Añadir un nuevo motor de BD**: 
  1. Crear un archivo en `connectors/` (ej. `oracle_connector.py`) que herede de `BaseConnector`.
  2. Registrarlo en `PORT_TO_ENGINE` y `ENGINE_CLASSES` dentro de `connectors/connector_factory.py`.
- **Mejorar los datos falsos**:
  1. Añadir mapeos Regex o listas estáticas en `generators/faker_mappings.py`.
- **Modificar la IA**:
  1. Editar `system_instruction` en `generators/ai_generator.py`.
<!-- END:agent-rules -->
