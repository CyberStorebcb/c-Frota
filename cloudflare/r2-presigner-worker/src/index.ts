import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export interface Env {
  /** Cloudflare Account ID — mesmo valor do painel "Copy your account ID" (não expor no frontend). */
  R2_ACCOUNT_ID: string
  R2_BUCKET_NAME: string
  /** Base pública do bucket (ex.: https://pub-xxx.r2.dev ou o vosso domínio). Sem barra final. */
  R2_PUBLIC_BASE_URL: string
  R2_ACCESS_KEY_ID: string
  R2_SECRET_ACCESS_KEY: string
  /** Se definido, o POST deve enviar Authorization: Bearer … (alinhado a VITE_R2_PRESIGN_API_KEY). */
  PRESIGN_API_KEY?: string
}

type PresignBody = { key?: string; contentType?: string }

function cors(origin: string | null): HeadersInit {
  const allow = origin ?? '*'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

function json(data: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(origin) },
  })
}

function isSafeObjectKey(key: string): boolean {
  if (!key || key.length > 1024) return false
  if (key.startsWith('/') || key.includes('..') || key.includes('\0')) return false
  return true
}

function publicObjectUrl(base: string, key: string): string {
  const root = base.replace(/\/$/, '')
  const path = key.split('/').map(encodeURIComponent).join('/')
  return `${root}/${path}`
}

function makeS3Client(env: Env): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  })
}

function checkAuth(request: Request, env: Env): boolean {
  const apiKey = env.PRESIGN_API_KEY?.trim()
  if (!apiKey) return true
  return request.headers.get('Authorization') === `Bearer ${apiKey}`
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get('Origin')

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors(origin) })
    }

    const url = new URL(request.url)
    const pathname = url.pathname.replace(/\/$/, '')

    // ── GET /read — proxy de leitura com CORS (resolve tainted canvas no PDF) ──
    if (request.method === 'GET' && (pathname === '/read' || pathname.endsWith('/read'))) {
      const publicBase = env.R2_PUBLIC_BASE_URL?.trim()
      if (!publicBase) return json({ error: 'server_misconfigured' }, 500, origin)
      const key = url.searchParams.get('key') ?? ''
      if (!isSafeObjectKey(key)) return new Response('invalid_key', { status: 400, headers: cors(origin) })
      const objectUrl = publicObjectUrl(publicBase, key)
      let upstream: Response
      try { upstream = await fetch(objectUrl) } catch {
        return new Response('fetch_failed', { status: 502, headers: cors(origin) })
      }
      if (!upstream.ok) return new Response('not_found', { status: upstream.status, headers: cors(origin) })
      const headers = new Headers(cors(origin))
      const ct = upstream.headers.get('Content-Type')
      if (ct) headers.set('Content-Type', ct)
      headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      return new Response(upstream.body, { status: 200, headers })
    }

    if (request.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405, origin)
    }

    if (!checkAuth(request, env)) {
      return json({ error: 'unauthorized' }, 401, origin)
    }

    const accountId = env.R2_ACCOUNT_ID?.trim()
    const bucket = env.R2_BUCKET_NAME?.trim()
    const publicBase = env.R2_PUBLIC_BASE_URL?.trim()
    if (!accountId || !bucket || !publicBase) {
      return json({ error: 'server_misconfigured' }, 500, origin)
    }

    // ── Rota /upload — recebe arquivo via multipart/form-data e faz PUT no R2 server-side ──
    // Elimina a necessidade de CORS no bucket R2 para uploads do browser.
    if (pathname === '/upload' || pathname.endsWith('/upload')) {
      let formData: FormData
      try {
        formData = await request.formData()
      } catch {
        return json({ error: 'invalid_form_data' }, 400, origin)
      }

      const key = typeof formData.get('key') === 'string' ? (formData.get('key') as string).trim() : ''
      const fileEntry = formData.get('file')

      if (!isSafeObjectKey(key)) {
        return json({ error: 'invalid_key' }, 400, origin)
      }
      if (!fileEntry || !(fileEntry instanceof File)) {
        return json({ error: 'missing_file' }, 400, origin)
      }

      const contentType = fileEntry.type || 'application/octet-stream'
      const fileBuffer = await fileEntry.arrayBuffer()

      const client = makeS3Client(env)
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
        Body: new Uint8Array(fileBuffer),
      })

      try {
        await client.send(command)
      } catch (err) {
        console.error('R2 upload error:', err)
        return json({ error: 'upload_failed' }, 502, origin)
      }

      const publicUrl = publicObjectUrl(publicBase, key)
      return json({ publicUrl }, 200, origin)
    }

    // ── Rota padrão / — gera URL pré-assinada (mantida para compatibilidade) ──
    let body: PresignBody
    try {
      body = (await request.json()) as PresignBody
    } catch {
      return json({ error: 'invalid_json' }, 400, origin)
    }

    const key = typeof body.key === 'string' ? body.key.trim() : ''
    const contentType =
      typeof body.contentType === 'string' && body.contentType.trim()
        ? body.contentType.trim()
        : 'application/octet-stream'

    if (!isSafeObjectKey(key)) {
      return json({ error: 'invalid_key' }, 400, origin)
    }

    const client = makeS3Client(env)
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 15 * 60 })
    const publicUrl = publicObjectUrl(publicBase, key)

    return json({ uploadUrl, publicUrl }, 200, origin)
  },
}
