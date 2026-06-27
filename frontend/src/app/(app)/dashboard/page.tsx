import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Database, Code2, Zap, TrendingUp } from "lucide-react"
import Link from "next/link"

const stats = [
  { label: "Conexiones activas", value: "0", icon: Database, color: "text-blue-500" },
  { label: "Registros generados", value: "0", icon: Zap, color: "text-green-500" },
  { label: "Scripts SQL", value: "0", icon: Code2, color: "text-purple-500" },
  { label: "Inserciones exitosas", value: "0", icon: TrendingUp, color: "text-orange-500" },
]

const quickActions = [
  {
    title: "Conectar Base de Datos",
    description: "Conecta a MySQL, PostgreSQL, MongoDB, SQL Server y más.",
    href: "/dashboard/connect",
    icon: Database,
    badge: "Nuevo",
  },
  {
    title: "SQL Script Mode",
    description: "Pega un DDL script o sube un archivo .sql para detectar el schema.",
    href: "/dashboard/editor",
    icon: Code2,
    badge: null,
  },
]

export default function DashboardPage() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Bienvenido a DataSynth AI. Genera datos sintéticos para cualquier base de datos.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Acciones rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map(({ title, description, href, icon: Icon, badge }) => (
            <Link key={href} href={href}>
              <Card className="border-border/60 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    {badge && (
                      <Badge className="text-[10px] bg-primary/10 text-primary hover:bg-primary/10">{badge}</Badge>
                    )}
                  </div>
                  <CardTitle className="text-sm font-semibold mt-2 group-hover:text-primary transition-colors">
                    {title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 pt-0">
                  <p className="text-xs text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
