"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, Zap, ArrowRight, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { ConnectionRequest, DatabaseSchema, TestConnectionResult } from "@/types/schema"
import { type Engine } from "./EngineSelector"

interface ConnectionFormProps {
  engine: Engine | null
  defaultPort: number
  onSchemaDetected: (schema: DatabaseSchema, req: ConnectionRequest) => void
  initialForm?: ConnectionRequest
}

export default function ConnectionForm({ engine, defaultPort, onSchemaDetected, initialForm }: ConnectionFormProps) {
  const [form, setForm] = useState<ConnectionRequest>(
    initialForm || {
      host: "",
      puerto: defaultPort,
      usuario: "",
      password: "",
      nombre_bd: "",
      motor: engine ?? undefined,
    }
  )
  const [showPassword, setShowPassword] = useState(false)
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "ok" | "error">("idle")
  const [testMessage, setTestMessage] = useState("")
  const [connectLoading, setConnectLoading] = useState(false)
  const [saveConn, setSaveConn] = useState(true)

  const set = (field: keyof ConnectionRequest, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Sync port and motor when engine changes from outside
  if (form.motor !== engine && engine) {
    setForm((prev) => ({ ...prev, motor: engine, puerto: defaultPort }))
  }

  const handleTest = async () => {
    if (!engine) return
    setTestStatus("loading")
    setTestMessage("")
    try {
      const result = await api.post<TestConnectionResult>("/connect/test", { ...form, motor: engine })
      if (result.success) {
        setTestStatus("ok")
        setTestMessage(`Conexión exitosa · ${result.tables_count} tabla(s) detectadas`)
      } else {
        setTestStatus("error")
        setTestMessage(result.error ?? "Error desconocido")
      }
    } catch (e: unknown) {
      setTestStatus("error")
      setTestMessage(e instanceof Error ? e.message : "No se pudo conectar al servidor")
    }
  }

  const handleConnect = async () => {
    if (!engine) return
    setConnectLoading(true)
    try {
      const schema = await api.post<DatabaseSchema>("/connect/schema", { ...form, motor: engine })
      onSchemaDetected(schema, { ...form, motor: engine })
    } catch (e: unknown) {
      setTestStatus("error")
      setTestMessage(e instanceof Error ? e.message : "Error al analizar el esquema")
    } finally {
      setConnectLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-foreground">Connection Parameters</h2>

      {/* Row: Host + Port */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Host Address</Label>
          <Input
            placeholder="db.example.com or 127.0.0.1"
            value={form.host}
            onChange={(e) => set("host", e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Port</Label>
          <Input
            type="number"
            value={form.puerto}
            onChange={(e) => set("puerto", Number(e.target.value))}
            className="h-10"
          />
        </div>
      </div>

      {/* Database Name */}
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Database Name</Label>
        <Input
          placeholder="my_database"
          value={form.nombre_bd}
          onChange={(e) => set("nombre_bd", e.target.value)}
          className="h-10"
        />
      </div>

      {/* User + Password */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Username</Label>
          <Input
            placeholder="db_user"
            value={form.usuario}
            onChange={(e) => set("usuario", e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              className="h-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Save connection checkbox */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={saveConn}
          onChange={(e) => setSaveConn(e.target.checked)}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        <span className="text-sm text-muted-foreground">Save connection for future use</span>
      </label>

      {/* Test result feedback */}
      {testStatus !== "idle" && (
        <div className={`flex items-center gap-2 text-sm py-2 px-3 rounded-lg ${
          testStatus === "ok"      ? "bg-green-50 text-green-700"
          : testStatus === "error" ? "bg-red-50 text-red-700"
          : "bg-muted text-muted-foreground"
        }`}>
          {testStatus === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
          {testStatus === "ok"      && <CheckCircle2 className="h-4 w-4" />}
          {testStatus === "error"   && <XCircle className="h-4 w-4" />}
          <span>{testStatus === "loading" ? "Probando conexión..." : testMessage}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-1">
        <Button variant="outline" onClick={() => setForm({ host: "", puerto: defaultPort, usuario: "", password: "", nombre_bd: "", motor: engine ?? undefined })}>
          Cancel
        </Button>
        <Button
          variant="outline"
          onClick={handleTest}
          disabled={!engine || !form.host || testStatus === "loading"}
          className="text-primary border-primary/30 hover:bg-primary/5"
        >
          {testStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
          Test Connection
        </Button>
        <Button
          onClick={handleConnect}
          disabled={!engine || !form.host || !form.nombre_bd || connectLoading}
          className="ml-auto bg-primary hover:bg-primary/90 text-white"
        >
          {connectLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
          Connect & Analyze
        </Button>
      </div>
    </div>
  )
}
