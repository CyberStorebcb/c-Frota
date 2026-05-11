import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/supabase'
import { SCHEMA_MAP } from '../data/checklistSchemas'

// ---------------------------------------------------------------------------
// Tipo público
// ---------------------------------------------------------------------------
export type Apontamento = {
  id: string           // `${checklistId}__${itemId}`
  checklistId: string
  ncItemId: string
  veiculoId: string
  veiculoLabel: string
  prefixo: string
  defeito: string
  dataApontamento: string
  prazo: string | null
  resolvido: boolean
  dataResolvido: string | null
  horaResolvido: string | null
  reparoValor: number | null
  reparoDescricao: string | null
  reparoImagens: string[]
  osArquivo: string | null
  processo: string
  base: string
  coordenador: string
  responsavel: string
  ncFotos: string[]
}

export type NovoApontamento = Omit<
  Apontamento,
  'id' | 'resolvido' | 'dataResolvido' | 'horaResolvido' | 'reparoValor' | 'reparoDescricao' | 'reparoImagens' | 'osArquivo'
>

// ---------------------------------------------------------------------------
// Resolução armazenada na tabela `apontamentos`
// ---------------------------------------------------------------------------
type Resolucao = {
  id: string          // `${checklistId}__${itemId}`
  resolvido: boolean
  dataResolvido: string | null
  horaResolvido: string | null
  reparoValor: number | null
  reparoDescricao: string | null
  reparoImagens: string[]
  osArquivo: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToResolucao(r: any): Resolucao {
  return {
    id:              r.id,
    resolvido:       Boolean(r.resolvido),
    dataResolvido:   r.data_resolvido   ?? null,
    horaResolvido:   r.hora_resolvido   ?? null,
    reparoValor:     r.reparo_valor     != null ? Number(r.reparo_valor) : null,
    reparoDescricao: r.reparo_descricao ?? null,
    reparoImagens:   Array.isArray(r.reparo_imagens) ? r.reparo_imagens : [],
    osArquivo:       r.os_arquivo       ?? null,
  }
}

// ---------------------------------------------------------------------------
// Converte checklist + item NC → Apontamento
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function checklistItemToApontamento(cl: any, itemId: string, resolucoes: Map<string, Resolucao>): Apontamento {
  const id = `${cl.id}__${itemId}`
  const dv = cl.dados_veiculo ?? {}
  const placa   = dv.placa   ?? ''
  const prefixo = dv.prefixo ?? ''
  const schema  = SCHEMA_MAP[cl.tipo as string]
  const item    = schema?.grupos.flatMap((g) => g.itens).find((i) => i.id === itemId)
  const label   = item?.label ?? itemId

  // Fotos NC do item (extraídas do campo observacoes com marcador __fotos__)
  const obsRaw: string = cl.observacoes?.[itemId] ?? ''
  const fotosMarker = '__fotos__:'
  const fotosIdx = obsRaw.indexOf(fotosMarker)
  const ncFotos = fotosIdx >= 0
    ? obsRaw.slice(fotosIdx + fotosMarker.length).split('|').filter(Boolean)
    : []

  const res = resolucoes.get(id)

  // Prazo: data_apontamento + 7 dias
  const dp = new Date(cl.data_inspecao + 'T12:00:00')
  dp.setDate(dp.getDate() + 7)
  const prazo = dp.toISOString().slice(0, 10)

  return {
    id,
    checklistId:     cl.id,
    ncItemId:        itemId,
    veiculoId:       `placa-${placa.toLowerCase() || 'desconhecido'}`,
    veiculoLabel:    prefixo && placa ? `${prefixo} · ${placa}` : placa || cl.nome_operador,
    prefixo,
    defeito:         `[Checklist NC] ${label}`,
    dataApontamento: cl.data_inspecao,
    prazo,
    resolvido:       res?.resolvido       ?? false,
    dataResolvido:   res?.dataResolvido   ?? null,
    horaResolvido:   res?.horaResolvido   ?? null,
    reparoValor:     res?.reparoValor     ?? null,
    reparoDescricao: res?.reparoDescricao ?? null,
    reparoImagens:   res?.reparoImagens   ?? [],
    osArquivo:       res?.osArquivo       ?? null,
    processo:        'Checklist',
    base:            dv.localidade ?? '',
    coordenador:     cl.nome_supervisor ?? '',
    responsavel:     cl.nome_operador,
    ncFotos,
  }
}

// ---------------------------------------------------------------------------
// Helpers de data local
// ---------------------------------------------------------------------------
function localIsoDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function localTimeHHmm(d: Date) {
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

// ---------------------------------------------------------------------------
// Contexto
// ---------------------------------------------------------------------------
type Ctx = {
  rows: Apontamento[]
  /** Total de registros na tabela `checklists` com inspeção concluída (`progresso` = 100). */
  checklistsRealizadosTotal: number
  carregando: boolean
  marcarResolvido: (
    id: string,
    payload?: { valor: number | null; descricao: string | null; imagens: string[]; osArquivo?: string | null },
  ) => Promise<void>
  hasByChecklist: (checklistId: string, ncItemId: string) => boolean
  persistError: string | null
  clearPersistError: () => void
  recarregar: () => Promise<void>
}

const ApontamentosContext = createContext<Ctx | null>(null)

export function ApontamentosProvider({ children }: { children: ReactNode }) {
  const [rows, setRows]               = useState<Apontamento[]>([])
  const [checklistsRealizadosTotal, setChecklistsRealizadosTotal] = useState(0)
  const [carregando, setCarregando]   = useState(true)
  const [persistError, setPersistError] = useState<string | null>(null)
  const clearPersistError = useCallback(() => setPersistError(null), [])
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const recarregar = useCallback(async () => {
    setCarregando(true)
    localStorage.removeItem('frota-apontamentos-v1')

    // 1. Total de checklists concluídos (mesmo critério do formulário: progresso 100)
    const { count: totalRealizados, error: countError } = await supabase
      .from('checklists')
      .select('id', { count: 'exact', head: true })
      .eq('progresso', 100)
    setChecklistsRealizadosTotal(countError ? 0 : (totalRealizados ?? 0))

    // 2. Checklists com NC (apenas campos necessários) → linhas da tabela Gerenciar
    const { data: clData, error: clError } = await supabase
      .from('checklists')
      .select('id, tipo, nome_operador, nome_supervisor, data_inspecao, dados_veiculo, respostas, observacoes')
      .gt('nc_count', 0)
      .order('data_inspecao', { ascending: true })

    if (clError) {
      setPersistError('Erro ao carregar checklists: ' + clError.message)
      setCarregando(false)
      return
    }

    // 3. Busca resoluções da tabela apontamentos
    const { data: resData } = await supabase
      .from('apontamentos')
      .select('id, resolvido, data_resolvido, hora_resolvido, reparo_valor, reparo_descricao, reparo_imagens, os_arquivo')

    const resolucoes = new Map<string, Resolucao>(
      ((resData ?? []) as unknown[]).map((r) => {
        const res = rowToResolucao(r)
        return [res.id, res]
      })
    )

    // 4. Expande cada checklist em um apontamento por item NC
    const apontamentos: Apontamento[] = []
    for (const cl of (clData ?? []) as unknown[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const checklist = cl as any
      const respostas: Record<string, string> = checklist.respostas ?? {}
      for (const [itemId, resp] of Object.entries(respostas)) {
        if (resp === 'nc') {
          apontamentos.push(checklistItemToApontamento(checklist, itemId, resolucoes))
        }
      }
    }

    setRows(apontamentos)
    setPersistError(null)
    setCarregando(false)
  }, [])

  useEffect(() => {
    void recarregar()

    const ch = supabase
      .channel('apontamentos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apontamentos' }, () => {
        void recarregar()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklists' }, () => {
        void recarregar()
      })
      .subscribe()

    channelRef.current = ch
    return () => { void supabase.removeChannel(ch) }
  }, [recarregar])

  const marcarResolvido = useCallback(async (
    id: string,
    payload?: { valor: number | null; descricao: string | null; imagens: string[]; osArquivo?: string | null },
  ) => {
    const now = new Date()
    const hoje = localIsoDate(now)
    const hora = localTimeHHmm(now)

    // Atualiza localmente de imediato
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              resolvido: true,
              dataResolvido: hoje,
              horaResolvido: hora,
              reparoValor:     payload?.valor ?? r.reparoValor ?? null,
              reparoDescricao: typeof payload?.descricao === 'string' ? payload.descricao : r.reparoDescricao ?? null,
              reparoImagens:   payload?.imagens?.slice(0, 3) ?? r.reparoImagens ?? [],
              osArquivo:       payload?.osArquivo !== undefined ? payload.osArquivo : r.osArquivo ?? null,
            }
          : r,
      ),
    )

    // Upsert na tabela apontamentos (resolução)
    const row = rows.find((r) => r.id === id)
    const { error } = await supabase
      .from('apontamentos')
      .upsert({
        id,
        veiculo_id:       row?.veiculoId      ?? '',
        veiculo_label:    row?.veiculoLabel   ?? '',
        prefixo:          row?.prefixo        ?? '',
        defeito:          row?.defeito        ?? '',
        data_apontamento: row?.dataApontamento ?? hoje,
        prazo:            row?.prazo          ?? hoje,
        resolvido:        true,
        data_resolvido:   hoje,
        hora_resolvido:   hora,
        reparo_valor:     payload?.valor ?? null,
        reparo_descricao: payload?.descricao ?? null,
        reparo_imagens:   payload?.imagens?.slice(0, 3) ?? [],
        os_arquivo:       payload?.osArquivo ?? null,
        processo:         row?.processo ?? 'Checklist',
        base:             row?.base ?? '',
        coordenador:      row?.coordenador ?? '',
        responsavel:      row?.responsavel ?? '',
        checklist_id:     row?.checklistId ?? null,
        nc_item_id:       row?.ncItemId ?? null,
        nc_fotos:         row?.ncFotos ?? [],
      })

    if (error) {
      setPersistError('Erro ao salvar resolução: ' + error.message)
      void recarregar()
    }
  }, [rows, recarregar])

  const hasByChecklist = useCallback((checklistId: string, ncItemId: string): boolean => {
    return rows.some((r) => r.checklistId === checklistId && r.ncItemId === ncItemId && r.resolvido)
  }, [rows])

  const value = useMemo(
    () => ({
      rows,
      checklistsRealizadosTotal,
      carregando,
      marcarResolvido,
      hasByChecklist,
      persistError,
      clearPersistError,
      recarregar,
    }),
    [rows, checklistsRealizadosTotal, carregando, marcarResolvido, hasByChecklist, persistError, clearPersistError, recarregar],
  )

  return <ApontamentosContext.Provider value={value}>{children}</ApontamentosContext.Provider>
}

export function useApontamentos() {
  const ctx = useContext(ApontamentosContext)
  if (!ctx) throw new Error('useApontamentos deve ser usado dentro de ApontamentosProvider')
  return ctx
}
