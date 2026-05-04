/**
 * Comunicação com a API Gemini (Google).
 * Retentativas com backoff exponencial em falhas de rede e em 5xx / 429.
 */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

const DEFAULT_MODEL = 'gemini-2.5-flash'
const MAX_RETRIES = 5

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type AskGeminiResult =
  | { ok: true; text: string }
  | { ok: false; kind: 'not_configured' }
  | { ok: false; kind: 'error'; message: string }

export function isGeminiConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GEMINI_API_KEY?.trim())
}

/**
 * @param prompt — texto do utilizador
 * @param systemInstruction — instruções de sistema (persona, formato, etc.)
 */
export async function askGemini(prompt: string, systemInstruction: string): Promise<AskGeminiResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim()
  if (!apiKey) return { ok: false, kind: 'not_configured' }

  const model = import.meta.env.VITE_GEMINI_MODEL?.trim() || DEFAULT_MODEL
  const url = `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  let lastErrorMessage = 'Não foi possível conectar. Tente de novo em instantes.'

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
        }),
      })

      const data = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
        error?: { message?: string }
      }

      if (!response.ok) {
        const msg = data.error?.message ?? `Erro da API (${response.status}).`
        const retryable = response.status >= 500 || response.status === 429
        if (retryable && attempt < MAX_RETRIES - 1) {
          const delay = Math.min(16_000, 2 ** (attempt + 1) * 1000)
          await sleep(delay)
          continue
        }
        return { ok: false, kind: 'error', message: msg }
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      const trimmed = text?.trim()
      return { ok: true, text: trimmed && trimmed.length > 0 ? trimmed : 'Sem resposta da IA.' }
    } catch {
      if (attempt >= MAX_RETRIES - 1) {
        return { ok: false, kind: 'error', message: lastErrorMessage }
      }
      const delay = Math.min(16_000, 2 ** (attempt + 1) * 1000)
      await sleep(delay)
    }
  }

  return { ok: false, kind: 'error', message: lastErrorMessage }
}
