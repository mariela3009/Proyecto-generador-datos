"use client"

import { cn } from "@/lib/utils"

export type Engine = "postgresql" | "mysql" | "sqlserver" | "mongodb" | "cassandra" | "neo4j"

const ENGINES: { id: Engine; label: string; port: number; icon: string; color: string }[] = [
  { id: "postgresql", label: "PostgreSQL", port: 5432, icon: "🐘", color: "blue" },
  { id: "mysql",      label: "MySQL",      port: 3306, icon: "🐬", color: "orange" },
  { id: "sqlserver",  label: "SQL Server", port: 1433, icon: "🪟", color: "red" },
  { id: "mongodb",    label: "MongoDB",    port: 27017, icon: "🍃", color: "green" },
  { id: "cassandra",  label: "Cassandra",  port: 9042, icon: "👁️", color: "cyan" },
  { id: "neo4j",      label: "Neo4j",      port: 7687, icon: "⬡", color: "purple" },
]

const colorMap: Record<string, string> = {
  blue:   "border-blue-400 bg-blue-50 text-blue-700",
  orange: "border-orange-400 bg-orange-50 text-orange-700",
  red:    "border-red-400 bg-red-50 text-red-700",
  green:  "border-green-400 bg-green-50 text-green-700",
  cyan:   "border-cyan-400 bg-cyan-50 text-cyan-700",
  purple: "border-purple-400 bg-purple-50 text-purple-700",
}

interface EngineSelectorProps {
  selected: Engine | null
  onSelect: (engine: Engine, port: number) => void
}

export default function EngineSelector({ selected, onSelect }: EngineSelectorProps) {
  return (
    <div>
      <h2 className="text-base font-semibold text-foreground mb-3">Select Database Engine</h2>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {ENGINES.map((eng) => {
          const isActive = selected === eng.id
          return (
            <button
              key={eng.id}
              onClick={() => onSelect(eng.id, eng.port)}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-center",
                isActive
                  ? colorMap[eng.color] + " shadow-sm"
                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/50 text-muted-foreground"
              )}
            >
              <span className="text-xl leading-none">{eng.icon}</span>
              <span className="text-[11px] font-semibold leading-tight">{eng.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { ENGINES }
