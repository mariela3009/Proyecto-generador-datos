"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Database, 
  Code, 
  Cpu, 
  Zap, 
  CheckCircle2, 
  ChevronRight, 
  Star, 
  ThumbsUp, 
  CornerDownRight, 
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  User,
  LogOut
} from "lucide-react"

interface CommentItem {
  id: number
  usuario_id: number
  contenido: string
  calificacion: number | null
  created_at: string
  usuario_nombre: string
  usuario_apellido: string
  usuario_avatar: string | null
}

export default function LandingPage() {
  const { data: session } = useSession()
  const [comments, setComments] = useState<CommentItem[]>([])
  const [newComment, setNewComment] = useState("")
  const [rating, setRating] = useState<number>(5)
  const [submitting, setSubmitting] = useState(false)
  const [loadingComments, setLoadingComments] = useState(true)

  // Fetch comments
  const fetchComments = async () => {
    try {
      const res = await api.get<{ items: CommentItem[] }>("/comentarios?per_page=5")
      setComments(res.items)
    } catch (e) {
      console.error("Error fetching comments:", e)
    } finally {
      setLoadingComments(false)
    }
  }

  useEffect(() => {
    fetchComments()
  }, [])

  // Submit new comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    if (!newComment.trim()) return

    setSubmitting(true)
    try {
      const posted = await api.post<CommentItem>("/comentarios", {
        contenido: newComment,
        calificacion: rating
      })
      setComments((prev) => [posted, ...prev])
      setNewComment("")
      setRating(5)
    } catch (e) {
      console.error("Error creating comment:", e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/25">
              D
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              DataSynth AI
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
            <Link href="#features" className="hover:text-blue-600 transition-colors">Características</Link>
            <Link href="#pricing" className="hover:text-blue-600 transition-colors">Planes y Precios</Link>
            <Link href="#community" className="hover:text-blue-600 transition-colors">Comunidad</Link>
          </nav>

          <div className="flex items-center gap-4">
            {session ? (
              <div className="flex items-center gap-3">
                <Link href="/dashboard/connect">
                  <Button className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm">
                    Ir al Dashboard
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <Link href="/login" className="text-xs font-bold text-slate-700 hover:text-blue-600 transition-colors">
                  Iniciar Sesión
                </Link>
                <Link href="/register">
                  <Button className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm">
                    Registrarse
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white py-16 md:py-24 border-b border-slate-100">
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        <div className="relative max-w-5xl mx-auto px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[10px] font-bold text-blue-700 uppercase tracking-wider">
            <Sparkles className="h-3 w-3" /> Integridad Algorítmica Garantizada
          </div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 max-w-3xl mx-auto leading-[1.15]">
            Sintetiza Datos de Calidad de Producción a Gran Escala.
          </h1>

          <p className="text-sm md:text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Genera millones de filas de datos ficticios referencialmente intactos y respetuosos de la privacidad en segundos. Generación inteligente basada en Faker para entornos SQL, NoSQL y JSON.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href={session ? "/dashboard/connect" : "/login"}>
              <Button className="h-11 px-6 font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">
                Comenzar Ahora
              </Button>
            </Link>
            <Link href="/docs" target="_blank">
              <Button variant="outline" className="h-11 px-6 font-bold text-xs border-slate-200 bg-white hover:bg-slate-55">
                Ver Documentación de API
              </Button>
            </Link>
          </div>

          {/* Interactive Code Window */}
          <div className="max-w-2xl mx-auto pt-10">
            <div className="rounded-xl border border-slate-800 bg-slate-950 shadow-2xl text-left overflow-hidden">
              {/* Window Bar */}
              <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-800">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-[10px] font-mono text-slate-500 font-medium">schema_generator.json</span>
                <div className="w-10" />
              </div>
              {/* Code Content */}
              <pre className="p-5 font-mono text-[11px] leading-relaxed text-slate-300 overflow-x-auto">
                <code className="block">
{`{
  `}<span className="text-sky-400">"schema_name"</span>{`: `}<span className="text-emerald-400">"enterprise_users_v2"</span>{`,
  `}<span className="text-sky-400">"target_engine"</span>{`: `}<span className="text-emerald-400">"PostgreSQL"</span>{`,
  `}<span className="text-sky-400">"volume"</span>{`: `}<span className="text-amber-400">1000000</span>{`,
  `}<span className="text-sky-400">"fields"</span>{`: [
    { `}<span className="text-sky-400">"name"</span>{`: `}<span className="text-emerald-400">"id"</span>{`, `}<span className="text-sky-400">"type"</span>{`: `}<span className="text-emerald-400">"uuid"</span>{`, `}<span className="text-sky-400">"primary_key"</span>{`: `}<span className="text-amber-400">true</span>{` },
    { `}<span className="text-sky-400">"name"</span>{`: `}<span className="text-emerald-400">"email"</span>{`, `}<span className="text-sky-400">"provider"</span>{`: `}<span className="text-emerald-400">"faker.internet.email"</span>{`, `}<span className="text-sky-400">"unique"</span>{`: `}<span className="text-amber-400">true</span>{` },
    { `}<span className="text-sky-400">"name"</span>{`: `}<span className="text-emerald-400">"behavior_score"</span>{`, `}<span className="text-sky-400">"type"</span>{`: `}<span className="text-emerald-400">"float"</span>{`, `}<span className="text-sky-400">"range"</span>{`: [`}<span className="text-amber-400">0.0</span>{`, `}<span className="text-amber-400">1.0</span>{`] }
  ],
  `}<span className="text-sky-400">"relations"</span>{`: [
    { `}<span className="text-sky-400">"type"</span>{`: `}<span className="text-emerald-400">"hasMany"</span>{`, `}<span className="text-sky-400">"target"</span>{`: `}<span className="text-emerald-400">"transaction_logs"</span>{`, `}<span className="text-sky-400">"count"</span>{`: `}<span className="text-emerald-400">"1..50"</span>{` }
  ]
}`}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-slate-50/50">
        <div className="max-w-5xl mx-auto px-6 space-y-12">
          <div className="space-y-3">
            <h2 className="text-2xl font-extrabold text-slate-900">Diseñado para la Complejidad</h2>
            <p className="text-sm text-slate-500 max-w-xl">
              Una plataforma integral diseñada para la arquitectura de datos moderna, compatible con motores relacionales, NoSQL y grafos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Universal DB Card */}
            <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Database className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-900">Soporte Universal de Motores</h3>
                  <p className="text-xs leading-relaxed text-slate-500">
                    Exporta de forma directa a tu almacén de datos o genera archivos altamente optimizados. Soportamos PostgreSQL, MySQL, SQL Server, MongoDB, Cassandra y Neo4j de manera nativa.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-semibold py-1 px-2.5 rounded-full bg-slate-100 text-slate-600">• PostgreSQL</span>
                  <span className="text-[10px] font-semibold py-1 px-2.5 rounded-full bg-slate-100 text-slate-600">• MongoDB</span>
                  <span className="text-[10px] font-semibold py-1 px-2.5 rounded-full bg-slate-100 text-slate-600">• MySQL</span>
                  <span className="text-[10px] font-semibold py-1 px-2.5 rounded-full bg-slate-100 text-slate-600">• JSON/CSV</span>
                </div>
              </CardContent>
            </Card>

            {/* Context-Aware Faker */}
            <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Cpu className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-900">Mapeos Inteligentes basados en Contexto</h3>
                  <p className="text-xs leading-relaxed text-slate-500">
                    Nuestro motor analiza el tipo de dato y nombre de columna para asignar el proveedor de Faker idóneo (correos, tarjetas de crédito, nombres, ubicaciones, etc.) garantizando coherencia.
                  </p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg font-mono text-[10px] text-slate-400">
                  <span className="text-blue-400">generate</span>{`(`}
                  <br />
                  {`  provider: `}<span className="text-emerald-400">&apos;finance.credit_card&apos;</span>{`,`}
                  <br />
                  {`  locale: `}<span className="text-emerald-400">&apos;en_US&apos;</span>
                  <br />
                  {`)`}
                </div>
              </CardContent>
            </Card>

            {/* Referential Integrity */}
            <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-900">Integridad Referencial</h3>
                  <p className="text-xs leading-relaxed text-slate-500">
                    Calcula de manera topológica las dependencias de llaves primarias y foráneas. Genera registros ordenados para asegurar que nunca se creen registros huérfanos o con FKs incorrectas.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Blazing Fast */}
            <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Zap className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-900">Generación Veloz</h3>
                  <p className="text-xs leading-relaxed text-slate-500">
                    Construido sobre procesos asíncronos y arquitecturas eficientes, DataSynth AI puede procesar y enviar millones de registros por minuto directamente a tu base de datos o almacenamiento en nube.
                  </p>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-700">
                    <span>Progreso: 1,000,000 filas</span>
                    <span className="text-blue-600">850k / seg</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 w-[85%] rounded-full animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Community / Comments Section */}
      <section id="community" className="py-20 bg-white border-t border-slate-200/60">
        <div className="max-w-3xl mx-auto px-6 space-y-8">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-extrabold text-slate-900">Comunidad de Desarrolladores</h2>
            <p className="text-sm text-slate-500">
              Déjanos tus dudas, opiniones o cuéntanos qué bases de datos te gustaría que soportemos a continuación.
            </p>
          </div>

          {/* New Comment Box */}
          <Card className="border-slate-200/80 shadow-sm bg-slate-50">
            <CardContent className="p-5">
              {session ? (
                <form onSubmit={handlePostComment} className="space-y-4">
                  <div className="flex items-center gap-3">
                    {/* User Mini Profile */}
                    <div className="h-8 w-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                      {session.user?.name?.[0] || "U"}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{session.user?.name}</p>
                      <p className="text-[10px] text-slate-500">{session.user?.email}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="comment-text" className="text-[10px] uppercase font-bold text-slate-500">Comentario</Label>
                    <textarea
                      id="comment-text"
                      className="w-full h-24 p-3 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="Comparte tu experiencia o haz una pregunta..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Stars Select */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Calificación:</span>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setRating(s)}
                          className="p-0.5 text-amber-400 hover:scale-110 transition-all"
                        >
                          <Star className={`h-4 w-4 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                        </button>
                      ))}
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting || !newComment.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-4 shadow"
                    >
                      {submitting ? "Publicando..." : "Publicar Comentario"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <MessageSquare className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    Debes estar registrado e iniciar sesión para poder participar en la comunidad de feedback.
                  </p>
                  <div className="flex justify-center gap-3">
                    <Link href="/login">
                      <Button variant="outline" className="h-8 text-xs font-bold px-3">Iniciar Sesión</Button>
                    </Link>
                    <Link href="/register">
                      <Button className="h-8 text-xs font-bold px-3 bg-blue-600 hover:bg-blue-700 text-white">Registrarse</Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments List */}
          <div className="space-y-4">
            {loadingComments ? (
              <div className="text-center py-8 text-slate-500 text-xs flex items-center justify-center gap-2">
                <span className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Cargando comentarios...
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-xs italic">
                Aún no hay comentarios. ¡Sé el primero en dejar uno!
              </p>
            ) : (
              comments.map((comm) => (
                <div 
                  key={comm.id} 
                  className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-3.5 hover:border-slate-300 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs overflow-hidden">
                        {comm.usuario_avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={comm.usuario_avatar} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                          `${comm.usuario_nombre[0]}${comm.usuario_apellido[0]}`
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {comm.usuario_nombre} {comm.usuario_apellido}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(comm.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {comm.calificacion && (
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star 
                            key={s} 
                            className={`h-3 w-3 ${s <= (comm.calificacion || 0) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} 
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-650 leading-relaxed font-normal pl-0.5 whitespace-pre-wrap">
                    {comm.contenido}
                  </p>

                  <div className="flex items-center gap-4 pt-2.5 border-t border-slate-100 text-[10px] font-bold text-slate-500">
                    <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                      <ThumbsUp className="h-3 w-3" />
                      Me gusta
                    </button>
                    <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                      <CornerDownRight className="h-3 w-3" />
                      Responder
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-10 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              D
            </div>
            <span className="font-extrabold text-sm tracking-tight text-white">DataSynth AI</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">Política de Privacidad</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Términos de Servicio</Link>
            <Link href="/api-docs" className="hover:text-white transition-colors">API Reference</Link>
          </div>
          <p>© {new Date().getFullYear()} DataSynth AI. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
