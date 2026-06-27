"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Database, UserPlus, AlertCircle } from "lucide-react"
import { signIn } from "next-auth/react"

export default function RegisterPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState("")
  const [apellido, setApellido] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, apellido, email, password })
      })
      
      if (!res.ok) {
        const data = await res.json()
        let errorMessage = "Error al registrar la cuenta."
        if (typeof data.detail === 'string') {
          errorMessage = data.detail
        } else if (Array.isArray(data.detail) && data.detail.length > 0) {
          // Pydantic validation error array
          errorMessage = data.detail.map((err: any) => err.msg).join(", ")
        }
        setError(errorMessage)
        setLoading(false)
        return
      }

      // Si el registro es exitoso, iniciamos sesión automáticamente
      const loginRes = await signIn("credentials", { 
        redirect: false, 
        email, 
        password 
      })

      if (loginRes?.error) {
        setError("Cuenta creada, pero falló el inicio de sesión automático.")
        setLoading(false)
      } else {
        router.push("/dashboard")
      }
    } catch (err) {
      setError("No se pudo conectar con el servidor.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <Database className="text-white h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Crear cuenta
          </h1>
          <p className="text-muted-foreground text-sm">
            Únete a DataSynth AI
          </p>
        </div>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Registro</CardTitle>
            <CardDescription>
              Ingresa tus datos para comenzar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input id="nombre" required className="h-11" value={nombre} onChange={e => setNombre(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input id="apellido" required className="h-11" value={apellido} onChange={e => setApellido(e.target.value)} disabled={loading} />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" type="email" placeholder="ejemplo@correo.com" required className="h-11" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" required className="h-11" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
              </div>
              
              <Button type="submit" disabled={loading} className="w-full h-11 bg-primary hover:bg-primary/90 text-white mt-2">
                <UserPlus className="mr-2 h-4 w-4" />
                {loading ? "Creando..." : "Registrarse"}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes una cuenta? <a href="/login" className="text-primary font-medium hover:underline">Inicia sesión</a>
        </p>
      </div>
    </div>
  )
}
