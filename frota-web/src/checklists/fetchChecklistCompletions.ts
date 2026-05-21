import { supabase } from '../lib/supabase'
import { fetchAllSupabasePages } from '../lib/supabasePaginate'

export type ChecklistCompletionRow = {
  data_inspecao: unknown
  nc_count: unknown
  dados_veiculo: unknown
  created_at?: unknown
}

/** Busca todos os checklists concluídos no intervalo (pagina além do limite padrão de 1000 do Supabase). */
export async function fetchCompletedChecklistsInPeriod(
  inicioIso: string,
  fimIso: string,
): Promise<ChecklistCompletionRow[]> {
  const { data, error } = await fetchAllSupabasePages<ChecklistCompletionRow>((from, to) =>
    supabase
      .from('checklists')
      .select('data_inspecao, nc_count, dados_veiculo, created_at')
      .eq('progresso', 100)
      .gte('data_inspecao', inicioIso)
      .lte('data_inspecao', fimIso)
      .order('data_inspecao', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  )

  if (error) throw error
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
