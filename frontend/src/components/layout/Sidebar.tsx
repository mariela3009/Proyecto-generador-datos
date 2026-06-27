"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard,
  Database,
  Code2,
  ShieldCheck,
  HelpCircle,
  ScrollText,
  Plus
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/connect", label: "Connections", icon: Database },
  { href: "/dashboard/editor", label: "SQL Editor", icon: Code2 },
]

const bottomItems = [
  { href: "/help", label: "Help Center", icon: HelpCircle },
  { href: "/admin/logs", label: "System Logs", icon: ScrollText },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <aside className="w-[240px] shrink-0 h-full border-r border-border bg-card flex flex-col">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-7 w-7 bg-primary rounded-lg flex items-center justify-center">
            <Database className="text-white h-4 w-4" />
          </div>
          <span className="font-bold text-foreground text-base">DataSynth AI</span>
        </Link>
      </div>

      {/* Environment / Workspace */}
      <div className="px-4 py-3 border-b border-border space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Environment
        </p>
        <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
          <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
            EW
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">Enterprise Workspace</p>
            <p className="text-[10px] text-muted-foreground">Production Environment</p>
          </div>
        </div>
        <button className="w-full h-8 bg-primary hover:bg-primary/90 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors">
          <Plus className="h-3.5 w-3.5" />
          New Project
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}

        {/* Admin link — solo superadmin */}
        {session?.user?.role === "superadmin" && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname.startsWith("/admin")
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Admin Panel
          </Link>
        )}
      </nav>

      {/* Bottom items */}
      <div className="px-3 py-3 border-t border-border space-y-0.5">
        {bottomItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </div>
    </aside>
  )
}
