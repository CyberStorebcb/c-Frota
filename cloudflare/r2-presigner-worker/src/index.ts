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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get('Origin')

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors(origin) })
    }

    if (request.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405, origin)
    }

    const apiKey = env.PRESIGN_API_KEY?.trim()
    if (apiKey) {
      const auth = request.headers.get('Authorization')
      if (auth !== `Bearer ${apiKey}`) {
        return json({ error: 'unauthorized' }, 401, origin)
      }
    }

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

    const accountId = env.R2_ACCOUNT_ID?.trim()
    const bucket = env.R2_BUCKET_NAME?.trim()
    const publicBase = env.R2_PUBLIC_BASE_URL?.trim()
    if (!accountId || !bucket || !publicBase) {
      return json({ error: 'server_misconfigured' }, 500, origin)
    }

    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    })

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
