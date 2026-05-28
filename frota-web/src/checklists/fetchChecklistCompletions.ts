import { supabase } from '../lib/supabase'
import { fetchAllSupabasePages } from '../lib/supabasePaginate'

export type ChecklistCompletionRow = {
  data_inspecao: unknown
  nc_count: unknown
  dados_veiculo: unknown
  nome_supervisor?: unknown
  created_at?: unknown
}

// ---------------------------------------------------------------------------
// Cache de módulo — persiste entre remounts do componente na mesma sessão
// ---------------------------------------------------------------------------
const COMPLETIONS_CACHE_TTL_MS = 5 * 60 * 1000 // 5 min

type CompletionsCache = {
  inicioIso: string
  fimIso: string
  data: ChecklistCompletionRow[]
  at: number
}

let _completionsCache: CompletionsCache | null = null

/** Retorna dados em cache se ainda válidos para o mesmo período; caso contrário null. */
export function getCachedChecklistCompletions(
  inicioIso: string,
  fimIso: string,
): ChecklistCompletionRow[] | null {
  if (!_completionsCache) return null
  if (_completionsCache.inicioIso !== inicioIso || _completionsCache.fimIso !== fimIso) return null
  if (Date.now() - _completionsCache.at > COMPLETIONS_CACHE_TTL_MS) return null
  return _completionsCache.data
}

/** Busca todos os checklists concluídos no intervalo (pagina além do limite padrão de 1000 do Supabase). */
export async function fetchCompletedChecklistsInPeriod(
  inicioIso: string,
  fimIso: string,
): Promise<ChecklistCompletionRow[]> {
  const { data, error } = await fetchAllSupabasePages<ChecklistCompletionRow>((from, to) =>
    supabase
      .from('checklists')
      .select('data_inspecao, nc_count, dados_veiculo, nome_supervisor, created_at')
      .eq('progresso', 100)
      .gte('data_inspecao', inicioIso)
      .lte('data_inspecao', fimIso)
      .order('data_inspecao', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  )

  if (error) throw error

  // Armazena no cache de módulo para uso imediato no próximo remount
  _completionsCache = { inicioIso, fimIso, data, at: Date.now() }
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
