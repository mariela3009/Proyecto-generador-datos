/**
 * types/schema.ts
 * TypeScript interfaces that mirror backend Pydantic schemas.
 */

export interface ColumnSchema {
  name: string
  data_type: string
  is_nullable: boolean
  is_primary_key: boolean
  is_unique: boolean
  default_value?: string | null
  foreign_key?: { table: string; column: string } | null
  max_length?: number | null
}

export interface TableSchema {
  name: string
  columns: ColumnSchema[]
  primary_keys: string[]
  foreign_keys: Record<string, string>[]
}

export interface DatabaseSchema {
  motor: string
  database_name: string
  tables: TableSchema[]
}

export interface SavedConnection {
  id: number
  nombre_alias?: string
  motor_bd: string
  host: string
  puerto: number
  nombre_bd: string
  usuario_db?: string
  password_db?: string
  created_at: string
}

export interface ConnectionRequest {
  host: string
  puerto: number
  usuario: string
  password: string
  nombre_bd: string
  motor?: string
}

export interface TestConnectionResult {
  success: boolean
  motor?: string
  database?: string
  tables_count?: number
  error?: string
}
