import { supabase } from './supabase'

const SUPABASE_BUCKET = 'checklist-evidencias'

/**
 * Upload de evidências de checklist.
 *
 * **Cloudflare R2 (preferencial)** — envia o arquivo diretamente ao Worker
 * (`/upload` via multipart/form-data). O Worker faz o PUT no R2 server-side,
 * eliminando erros de CORS que ocorreriam em uploads diretos do browser.
 *
 * **Supabase Storage (fallback)** — usado quando R2 não está configurado
 * ou quando o Worker falha.
 *
 * Variáveis:
 * - `VITE_R2_PRESIGN_URL` — base do Worker (ex.: https://frota-r2-presigner.workers.dev).
 * - `VITE_R2_PRESIGN_API_KEY` (opcional) — enviado como `Authorization: Bearer …`.
 */
export function isChecklistEvidenceR2Enabled(): boolean {
  const u = (import.meta.env.VITE_R2_PRESIGN_URL as string | undefined)?.trim()
  return Boolean(u)
}

export async function uploadChecklistEvidenceFile(file: File, storageKey: string): Promise<string | null> {
  if (isChecklistEvidenceR2Enabled()) {
    const url = await uploadToR2ViaWorker(file, storageKey)
    if (url) return url
    // fallback se o Worker falhar
  }
  return uploadToSupabaseStorage(file, storageKey)
}

async function uploadToSupabaseStorage(file: File, path: string): Promise<string | null> {
  const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, file, { upsert: false })
  if (error) return null
  return supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path).data.publicUrl
}

/**
 * Envia o arquivo ao Worker via multipart/form-data.
 * O Worker faz o PUT no R2 server-side — sem CORS no bucket.
 */
async function uploadToR2ViaWorker(file: File, key: string): Promise<string | null> {
  const baseUrl = (import.meta.env.VITE_R2_PRESIGN_URL as string).trim().replace(/\/$/, '')
  const apiKey = (import.meta.env.VITE_R2_PRESIGN_API_KEY as string | undefined)?.trim()

  const headers: Record<string, string> = {}
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  const formData = new FormData()
  formData.append('key', key)
  formData.append('file', file)

  try {
    const res = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!res.ok) return null

    const data = (await res.json()) as { publicUrl?: string }
    return data.publicUrl ?? null
  } catch {
    return null
  }
}
