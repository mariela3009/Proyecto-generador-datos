"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { DatabaseSchema, ConnectionRequest, TableSchema } from "@/types/schema"
import { 
  Play, 
  Download, 
  Database, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  FileCode,
  FileJson,
  FileSpreadsheet
} from "lucide-react"

interface GeneratorConfigPanelProps {
  schema: DatabaseSchema
  connection?: ConnectionRequest
  onBack?: () => void
}

interface TableConfig {
  table_name: string
  record_count: number
  selected: boolean
}

export default function GeneratorConfigPanel({ schema, connection, onBack }: GeneratorConfigPanelProps) {
  // Initialize table configs
  const [tableConfigs, setTableConfigs] = useState<TableConfig[]>(
    schema.tables.map((t) => ({
      table_name: t.name,
      record_count: 50,
      selected: true,
    }))
  )
  const [locale, setLocale] = useState("es_ES")
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({})
  
  // Loading & State
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  // Preview State
  const [previewData, setPreviewData] = useState<Record<string, { columns: string[]; rows: any[][] }> | null>(null)
  const [activePreviewTab, setActivePreviewTab] = useState("")
  const [previewLoading, setPreviewLoading] = useState(false)
  
  // Direct Insertion Logs State
  const [insertResult, setInsertResult] = useState<{
    success: boolean
    tables_processed: number
    total_inserted: number
    total_errors: number
    logs: string[]
  } | null>(null)

  const toggleTableExpand = (name: string) => {
    setExpandedTables((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  const handleConfigChange = (name: string, field: keyof TableConfig, value: any) => {
    setTableConfigs((prev) =>
      prev.map((c) => (c.table_name === name ? { ...c, [field]: value } : c))
    )
  }

  const getSelectedConfigs = () => {
    return tableConfigs.filter((c) => c.selected)
  }

  // Preview Generated Data
  const handlePreview = async () => {
    const selectedConfigs = getSelectedConfigs()
    if (selectedConfigs.length === 0) {
      setError("Por favor selecciona al menos una tabla para generar datos.")
      return
    }
    setError("")
    setPreviewLoading(true)
    setPreviewData(null)
    setInsertResult(null)

    try {
      const data = await api.post<Record<string, { table_name: string; columns: string[]; rows: any[][] }>>(
        "/generate/preview",
        {
          schema,
          table_configs: selectedConfigs,
          preview_rows: 5,
          locale,
        }
      )
      setPreviewData(data)
      // Set first table as active tab
      const firstTab = Object.keys(data)[0] || ""
      setActivePreviewTab(firstTab)
    } catch (e: any) {
      setError(e.message || "Error al generar la vista previa.")
    } finally {
      setPreviewLoading(false)
    }
  }

  // Export File (SQL, CSV, JSON)
  const handleExport = async (format: "sql" | "csv" | "json") => {
    const selectedConfigs = getSelectedConfigs()
    if (selectedConfigs.length === 0) {
      setError("Por favor selecciona al menos una tabla para exportar.")
      return
    }
    setError("")
    setLoading(true)
    setInsertResult(null)

    try {
      const result = await api.post<{ download_url: string; filename: string }>(
        "/generate/export",
        {
          schema,
          table_configs: selectedConfigs,
          format,
          locale,
        }
      )
      
      // Trigger download
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
      // Remove /api/v1 to get localhost:8000
      const baseUrl = apiBaseUrl.replace("/api/v1", "")
      const fullUrl = `${baseUrl}${result.download_url}`
      window.open(fullUrl, "_blank")
    } catch (e: any) {
      setError(e.message || "Error al exportar los datos.")
    } finally {
      setLoading(false)
    }
  }

  // Direct Insertion into DB
  const handleDirectInsert = async () => {
    if (!connection) return
    const selectedConfigs = getSelectedConfigs()
    if (selectedConfigs.length === 0) {
      setError("Por favor selecciona al menos una tabla para insertar.")
      return
    }
    setError("")
    setLoading(true)
    setInsertResult(null)
    setPreviewData(null)

    try {
      const result = await api.post<any>("/connect/insert", {
        connection,
        schema,
        table_configs: selectedConfigs,
        locale,
      })
      setInsertResult(result)
    } catch (e: any) {
      setError(e.message || "Error durante la inserción en la base de datos.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Configurar Generación de Datos
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Base de datos detectada: <strong className="text-foreground">{schema.database_name}</strong> ({schema.motor})
          </p>
        </div>
        {onBack && (
          <Button variant="outline" size="sm" onClick={onBack}>
            Atrás
          </Button>
        )}
      </div>

      {/* Grid configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Table Config List */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Tablas a procesar</CardTitle>
              <CardDescription className="text-xs">
                Selecciona las tablas que deseas incluir y la cantidad de registros.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {schema.tables.map((table) => {
                const config = tableConfigs.find((c) => c.table_name === table.name)
                const isSelected = config?.selected ?? false
                const count = config?.record_count ?? 50
                const isExpanded = !!expandedTables[table.name]

                return (
                  <div key={table.name} className="border border-border/50 rounded-lg p-3 bg-card/50 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleConfigChange(table.name, "selected", e.target.checked)}
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                        <div>
                          <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                            {table.name}
                            <Badge variant="outline" className="text-[10px] py-0 px-1 bg-muted">
                              {table.columns.length} col.
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isSelected && (
                          <div className="flex items-center gap-2">
                            <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Filas:</Label>
                            <Input
                              type="number"
                              min={1}
                              max={50000}
                              value={count}
                              onChange={(e) => handleConfigChange(table.name, "record_count", Number(e.target.value))}
                              className="h-8 w-20 text-xs px-2"
                            />
                          </div>
                        )}
                        <button
                          onClick={() => toggleTableExpand(table.name)}
                          className="text-muted-foreground hover:text-foreground p-1"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border/40 pt-2.5 space-y-1.5">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Estructura de Columnas
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          {table.columns.map((col) => (
                            <div key={col.name} className="flex items-center justify-between bg-muted/40 py-1 px-2 rounded border border-border/30">
                              <span className="font-mono text-foreground truncate max-w-[140px]" title={col.name}>
                                {col.name} {col.is_primary_key && "🔑"} {col.foreign_key && "🔗"}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-medium uppercase truncate max-w-[100px]" title={col.data_type}>
                                {col.data_type}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Action Panel */}
        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Parámetros de Generación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Locale */}
              <div className="space-y-1.5">
                <Label htmlFor="locale-select" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Idioma / Localización (Faker)
                </Label>
                <select
                  id="locale-select"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  <option value="es_ES">Español (España) - es_ES</option>
                  <option value="es_MX">Español (México) - es_MX</option>
                  <option value="en_US">Inglés (EEUU) - en_US</option>
                  <option value="fr_FR">Francés (Francia) - fr_FR</option>
                  <option value="pt_BR">Portugués (Brasil) - pt_BR</option>
                </select>
              </div>

              {/* Error messages */}
              {error && (
                <div className="bg-destructive/15 text-destructive text-xs p-3 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p className="leading-tight">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                
                {/* Preview */}
                <Button
                  variant="outline"
                  onClick={handlePreview}
                  disabled={loading || previewLoading}
                  className="w-full h-10 text-primary border-primary/30 hover:bg-primary/5 font-semibold text-xs"
                >
                  {previewLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Vista Previa (5 Filas)
                </Button>

                {/* Direct Insert - only if database connection exists */}
                {connection && (
                  <Button
                    onClick={handleDirectInsert}
                    disabled={loading || previewLoading}
                    className="w-full h-10 bg-primary hover:bg-primary/90 text-white font-semibold text-xs"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Database className="h-4 w-4 mr-2" />
                    )}
                    Insertar Directo en BD
                  </Button>
                )}

                {/* Divider */}
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Exportar a Archivo</span>
                  </div>
                </div>

                {/* Export SQL */}
                <Button
                  variant="outline"
                  onClick={() => handleExport("sql")}
                  disabled={loading || previewLoading}
                  className="w-full h-9 justify-start text-xs border-slate-200"
                >
                  <FileCode className="h-4 w-4 mr-2.5 text-blue-500" />
                  Descargar Script SQL (.sql)
                </Button>

                {/* Export CSV */}
                <Button
                  variant="outline"
                  onClick={() => handleExport("csv")}
                  disabled={loading || previewLoading}
                  className="w-full h-9 justify-start text-xs border-slate-200"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2.5 text-green-500" />
                  Descargar Archivos CSV (.zip / .csv)
                </Button>

                {/* Export JSON */}
                <Button
                  variant="outline"
                  onClick={() => handleExport("json")}
                  disabled={loading || previewLoading}
                  className="w-full h-9 justify-start text-xs border-slate-200"
                >
                  <FileJson className="h-4 w-4 mr-2.5 text-yellow-500" />
                  Descargar Archivo JSON (.json)
                </Button>

              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Result Sections */}

      {/* Preview Section */}
      {previewData && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Previsualización de Datos Generados</CardTitle>
            <CardDescription className="text-xs">
              Muestra simulada de los primeros 5 registros generados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Table Tabs */}
            <div className="flex border-b border-border overflow-x-auto gap-2">
              {Object.keys(previewData).map((tName) => (
                <button
                  key={tName}
                  onClick={() => setActivePreviewTab(tName)}
                  className={`py-2 px-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                    activePreviewTab === tName
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tName}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activePreviewTab && previewData[activePreviewTab] && (
              <div className="overflow-x-auto border border-border/50 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      {previewData[activePreviewTab].columns.map((colName) => (
                        <th key={colName} className="p-2.5 font-semibold text-foreground border-r border-border/40">
                          {colName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData[activePreviewTab].rows.length === 0 ? (
                      <tr>
                        <td colSpan={previewData[activePreviewTab].columns.length} className="p-4 text-center text-muted-foreground">
                          No se generaron registros.
                        </td>
                      </tr>
                    ) : (
                      previewData[activePreviewTab].rows.map((row, idx) => (
                        <tr key={idx} className="border-b border-border/40 hover:bg-muted/30">
                          {row.map((val, cellIdx) => (
                            <td key={cellIdx} className="p-2.5 font-mono text-muted-foreground border-r border-border/30 truncate max-w-[200px]">
                              {val === null || val === undefined ? (
                                <span className="text-destructive/50 italic text-[10px]">NULL</span>
                              ) : typeof val === "object" ? (
                                JSON.stringify(val)
                              ) : (
                                String(val)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Direct Insertion Logs Console */}
      {insertResult && (
        <Card className={`border border-border/60 ${insertResult.success ? "border-green-300" : "border-red-300"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {insertResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              Inserción Directa Finalizada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-4 text-center bg-muted/40 p-3 rounded-lg border border-border/30">
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Tablas Procesadas</p>
                <p className="text-lg font-bold text-foreground">{insertResult.tables_processed}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Registros Insertados</p>
                <p className="text-lg font-bold text-green-600">{insertResult.total_inserted}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Errores</p>
                <p className="text-lg font-bold text-red-600">{insertResult.total_errors}</p>
              </div>
            </div>

            {/* Execution logs */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Bitácora de Ejecución</p>
              <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] h-32 overflow-y-auto space-y-1">
                {insertResult.logs.map((log, idx) => (
                  <p key={idx} className="leading-tight">
                    <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span> {log}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
