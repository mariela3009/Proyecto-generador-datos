"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import GeneratorConfigPanel from "@/components/connect/GeneratorConfigPanel"
import { DatabaseSchema } from "@/types/schema"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, Code2, AlertTriangle, Play, Upload } from "lucide-react"

export default function EditorPage() {
  const [sqlContent, setSqlContent] = useState("")
  const [schema, setSchema] = useState<DatabaseSchema | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        setSqlContent(event.target.result as string)
      }
    }
    reader.readAsText(file)
  }

  const handleAnalyze = async () => {
    if (!sqlContent.trim()) {
      setError("Por favor escribe o sube un script SQL.")
      return
    }

    setLoading(true)
    setError("")
    setWarnings([])

    try {
      const result = await api.post<{ success: boolean; schema?: DatabaseSchema; warnings: string[]; error?: string }>(
        "/parser/analyze",
        { sql_content: sqlContent }
      )

      if (result.success && result.schema) {
        setSchema(result.schema)
        setWarnings(result.warnings)
      } else {
        setError(result.error || "No se encontraron tablas válidas en el script.")
      }
    } catch (e: any) {
      setError(e.message || "Error al procesar el archivo SQL.")
    } finally {
      setLoading(false)
    }
  }

  if (schema) {
    return (
      <div className="p-8 max-w-5xl">
        {warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs p-3 rounded-lg flex items-start gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-yellow-600" />
            <div>
              <p className="font-semibold">Advertencias del Parser SQL:</p>
              <ul className="list-disc pl-4 space-y-0.5 mt-1">
                {warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <GeneratorConfigPanel 
          schema={schema} 
          onBack={() => {
            setSchema(null)
            setWarnings([])
          }} 
        />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Code2 className="h-6 w-6 text-primary" />
          SQL Script Mode (DDL)
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pega un script DDL (sentencias <code>CREATE TABLE</code>) o sube un archivo <code>.sql</code> para detectar la estructura de tus tablas y columnas.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Script SQL DDL</CardTitle>
                <CardDescription className="text-xs">Introduce sentencias CREATE TABLE estándar.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="sql-upload" className="cursor-pointer">
                  <div className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-all">
                    <Upload className="h-3.5 w-3.5" />
                    Subir archivo .sql
                  </div>
                </Label>
                <input
                  id="sql-upload"
                  type="file"
                  accept=".sql"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-5 space-y-4">
            <textarea
              className="w-full h-80 p-4 rounded-lg border border-border bg-slate-950 text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-y"
              placeholder={`-- Ejemplo de script DDL
CREATE TABLE usuarios (
    id INT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    fecha_registro TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pedidos (
    pedido_id INT PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id),
    total DECIMAL(10,2) NOT NULL
);`}
              value={sqlContent}
              onChange={(e) => setSqlContent(e.target.value)}
            />

            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <Button
                onClick={handleAnalyze}
                disabled={loading || !sqlContent.trim()}
                className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs h-10 px-5"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analizando SQL...
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 mr-2" />
                    Analizar Script & Configurar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
