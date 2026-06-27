"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  ScrollText, 
  ShieldAlert, 
  Loader2, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  X,
  FileText
} from "lucide-react"

interface LogItem {
  id: number
  usuario_id: number | null
  usuario_nombre: string | null
  accion: string
  detalle: string | null
  ip_address: string | null
  nivel: string
  created_at: string
}

interface PaginatedLogs {
  items: LogItem[]
  total: number
  page: number
  per_page: number
  pages: number
}

export default function LogsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // State
  const [logsData, setLogsData] = useState<PaginatedLogs | null>(null)
  const [page, setPage] = useState(1)
  const [nivel, setNivel] = useState("")
  const [accion, setAccion] = useState("")
  const [loading, setLoading] = useState(true)
  
  // Selected log for detailed view modal
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      let query = `/admin/logs?page=${page}&per_page=15`
      if (nivel) query += `&nivel=${nivel}`
      if (accion) query += `&accion=${accion}`

      const res = await api.get<PaginatedLogs>(query)
      setLogsData(res)
    } catch (e) {
      console.error("Error fetching system logs:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (session && session.user?.role !== "superadmin") {
      // Access denied handled below
    } else if (session) {
      fetchLogs()
    }
  }, [session, status, page, nivel])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchLogs()
  }

  if (status === "loading") {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center gap-2 text-slate-500 text-sm">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Cargando bitácora...
      </div>
    )
  }

  if (session?.user?.role !== "superadmin") {
    return (
      <div className="p-8 max-w-lg mx-auto mt-20 text-center space-y-4">
        <div className="h-14 w-14 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Acceso Denegado</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Esta zona del sistema está reservada de forma exclusiva para el Superadmin. Si crees que esto es un error, por favor contacta con soporte técnico.
        </p>
        <Link href="/dashboard">
          <Button className="mt-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow">
            Volver al Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/admin">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-primary" />
              System Logs Audit
            </h1>
          </div>
          <p className="text-muted-foreground text-xs pl-10">
            Registro total de operaciones, depuraciones y auditorías de seguridad del sistema.
          </p>
        </div>
      </div>

      {/* Filters Form */}
      <Card className="border-slate-200/80 shadow-sm bg-white">
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-end gap-4">
            {/* Level Filter */}
            <div className="space-y-1.5 w-full sm:w-44">
              <label htmlFor="level-filter" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Nivel de Log
              </label>
              <select
                id="level-filter"
                value={nivel}
                onChange={(e) => {
                  setNivel(e.target.value)
                  setPage(1)
                }}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="">Todos los niveles</option>
                <option value="INFO">INFO (Exitosos)</option>
                <option value="WARNING">WARNING (Avisos)</option>
                <option value="ERROR">ERROR (Fallas)</option>
                <option value="CRITICAL">CRITICAL (Críticos)</option>
              </select>
            </div>

            {/* Action Search */}
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <label htmlFor="action-search" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Filtrar por Acción
              </label>
              <div className="relative">
                <Input
                  id="action-search"
                  type="text"
                  placeholder="Ej: LOGIN, CONEXION_CREADA, GENERATE..."
                  value={accion}
                  onChange={(e) => setAccion(e.target.value)}
                  className="h-9 text-xs pl-8 pr-3"
                />
                <Filter className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <Button type="submit" className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-4">
              Aplicar filtros
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0 relative">
          
          {loading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex items-center justify-center text-xs text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
              Cargando logs actualizados...
            </div>
          )}

          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                  <th className="p-3 pl-5">Timestamp</th>
                  <th className="p-3">Level</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">User / Author</th>
                  <th className="p-3">IP Address</th>
                  <th className="p-3 pr-5 text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {logsData?.items.map((log) => (
                  <tr 
                    key={log.id} 
                    onClick={() => setSelectedLog(log)}
                    className="border-b border-slate-150 hover:bg-slate-50/50 cursor-pointer transition-all"
                  >
                    <td className="p-3 pl-5 font-mono text-slate-450">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <Badge 
                        variant="outline" 
                        className={`text-[9px] font-bold py-0.5 px-2 rounded-full uppercase ${
                          log.nivel === "ERROR" || log.nivel === "CRITICAL"
                            ? "bg-red-50 text-red-700 border-red-100"
                            : log.nivel === "WARNING"
                            ? "bg-amber-50 text-amber-700 border-amber-100"
                            : "bg-blue-50 text-blue-700 border-blue-100"
                        }`}
                      >
                        {log.nivel}
                      </Badge>
                    </td>
                    <td className="p-3 font-semibold text-slate-800">
                      {log.accion}
                    </td>
                    <td className="p-3 text-slate-600">
                      {log.usuario_nombre || "SYSTEM"}
                    </td>
                    <td className="p-3 font-mono text-slate-500">
                      {log.ip_address || "127.0.0.1"}
                    </td>
                    <td className="p-3 pr-5 text-right">
                      <button className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
                {logsData?.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 italic">
                      No se encontraron registros de logs con los filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {logsData && logsData.pages > 1 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <p>
                Mostrando página <strong className="text-slate-800">{logsData.page}</strong> de <strong className="text-slate-800">{logsData.pages}</strong> ({logsData.total} logs totales)
              </p>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === logsData.pages}
                  onClick={() => setPage((p) => Math.min(p + 1, logsData.pages))}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[2px] animate-in fade-in duration-200">
          <Card className="w-full max-w-xl border-slate-200/80 shadow-2xl bg-white overflow-hidden animate-in zoom-in-95 duration-200">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-base font-bold">Detalle del Registro de Auditoría</CardTitle>
                </div>
                <CardDescription className="text-xs">ID de Log: {selectedLog.id}</CardDescription>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>

            <CardContent className="p-6 space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 bg-slate-50 p-2.5 rounded border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha y Hora</p>
                  <p className="font-semibold text-slate-800">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
                <div className="space-y-1 bg-slate-50 p-2.5 rounded border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nivel de Alerta</p>
                  <div>
                    <Badge className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                      selectedLog.nivel === "ERROR" || selectedLog.nivel === "CRITICAL"
                        ? "bg-red-50 text-red-700 border border-red-100"
                        : "bg-blue-50 text-blue-700 border border-blue-100"
                    }`}>
                      {selectedLog.nivel}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1 bg-slate-50 p-2.5 rounded border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operación / Acción</p>
                  <p className="font-mono font-bold text-slate-900">{selectedLog.accion}</p>
                </div>
                <div className="space-y-1 bg-slate-50 p-2.5 rounded border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dirección IP</p>
                  <p className="font-mono text-slate-700">{selectedLog.ip_address || "127.0.0.1"}</p>
                </div>
              </div>

              <div className="space-y-1 bg-slate-50 p-2.5 rounded border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Usuario Responsable</p>
                <p className="text-slate-800 font-semibold">
                  {selectedLog.usuario_nombre || "SYSTEM (Acción del Servidor)"}
                  {selectedLog.usuario_id && ` [ID: ${selectedLog.usuario_id}]`}
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detalles Adicionales / Descripción</p>
                <pre className="bg-slate-950 text-slate-100 p-3.5 rounded-lg font-mono text-[10px] leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap">
                  {selectedLog.detalle || "Sin descripción detallada registrada."}
                </pre>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => setSelectedLog(null)} className="h-9 text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-4">
                  Cerrar
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

    </div>
  )
}
