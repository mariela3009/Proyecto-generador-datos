"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Activity, 
  Database, 
  ShieldAlert, 
  Loader2, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp, 
  RefreshCw,
  Search,
  Eye,
  ArrowRight
} from "lucide-react"

interface OverviewStats {
  total_usuarios: number
  usuarios_activos: number
  total_registros_generados: number
  total_registros_insertados: number
  logins_hoy: number
}

interface LoginStat {
  fecha: string
  cantidad: number
}

interface EngineStat {
  motor: string
  cantidad: number
}

interface LogItem {
  id: number
  usuario_nombre: string | null
  accion: string
  detalle: string | null
  ip_address: string | null
  nivel: string
  created_at: string
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // State
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [loginStats, setLoginStats] = useState<LoginStat[]>([])
  const [loginPeriod, setLoginPeriod] = useState<"day" | "week" | "month">("week")
  const [engineStats, setEngineStats] = useState<EngineStat[]>([])
  const [recentLogs, setRecentLogs] = useState<LogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; x: number; y: number; val: LoginStat } | null>(null)

  const fetchData = async () => {
    try {
      const [overviewData, loginsRes, enginesRes, logsRes] = await Promise.all([
        api.get<OverviewStats>("/admin/stats/overview"),
        api.get<{ data: LoginStat[] }>(`/admin/stats/logins?period=${loginPeriod}`),
        api.get<{ data: EngineStat[] }>("/admin/stats/engines"),
        api.get<{ items: LogItem[] }>("/admin/logs?page=1&per_page=5")
      ])
      
      setStats(overviewData)
      setLoginStats(loginsRes.data)
      setEngineStats(enginesRes.data)
      setRecentLogs(logsRes.items)
    } catch (e) {
      console.error("Error loading admin stats:", e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (session && session.user?.role !== "superadmin") {
      // Redirect or show access denied
    } else if (session) {
      fetchData()
    }
  }, [session, status, loginPeriod])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center gap-2 text-slate-500 text-sm">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Cargando analíticas...
      </div>
    )
  }

  // Double check authorization
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

  // Calculations for custom SVG line chart
  const padding = 40
  const chartHeight = 200
  const chartWidth = 560
  const maxVal = Math.max(...loginStats.map((d) => d.cantidad), 5) // ensure no div by zero
  
  const getCoordinates = () => {
    if (loginStats.length === 0) return []
    const spacing = (chartWidth - padding * 2) / (loginStats.length - 1 || 1)
    return loginStats.map((item, idx) => {
      const x = padding + idx * spacing
      const y = chartHeight - padding - (item.cantidad / maxVal) * (chartHeight - padding * 2)
      return { x, y, item }
    })
  }

  const coordinates = getCoordinates()
  
  // Format line path string
  let linePath = ""
  let areaPath = ""
  if (coordinates.length > 0) {
    linePath = `M ${coordinates[0].x} ${coordinates[0].y} ` + coordinates.slice(1).map((c) => `L ${c.x} ${c.y}`).join(" ")
    areaPath = `${linePath} L ${coordinates[coordinates.length - 1].x} ${chartHeight - padding} L ${coordinates[0].x} ${chartHeight - padding} Z`
  }

  // Donut chart calculations
  const totalEnginesCount = engineStats.reduce((acc, curr) => acc + curr.cantidad, 0)
  const defaultEngines = [
    { motor: "PostgreSQL", cantidad: 45, color: "#2563eb" },
    { motor: "MySQL", cantidad: 30, color: "#10b981" },
    { motor: "MongoDB", cantidad: 25, color: "#06b6d4" }
  ]
  
  const formattedEngines = totalEnginesCount > 0 
    ? engineStats.map((item, idx) => ({
        motor: item.motor === "postgresql" ? "PostgreSQL" : item.motor === "mysql" ? "MySQL" : item.motor === "mongodb" ? "MongoDB" : item.motor.toUpperCase(),
        cantidad: item.cantidad,
        color: idx === 0 ? "#2563eb" : idx === 1 ? "#10b981" : idx === 2 ? "#06b6d4" : "#8b5cf6"
      }))
    : defaultEngines

  let accumulatedPercent = 0
  const segments = formattedEngines.map((engine) => {
    const total = totalEnginesCount || 100
    const percent = (engine.cantidad / total) * 100
    const dashArray = `${percent} ${100 - percent}`
    const dashOffset = 100 - accumulatedPercent + 25 // align start at top
    accumulatedPercent += percent
    return { ...engine, percent, dashArray, dashOffset }
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Superadmin Analytics Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Real-time telemetry and system-wide metrics overview.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="h-9 px-3 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing && "animate-spin"}`} />
            Actualizar datos
          </Button>
          <div className="h-9 w-px bg-slate-200" />
          <Badge variant="outline" className="h-8 bg-blue-50 text-blue-700 font-bold border-blue-100 flex items-center gap-1.5 px-3">
            <Activity className="h-3 w-3 animate-pulse" />
            Live Telemetry
          </Badge>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Users */}
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Users</span>
              <p className="text-3xl font-extrabold text-slate-900">
                {(stats?.total_usuarios ?? 0).toLocaleString()}
              </p>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span>+12.5%</span>
              </div>
            </div>
            <div className="h-11 w-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Active Sessions */}
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Sessions</span>
              <p className="text-3xl font-extrabold text-slate-900">
                {(stats?.usuarios_activos ?? 0).toLocaleString()}
              </p>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span>+3.2%</span>
              </div>
            </div>
            <div className="h-11 w-11 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Records Generated */}
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Records Generated</span>
              <p className="text-3xl font-extrabold text-slate-900">
                {(stats?.total_registros_generados ?? 0).toLocaleString()}
              </p>
              <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600">
                <ArrowDownRight className="h-3.5 w-3.5" />
                <span>-1.1%</span>
              </div>
            </div>
            <div className="h-11 w-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <Database className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Line Chart */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold">Logins over Time</CardTitle>
              <CardDescription className="text-xs">Estadísticas detalladas de accesos al sistema.</CardDescription>
            </div>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
              {(["day", "week", "month"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setLoginPeriod(p)}
                  className={`py-1 px-2.5 rounded-md uppercase transition-all ${
                    loginPeriod === p 
                      ? "bg-white text-slate-900 shadow-sm" 
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {p === "day" ? "1D" : p === "week" ? "7D" : "30D"}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-6 relative">
            
            {/* SVG line chart */}
            <div className="w-full overflow-hidden flex justify-center">
              <svg 
                viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                className="w-full max-w-[560px] h-[200px]"
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Dashed Grid Lines */}
                {[0, 1, 2, 3].map((g) => {
                  const y = padding + (g * (chartHeight - padding * 2)) / 3
                  const val = Math.round(maxVal - (g * maxVal) / 3)
                  return (
                    <g key={g}>
                      <line 
                        x1={padding} 
                        y1={y} 
                        x2={chartWidth - padding} 
                        y2={y} 
                        stroke="#f1f5f9" 
                        strokeWidth="1" 
                        strokeDasharray="4 4" 
                      />
                      <text 
                        x={padding - 10} 
                        y={y + 3} 
                        textAnchor="end" 
                        fill="#94a3b8" 
                        className="text-[9px] font-mono"
                      >
                        {val}
                      </text>
                    </g>
                  )
                })}

                {/* Paths */}
                {areaPath && <path d={areaPath} fill="url(#chartGrad)" />}
                {linePath && <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />}

                {/* X Axis Labels */}
                {coordinates.map((c, idx) => {
                  // Renders labels every 2 dots to avoid overlapping on month/day views
                  const step = loginPeriod === "month" ? 5 : loginPeriod === "day" ? 4 : 1
                  if (idx % step !== 0) return null
                  
                  let label = c.item.fecha
                  if (loginPeriod === "week") {
                    // Show short day name or simple date
                    label = new Date(c.item.fecha).toLocaleDateString(undefined, { weekday: "short" })
                  } else if (loginPeriod === "day") {
                    label = c.item.fecha.split(" ")[1] || ""
                  } else {
                    label = c.item.fecha.substring(8, 10)
                  }

                  return (
                    <text
                      key={idx}
                      x={c.x}
                      y={chartHeight - 12}
                      textAnchor="middle"
                      fill="#94a3b8"
                      className="text-[9px] font-semibold"
                    >
                      {label}
                    </text>
                  )
                })}

                {/* Interactive Points */}
                {coordinates.map((c, idx) => (
                  <circle
                    key={idx}
                    cx={c.x}
                    cy={c.y}
                    r={hoveredPoint?.index === idx ? 5 : 3.5}
                    fill={hoveredPoint?.index === idx ? "#2563eb" : "#ffffff"}
                    stroke="#2563eb"
                    strokeWidth={hoveredPoint?.index === idx ? 3 : 2}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredPoint({ index: idx, x: c.x, y: c.y, val: c.item })}
                  />
                ))}
              </svg>
            </div>

            {/* Custom Tooltip */}
            {hoveredPoint && (
              <div 
                className="absolute bg-slate-900 text-white rounded-lg p-2.5 shadow-xl text-[10px] space-y-0.5 border border-slate-800 transition-all pointer-events-none"
                style={{ 
                  left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                  top: `${(hoveredPoint.y / chartHeight) * 100 - 32}%`,
                  transform: "translateX(-50%)"
                }}
              >
                <p className="font-bold text-slate-400">
                  {new Date(hoveredPoint.val.fecha).toLocaleDateString(undefined, { dateStyle: "medium" })}
                </p>
                <p className="text-xs font-extrabold text-blue-400 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {hoveredPoint.val.cantidad} logins
                </p>
              </div>
            )}

            {loginStats.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 italic">
                No hay datos disponibles en el rango.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Donut Chart */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold">Popular Engines</CardTitle>
            <CardDescription className="text-xs">Distribución de base de datos más consultadas.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            
            {/* SVG Donut */}
            <div className="relative flex justify-center py-2">
              <svg width="150" height="150" viewBox="0 0 42 42" className="transform -rotate-90">
                {/* Background circle */}
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4.5" />
                
                {/* Colored ring segments */}
                {segments.map((seg, idx) => (
                  <circle
                    key={idx}
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth="4.5"
                    strokeDasharray={seg.dashArray}
                    strokeDashoffset={seg.dashOffset}
                    className="transition-all duration-300"
                  />
                ))}
              </svg>
              {/* Inner text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-900">100%</span>
                <span className="text-[8px] uppercase font-bold text-slate-400">Total Engines</span>
              </div>
            </div>

            {/* Legends */}
            <div className="space-y-2 border-t border-slate-100 pt-4 text-xs">
              {segments.map((seg, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                    <span className="font-semibold text-slate-700">{seg.motor}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                    <span className="font-bold text-slate-800">{Math.round(seg.percent)}%</span>
                    <span>({seg.cantidad})</span>
                  </div>
                </div>
              ))}
              {segments.length === 0 && (
                <p className="text-center text-slate-450 italic text-[11px]">No hay conexiones registradas.</p>
              )}
            </div>

          </CardContent>
        </Card>
      </div>

      {/* Recent Logs Section */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold">Recent System Logs</CardTitle>
            <CardDescription className="text-xs">Registro de últimas operaciones críticas ejecutadas.</CardDescription>
          </div>
          <Link href="/admin/logs">
            <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200">
              Ver todos los logs
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 font-semibold text-slate-500">
                  <th className="p-3 pl-5">Timestamp</th>
                  <th className="p-3">Event Type</th>
                  <th className="p-3">User / Source</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 pr-5 text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                    <td className="p-3 pl-5 font-mono text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-slate-800">
                      {log.accion}
                    </td>
                    <td className="p-3 text-slate-600">
                      {log.usuario_nombre || "SYSTEM"}
                    </td>
                    <td className="p-3">
                      <Badge 
                        variant="outline" 
                        className={`text-[9px] font-bold py-0.5 px-2 rounded-full ${
                          log.nivel === "ERROR" || log.nivel === "CRITICAL"
                            ? "bg-red-50 text-red-700 border-red-100"
                            : "bg-emerald-50 text-emerald-700 border-emerald-100"
                        }`}
                      >
                        {log.nivel === "ERROR" || log.nivel === "CRITICAL" ? "Failed" : "Success"}
                      </Badge>
                    </td>
                    <td className="p-3 pr-5 text-right font-mono text-[10px] text-slate-400 truncate max-w-[280px]">
                      {log.detalle || "-"}
                    </td>
                  </tr>
                ))}
                {recentLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                      No hay registros de logs en el sistema.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
