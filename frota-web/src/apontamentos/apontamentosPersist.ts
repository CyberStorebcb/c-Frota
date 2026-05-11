import type { Apontamento } from './ApontamentosContext'

export const APONTAMENTOS_STORAGE_KEY = 'frota-apontamentos-v1'

function prefixoFromLabel(label: string): string {
  const part = label.split(' · ')[0]
  return part?.trim() ?? ''
}

/** Garante objeto compatível com `Apontamento` (inclui dados antigos no localStorage). */
export function normalizeApontamento(raw: unknown, fallback?: Apontamento): Apontamento | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>

  const id = typeof o.id === 'string' ? o.id : fallback?.id
  if (!id) return null

  const veiculoLabel =
    typeof o.veiculoLabel === 'string' ? o.veiculoLabel : (fallback?.veiculoLabel ?? '')

  const prefixo =
    typeof o.prefixo === 'string' && o.prefixo
      ? o.prefixo
      : prefixoFromLabel(veiculoLabel) || (fallback?.prefixo ?? '')

  return {
    id,
    veiculoId: typeof o.veiculoId === 'string' ? o.veiculoId : (fallback?.veiculoId ?? `v-${id}`),
    veiculoLabel,
    prefixo,
    defeito: typeof o.defeito === 'string' ? o.defeito : (fallback?.defeito ?? ''),
    dataApontamento:
      typeof o.dataApontamento === 'string' ? o.dataApontamento : (fallback?.dataApontamento ?? ''),
    prazo: typeof o.prazo === 'string' ? o.prazo : (fallback?.prazo ?? ''),
    resolvido: Boolean(o.resolvido),
    dataResolvido:
      o.dataResolvido === null || o.dataResolvido === undefined
        ? null
        : typeof o.dataResolvido === 'string'
          ? o.dataResolvido
          : null,
    horaResolvido:
      o.horaResolvido === null || o.horaResolvido === undefined
        ? (fallback?.horaResolvido ?? null)
        : typeof o.horaResolvido === 'string'
          ? o.horaResolvido
          : (fallback?.horaResolvido ?? null),
    reparoValor:
      typeof o.reparoValor === 'number'
        ? o.reparoValor
        : typeof o.reparoValor === 'string' && o.reparoValor.trim()
          ? Number(o.reparoValor)
          : (fallback?.reparoValor ?? null),
    reparoDescricao:
      o.reparoDescricao === null || o.reparoDescricao === undefined
        ? (fallback?.reparoDescricao ?? null)
        : typeof o.reparoDescricao === 'string'
          ? o.reparoDescricao
          : (fallback?.reparoDescricao ?? null),
    reparoImagens: Array.isArray(o.reparoImagens)
      ? (o.reparoImagens.filter((x) => typeof x === 'string') as string[]).slice(0, 3)
      : (fallback?.reparoImagens ?? []),
    processo: typeof o.processo === 'string' ? o.processo : (fallback?.processo ?? ''),
    base: typeof o.base === 'string' ? o.base : (fallback?.base ?? ''),
    coordenador:
      typeof o.coordenador === 'string' ? o.coordenador : (fallback?.coordenador ?? ''),
    responsavel:
      typeof o.responsavel === 'string' ? o.responsavel : (fallback?.responsavel ?? ''),
    osArquivo:
      o.osArquivo === null || o.osArquivo === undefined
        ? (fallback?.osArquivo ?? null)
        : typeof o.osArquivo === 'string'
          ? o.osArquivo
          : (fallback?.osArquivo ?? null),
    checklistId: typeof o.checklistId === 'string' ? o.checklistId : (fallback?.checklistId ?? undefined),
    ncItemId:    typeof o.ncItemId    === 'string' ? o.ncItemId    : (fallback?.ncItemId    ?? undefined),
    ncFotos: Array.isArray(o.ncFotos)
      ? (o.ncFotos.filter((x) => typeof x === 'string') as string[])
      : (fallback?.ncFotos ?? undefined),
  }
}

export function loadApontamentosFromStorage(
  seedById: Map<string, Apontamento>,
): Apontamento[] | null {
  try {
    const raw = localStorage.getItem(APONTAMENTOS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null

    const out: Apontamento[] = []
    for (const item of parsed) {
      const fb =
        typeof (item as { id?: string }).id === 'string'
          ? seedById.get((item as { id: string }).id)
          : undefined
      const row = normalizeApontamento(item, fb)
      if (row) out.push(row)
    }

    if (out.length === 0) return null
    return out.sort(
      (a, b) => new Date(a.dataApontamento).getTime() - new Date(b.dataApontamento).getTime(),
    )
  } catch {
    return null
  }
}

export function saveApontamentosToStorage(
  rows: Apontamento[],
): { ok: true } | { ok: false; message: string } {
  try {
    localStorage.setItem(APONTAMENTOS_STORAGE_KEY, JSON.stringify(rows))
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha ao gravar dados locais'
    return { ok: false, message: msg }
  }
}
