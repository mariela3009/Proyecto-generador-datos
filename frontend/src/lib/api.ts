/**
 * lib/api.ts
 * Wrapper centralizado para todas las llamadas al backend FastAPI.
 */
import { getSession } from "next-auth/react"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"

async function getHeaders(): Promise<HeadersInit> {
  const session = await getSession()
  const headers: HeadersInit = { "Content-Type": "application/json" }
  if (session?.accessToken) {
    headers["Authorization"] = `Bearer ${session.accessToken}`
  }
  return headers
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail ?? "Error desconocido del servidor")
  }
  return res.json()
}

export const api = {
  get: async <T>(path: string): Promise<T> => {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: await getHeaders(),
    })
    return handleResponse<T>(res)
  },

  post: async <T>(path: string, body: unknown): Promise<T> => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(body),
    })
    return handleResponse<T>(res)
  },

  delete: async <T>(path: string): Promise<T> => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "DELETE",
      headers: await getHeaders(),
    })
    return handleResponse<T>(res)
  },
}
