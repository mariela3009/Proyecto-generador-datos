"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { SavedConnection } from "@/types/schema"
import { Clock, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface QuickLoadProps {
  onLoad: (conn: SavedConnection) => void
}

export default function QuickLoad({ onLoad }: QuickLoadProps) {
  const [connections, setConnections] = useState<SavedConnection[]>([])
  const [loading, setLoading] = useState(true)

  const fetchConnections = async () => {
    try {
      const data = await api.get<SavedConnection[]>("/connect/saved")
      setConnections(data)
    } catch {
      // no saved connections or not authenticated yet
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchConnections() }, [])

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await api.delete(`/connect/saved/${id}`)
      setConnections((prev) => prev.filter((c) => c.id !== id))
    } catch {}
  }

  if (loading || connections.length === 0) return null

  return (
    <div>
      <h2 className="text-base font-semibold text-foreground mb-3">Quick Load</h2>
      <div className="flex flex-wrap gap-2">
        {connections.map((conn) => (
          <button
            key={conn.id}
            onClick={() => onLoad(conn)}
            className="group flex items-center gap-2 py-2 px-3 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-muted/50 transition-all text-left"
          >
            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate max-w-[140px]">
                {conn.nombre_alias ?? `${conn.nombre_bd}@${conn.host}`}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {conn.motor_bd.toUpperCase()} · {conn.host}
              </p>
            </div>
            <button
              onClick={(e) => handleDelete(conn.id, e)}
              className="ml-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </button>
        ))}
      </div>
    </div>
  )
}
