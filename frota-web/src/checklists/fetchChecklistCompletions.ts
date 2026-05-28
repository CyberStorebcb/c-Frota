import { supabase } from '../lib/supabase'
import { fetchAllSupabasePages } from '../lib/supabasePaginate'

export type ChecklistCompletionRow = {
  data_inspecao: unknown
  nc_count: unknown
  dados_veiculo: unknown
}

// ---------------------------------------------------------------------------
// Cache duplo: módulo (remounts) + sessionStorage (page reload)
// ---------------------------------------------------------------------------
const COMPLETIONS_CACHE_TTL_MS  = 5 * 60 * 1000   // 5 min
const COMPLETIONS_SESSION_KEY   = 'frota-completions-cache-v1'

type CompletionsCache = {
  inicioIso: string
  fimIso: string
  data: ChecklistCompletionRow[]
  at: number
}

let _completionsCache: CompletionsCache | null = null

/** Retorna dados em cache (módulo ou sessionStorage) se válidos para o período. */
export function getCachedChecklistCompletions(
  inicioIso: string,
  fimIso: string,
): ChecklistCompletionRow[] | null {
  // 1. Cache de módulo — mais rápido
  if (
    _completionsCache &&
    _completionsCache.inicioIso === inicioIso &&
    _completionsCache.fimIso   === fimIso &&
    Date.now() - _completionsCache.at <= COMPLETIONS_CACHE_TTL_MS
  ) {
    return _completionsCache.data
  }

  // 2. sessionStorage — sobrevive ao page reload dentro da mesma aba
  try {
    const raw = sessionStorage.getItem(COMPLETIONS_SESSION_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw) as CompletionsCache
    if (entry.inicioIso !== inicioIso || entry.fimIso !== fimIso) return null
    if (Date.now() - entry.at > COMPLETIONS_CACHE_TTL_MS) return null
    _completionsCache = entry   // popula cache de módulo para próximas leituras
    return entry.data
  } catch { return null }
}

/** Invalida ambas as camadas de cache (usado pelo botão Atualizar). */
export function invalidateCompletionsCache() {
  _completionsCache = null
  try { sessionStorage.removeItem(COMPLETIONS_SESSION_KEY) } catch { /* ignore */ }
}

/** Busca todos os checklists concluídos no intervalo (pagina além do limite padrão de 1000 do Supabase). */
export async function fetchCompletedChecklistsInPeriod(
  inicioIso: string,
  fimIso: string,
): Promise<ChecklistCompletionRow[]> {
  const { data, error } = await fetchAllSupabasePages<ChecklistCompletionRow>((from, to) =>
    supabase
      .from('checklists')
      .select('data_inspecao, nc_count, dados_veiculo')
      .eq('progresso', 100)
      .gte('data_inspecao', inicioIso)
      .lte('data_inspecao', fimIso)
      .order('data_inspecao', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  )

  if (error) throw error

  // Persiste em ambas as camadas
  const entry: CompletionsCache = { inicioIso, fimIso, data, at: Date.now() }
  _completionsCache = entry
  try { sessionStorage.setItem(COMPLETIONS_SESSION_KEY, JSON.stringify(entry)) } catch { /* quota */ }
  return data
}

export function countUniqueCompletionsInPeriod(
  completions: Set<string>,
  days: string[],
): number {
  const daysSet = new Set(days)
  let total = 0
  for (const key of completions) {
    const pipeIdx = key.lastIndexOf('|')
    if (pipeIdx === -1) continue
    if (daysSet.has(key.slice(pipeIdx + 1))) total += 1
  }
  return total
}
