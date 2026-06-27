import Providers from "@/components/layout/Providers"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "DataSynth AI — Generador Inteligente de Datos",
  description: "Genera datos sintéticos para SQL, NoSQL y JSON con inteligencia artificial.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
