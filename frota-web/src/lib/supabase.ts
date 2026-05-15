import { createClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://placeholder.supabase.co'
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'placeholder'

export const supabaseConfigured =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseConfigured) {
  console.warn('[supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados.')
}

export const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export type ChecklistRow = {
  id: string
  tipo: string
  nome_operador: string
  matricula: string
  // dados extras do veículo (placa, modelo, km, horímetro, prefixo, processo, localidade…)
  dados_veiculo: Record<string, string>
  data_inspecao: string
  respostas: Record<string, 'c' | 'nc' | 'na'>
  observacoes: Record<string, string>
  progresso: number
  nc_count: number
  nc_imperativos: number   // itens imperativos com NC (impedem condução)
  problemas: string
  descricao_problema: string
  nome_supervisor: string
  evidencia_urls: string[] // URLs dos arquivos enviados ao Supabase Storage
  created_at: string
}

export type ChecklistInsert = Omit<ChecklistRow, 'id' | 'created_at'>

export type ApontamentoRow = {
  id: string
  veiculo_id: string
  veiculo_label: string
  prefixo: string
  defeito: string
  data_apontamento: string
  prazo: string
  resolvido: boolean
  data_resolvido: string | null
  hora_resolvido: string | null
  reparo_valor: number | null
  reparo_descricao: string | null
  reparo_imagens: string[]
  os_arquivo: string | null
  processo: string
  base: string
  coordenador: string
  responsavel: string
  checklist_id: string | null
  nc_item_id: string | null
  nc_fotos: string[]
  created_at: string
}

export type HistoricoRow = {
  id: string
  apontamento_id: string
  acao: 'resolvido' | 'reaberto' | 'editado' | 'criado'
  usuario_email: string
  data_hora: string
  descricao: string | null
  reparo_valor: number | null
  reparo_descricao: string | null
  created_at: string
}
