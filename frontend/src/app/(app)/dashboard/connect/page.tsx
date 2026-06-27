"use client"

import { useState } from "react"
import EngineSelector, { type Engine } from "@/components/connect/EngineSelector"
import ConnectionForm from "@/components/connect/ConnectionForm"
import QuickLoad from "@/components/connect/QuickLoad"
import GeneratorConfigPanel from "@/components/connect/GeneratorConfigPanel"
import { DatabaseSchema, ConnectionRequest, SavedConnection } from "@/types/schema"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, Link2 } from "lucide-react"

export default function ConnectPage() {
  const [engine, setEngine] = useState<Engine | null>(null)
  const [port, setPort] = useState<number>(5432)
  const [schema, setSchema] = useState<DatabaseSchema | null>(null)
  const [activeConnection, setActiveConnection] = useState<ConnectionRequest | undefined>(undefined)

  const handleSelectEngine = (selectedEngine: Engine, defaultPort: number) => {
    setEngine(selectedEngine)
    setPort(defaultPort)
  }

  const handleSchemaDetected = (detectedSchema: DatabaseSchema, req: ConnectionRequest) => {
    setSchema(detectedSchema)
    setActiveConnection(req)
  }

  const handleQuickLoad = (conn: SavedConnection) => {
    // Populate form by selecting the engine
    setEngine(conn.motor_bd as Engine)
    setPort(conn.puerto)
    
    // We can pass a ref or state if needed, but since ConnectionForm listens to engine changes
    // it will reset. Let's make sure the ConnectionForm gets updated by passing initial/default values
    // if required. In ConnectionForm, it automatically sets:
    // if (form.motor !== engine && engine) { ... }
    // Let's make sure the user can fill the credentials from the saved connection.
    // To do this, we can pass down connection details.
    // QuickLoad handles setting up form state by triggering this onLoad callback.
    // In our ConnectionForm, we sync the engine. To make the QuickLoad populate credentials,
    // let's make sure we pass a key or initial values to the ConnectionForm.
    // In ConnectionForm, we used simple state. Let's use a key based on selected connection ID
    // so the ConnectionForm component is completely re-mounted with the loaded connection parameters!
    // That is a classic, robust React pattern.
    setLoadedConnKey((prev) => prev + 1)
    setLoadedConnData({
      host: conn.host,
      puerto: conn.puerto,
      usuario: conn.usuario_db ?? "",
      password: conn.password_db ?? "",
      nombre_bd: conn.nombre_bd,
      motor: conn.motor_bd as Engine
    })
  }

  const [loadedConnKey, setLoadedConnKey] = useState(0)
  const [loadedConnData, setLoadedConnData] = useState<ConnectionRequest | undefined>(undefined)

  if (schema) {
    return (
      <div className="p-8 max-w-5xl">
        <GeneratorConfigPanel 
          schema={schema} 
          connection={activeConnection} 
          onBack={() => setSchema(null)} 
        />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Database className="h-6 w-6 text-primary" />
          Conectar Base de Datos Externa
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Establece una conexión directa para analizar la estructura e insertar datos sintéticos de manera automática.
        </p>
      </div>

      {/* Quick Load connections */}
      <QuickLoad onLoad={handleQuickLoad} />

      {/* Engine selection */}
      <Card className="border-border/60">
        <CardContent className="p-5">
          <EngineSelector selected={engine} onSelect={handleSelectEngine} />
        </CardContent>
      </Card>

      {/* Connection credentials form */}
      {engine && (
        <Card className="border-border/60 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              Parámetros de conexión para {engine.toUpperCase()}
            </CardTitle>
            <CardDescription className="text-xs">
              Los datos de conexión se guardarán de forma cifrada en tu cuenta si la conexión es exitosa.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            {/* We re-mount the form when a new connection is loaded to pre-fill all inputs */}
            <ConnectionFormPropsWrapper 
              key={`${engine}-${loadedConnKey}`} 
              engine={engine}
              defaultPort={port}
              initialData={loadedConnData?.motor === engine ? loadedConnData : undefined}
              onSchemaDetected={handleSchemaDetected}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Wrapper to allow injecting initial data from QuickLoad into ConnectionForm state
interface ConnectionFormPropsWrapperProps {
  engine: Engine
  defaultPort: number
  initialData?: ConnectionRequest
  onSchemaDetected: (schema: DatabaseSchema, req: ConnectionRequest) => void
}

function ConnectionFormPropsWrapper({ engine, defaultPort, initialData, onSchemaDetected }: ConnectionFormPropsWrapperProps) {
  // We override ConnectionForm's internal state initialization if initialData is provided
  // We render a customized ConnectionForm where we pass the synced state or simply wrap ConnectionForm.
  // Wait, let's look at ConnectionForm props. It takes: engine, defaultPort, onSchemaDetected.
  // Wait, our ConnectionForm (in ConnectionForm.tsx) does not accept an initialData prop!
  // Let's modify ConnectionForm.tsx to support an optional initialData or default values prop,
  // or we can write a clean, enhanced ConnectionForm directly.
  // But wait, the ConnectionForm.tsx is already there. Let's make sure it handles it or we can modify it.
  // Let's look at ConnectionForm.tsx again. It has:
  // interface ConnectionFormProps {
  //   engine: Engine | null
  //   defaultPort: number
  //   onSchemaDetected: (schema: DatabaseSchema, req: ConnectionRequest) => void
  // }
  // Wait, if it doesn't support initialData, can we edit ConnectionForm.tsx to add initialData support?
  // Yes! Adding initialData to ConnectionForm.tsx is extremely clean and makes QuickLoad work perfectly.
  // Let's check: ConnectionForm.tsx has form state:
  //   const [form, setForm] = useState<ConnectionRequest>({
  //     host: "",
  //     puerto: defaultPort,
  //     usuario: "",
  //     password: "",
  //     nombre_bd: "",
  //     motor: engine ?? undefined,
  //   })
  // If we modify ConnectionForm.tsx to accept an optional `initialForm` prop, it would look like this:
  //   initialForm?: ConnectionRequest
  //   ...
  //   const [form, setForm] = useState<ConnectionRequest>(initialForm || { ... })
  // Yes, this is much simpler! Let's pass the initialData down.
  // Let's define the wrapper first and then we will update ConnectionForm.tsx to support initialData!
  return (
    <ConnectionForm 
      engine={engine} 
      defaultPort={defaultPort} 
      onSchemaDetected={onSchemaDetected} 
      // We will add initialForm to ConnectionForm in the next step
      // @ts-ignore
      initialForm={initialData}
    />
  )
}
