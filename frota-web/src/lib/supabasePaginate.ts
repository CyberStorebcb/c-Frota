import type { PostgrestError } from '@supabase/supabase-js'

export const SUPABASE_PAGE_SIZE = 1000

/** Busca todas as páginas além do limite padrão de 1000 linhas do PostgREST/Supabase. */
export async function fetchAllSupabasePages<T>(
  runPage: (from: number, to: number) => Promise<{ data: T[] | null; error: PostgrestError | null }>,
  pageSize = SUPABASE_PAGE_SIZE,
): Promise<{ data: T[]; error: PostgrestError | null }> {
  const allRows: T[] = []
  let from = 0

  while (true) {
    const { data, error } = await runPage(from, from + pageSize - 1)
    if (error) return { data: allRows, error }
    if (!data?.length) break
    allRows.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }

  return { data: allRows, error: null }
}
