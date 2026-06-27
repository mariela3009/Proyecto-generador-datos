"use client"

import { signOut, useSession } from "next-auth/react"
import { Search, Bell, Settings } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function Navbar() {
  const { data: session } = useSession()

  const initials = session?.user?.name
    ? session.user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "US"

  return (
    <header className="h-14 border-b border-border bg-card px-6 flex items-center justify-between shrink-0">
      {/* Left: Links */}
      <nav className="flex items-center gap-6">
        <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Documentation
        </a>
        <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Pricing
        </a>
        <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Community
        </a>
      </nav>

      {/* Right: Search + icons + avatar */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-8 h-8 w-52 bg-muted border-0 text-sm focus-visible:ring-1"
          />
        </div>

        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Settings className="h-4 w-4" />
        </Button>

        {/* Avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center hover:ring-2 hover:ring-primary/30 transition-all overflow-hidden">
              {session?.user?.image ? (
                <img src={session.user.image} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <p className="font-medium text-sm">{session?.user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Mi Perfil</DropdownMenuItem>
            <DropdownMenuItem>Configuración</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
