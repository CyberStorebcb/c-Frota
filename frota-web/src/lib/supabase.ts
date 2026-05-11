import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  console.warn('[supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados.')
}

export const supabase = createClient(url ?? '', key ?? '')

export type ChecklistRow = {
  id: string
  tipo: string
  nome_operador: string
  matricula: string
  placa: string
  km: string
  data_inspecao: string
  respostas: Record<string, 'ok' | 'nok' | 'na'>
  observacoes: Record<string, string>
  progresso: number
  nok_count: number
  created_at: string
}

export type ChecklistInsert = Omit<ChecklistRow, 'id' | 'created_at'>
