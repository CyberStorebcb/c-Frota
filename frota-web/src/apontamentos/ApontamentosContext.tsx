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
import { supabase, type HistoricoRow } from '../lib/supabase'
import { fetchAllSupabasePages } from '../lib/supabasePaginate'
import { SCHEMA_MAP } from '../data/checklistSchemas'
import {
  apontamentoVeiculoIdFromPlaca,
  formatPlaca,
  normalizePlaca,
  resolveFleetPlacaFromDadosVeiculo,
  getDisplayedFleetVehicles,
} from '../frota/vehicleRegistry'

// ---------------------------------------------------------------------------
// Tipo público
// ---------------------------------------------------------------------------
export type Apontamento = {
  id: string           // `${checklistId}__${itemId}`
  checklistId: string
  ncItemId: string
  veiculoId: string
  placa: string
  modelo: string
  veiculoLabel: string
  prefixo: string
  defeito: string
  dataApontamento: string
  horaApontamento: string
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
  supervisor: string
  ncFotos: string[]
  problemasAdicionais: string
  descricaoProblema: string
  /** Item 🚫 impeditivo no checklist — NC impede condução. */
  imperativo: boolean
  justificado: boolean
  justificativa: string | null
  justificativaData: string | null
  justificativaImagem: string | null
  agendamentoData: string | null
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
  justificado: boolean
  justificativa: string | null
  justificativaData: string | null
  justificativaImagem: string | null
  agendamentoData: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToResolucao(r: any): Resolucao {
  return {
    id:                  r.id,
    resolvido:           Boolean(r.resolvido),
    dataResolvido:       r.data_resolvido      ?? null,
    horaResolvido:       r.hora_resolvido      ?? null,
    reparoValor:         r.reparo_valor        != null ? Number(r.reparo_valor) : null,
    reparoDescricao:     r.reparo_descricao    ?? null,
    reparoImagens:       Array.isArray(r.reparo_imagens) ? r.reparo_imagens : [],
    osArquivo:           r.os_arquivo          ?? null,
    justificado:         Boolean(r.justificado),
    justificativa:       r.justificativa        ?? null,
    justificativaData:   r.justificativa_data   ?? null,
    justificativaImagem: r.justificativa_imagem ?? null,
    agendamentoData:     r.agendamento_data     ?? null,
  }
}

// ---------------------------------------------------------------------------
// Mapa placa → veículo (lazy, reconstruído quando necessário)
// ---------------------------------------------------------------------------
function buildVehicleMap(): Map<string, { coordenador: string; responsavel: string; supervisor: string; processo: string; base: string }> {
  const map = new Map<string, { coordenador: string; responsavel: string; supervisor: string; processo: string; base: string }>()
  for (const v of getDisplayedFleetVehicles()) {
    const p = normalizePlaca(v.placa)
    if (!p) continue
    map.set(p, {
      coordenador: v.coordenador,
      responsavel: v.responsavel,
      supervisor: v.supervisor,
      processo: v.tipo,
      base: v.base,
    })
  }
  return map
}

// ---------------------------------------------------------------------------
// Converte checklist + item NC → Apontamento
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function checklistItemToApontamento(cl: any, itemId: string, resolucoes: Map<string, Resolucao>, vehicleMap: Map<string, { coordenador: string; responsavel: string; supervisor: string; processo: string; base: string }>): Apontamento {
  const id = `${cl.id}__${itemId}`
  const dv = cl.dados_veiculo ?? {}
  const placa   = resolveFleetPlacaFromDadosVeiculo(dv)
  const prefixo = (dv.prefixo ?? '').trim()
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
    veiculoId:       apontamentoVeiculoIdFromPlaca(placa),
    placa,
    modelo:          (dv.marca_modelo ?? '').trim(),
    veiculoLabel:    prefixo && placa ? `${prefixo} · ${formatPlaca(placa)}` : formatPlaca(placa) || cl.nome_operador,
    prefixo,
    defeito:         label,
    dataApontamento: cl.data_inspecao,
    horaApontamento: cl.created_at ? new Date(cl.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
    prazo,
    resolvido:       res?.resolvido       ?? false,
    dataResolvido:   res?.dataResolvido   ?? null,
    horaResolvido:   res?.horaResolvido   ?? null,
    reparoValor:     res?.reparoValor     ?? null,
    reparoDescricao: res?.reparoDescricao ?? null,
    reparoImagens:   res?.reparoImagens   ?? [],
    osArquivo:           res?.osArquivo           ?? null,
    justificado:         res?.justificado         ?? false,
    justificativa:       res?.justificativa       ?? null,
    justificativaData:   res?.justificativaData   ?? null,
    justificativaImagem: res?.justificativaImagem ?? null,
    agendamentoData:     res?.agendamentoData     ?? null,
    processo:             vehicleMap.get(placa)?.processo ?? 'Checklist',
    base:                 vehicleMap.get(placa)?.base || (dv.localidade ?? ''),
    coordenador:          vehicleMap.get(placa)?.coordenador ?? cl.nome_supervisor ?? '',
    responsavel:          vehicleMap.get(placa)?.responsavel ?? cl.nome_operador,
    supervisor:           vehicleMap.get(placa)?.supervisor ?? cl.nome_supervisor ?? '',
    ncFotos,
    problemasAdicionais:  cl.problemas ?? '',
    descricaoProblema:    cl.descricao_problema ?? '',
    imperativo:           item?.imperativo === true,
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
// Cache sessionStorage — persiste entre page reloads na mesma aba
// ---------------------------------------------------------------------------
const ROWS_CACHE_KEY  = 'frota-rows-cache-v1'
const ROWS_CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutos

type RowsCache = {
  rows: Apontamento[]
  checklistsRealizadosTotal: number
  at: number
}

function saveRowsToCache(rows: Apontamento[], total: number) {
  try {
    const entry: RowsCache = { rows, checklistsRealizadosTotal: total, at: Date.now() }
    sessionStorage.setItem(ROWS_CACHE_KEY, JSON.stringify(entry))
  } catch { /* quota exceeded — silencia */ }
}

function loadRowsFromCache(): RowsCache | null {
  try {
    const raw = sessionStorage.getItem(ROWS_CACHE_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw) as RowsCache
    if (Date.now() - entry.at > ROWS_CACHE_TTL_MS) return null
    return entry
  } catch { return null }
}

// ---------------------------------------------------------------------------
// Contexto
// ---------------------------------------------------------------------------
export type PeriodoCarregado = '180d' | '1a' | '2a' | 'tudo'

type Ctx = {
  rows: Apontamento[]
  /** Total de registros na tabela `checklists` com inspeção concluída (`progresso` = 100). */
  checklistsRealizadosTotal: number
  carregando: boolean
  periodoCarregado: PeriodoCarregado
  setPeriodoCarregado: (p: PeriodoCarregado) => void
  marcarResolvido: (
    id: string,
    payload?: { valor: number | null; descricao: string | null; imagens: string[]; osArquivo?: string | null; dataResolvido?: string | null },
    usuarioEmail?: string,
  ) => Promise<void>
  marcarJustificado: (
    id: string,
    payload: { justificativa: string; data: string; imagem: string | null; agendamentoData: string | null },
    usuarioEmail?: string,
  ) => Promise<void>
  buscarHistorico: (apontamentoId: string) => Promise<HistoricoRow[]>
  fetchApontamentoDetalhes: (id: string) => Promise<{ reparoImagens: string[]; osArquivo: string | null; justificativaImagem: string | null }>
  hasByChecklist: (checklistId: string, ncItemId: string) => boolean
  persistError: string | null
  clearPersistError: () => void
  recarregar: () => Promise<void>
}

const ApontamentosContext = createContext<Ctx | null>(null)

export function ApontamentosProvider({ children }: { children: ReactNode }) {
  // Inicializa a partir do cache sessionStorage se disponível — evita tela em branco no reload
  const [rows, setRows]               = useState<Apontamento[]>(() => loadRowsFromCache()?.rows ?? [])
  const [checklistsRealizadosTotal, setChecklistsRealizadosTotal] = useState(() => loadRowsFromCache()?.checklistsRealizadosTotal ?? 0)
  const [carregando, setCarregando]   = useState(() => loadRowsFromCache() === null)
  const [persistError, setPersistError] = useState<string | null>(null)
  const clearPersistError = useCallback(() => setPersistError(null), [])
  const [periodoCarregado, setPeriodoCarregadoState] = useState<PeriodoCarregado>('180d')
  const periodoCarregadoRef = useRef<PeriodoCarregado>('180d')
  // Cache do count global de checklists — evita query a cada reload (TTL: 5 min)
  const countCacheRef = useRef<{ value: number; at: number } | null>(null)
  const COUNT_TTL_MS = 5 * 60 * 1000

  const setPeriodoCarregado = useCallback((p: PeriodoCarregado) => {
    periodoCarregadoRef.current = p
    setPeriodoCarregadoState(p)
  }, [])

  const recarregarInternal = useCallback(async (silent = false) => {
    if (!silent) setCarregando(true)
    localStorage.removeItem('frota-apontamentos-v1')

    // Calcula corte de data conforme período selecionado
    let dataCorteIso: string | null = null
    const periodo = periodoCarregadoRef.current
    if (periodo !== 'tudo') {
      const dataCorte = new Date()
      if (periodo === '180d') dataCorte.setDate(dataCorte.getDate() - 180)
      else if (periodo === '1a') dataCorte.setFullYear(dataCorte.getFullYear() - 1)
      else if (periodo === '2a') dataCorte.setFullYear(dataCorte.getFullYear() - 2)
      dataCorteIso = dataCorte.toISOString().slice(0, 10)
    }

    let totalRealizados: number | null = null
    let countError: unknown = null
    let clData: unknown[] | null = null
    let clError: { message: string } | null = null
    let resData: unknown[] | null = null

    try {
      ;[
        { count: totalRealizados, error: countError },
        { data: clData, error: clError },
        { data: resData },
      ] = await Promise.all([
        // 1. Total de checklists concluídos — cacheado por 5 min para evitar query a cada poll
        countCacheRef.current && Date.now() - countCacheRef.current.at < COUNT_TTL_MS
          ? Promise.resolve({ count: countCacheRef.current.value, error: null })
          : supabase.from('checklists').select('id', { count: 'exact', head: true }).eq('progresso', 100),

        // 2. Checklists com NC via função SQL — filtra server-side usando EXISTS(jsonb_each_text)
        // Muito mais eficiente: só retorna checklists que têm pelo menos um item 'nc'
        fetchAllSupabasePages((from, to) =>
          supabase.rpc('checklists_com_nc', {
            corte_data: dataCorteIso ?? '',
            p_from: from,
            p_to: to,
          }),
        ),

        // 3. Resoluções no período selecionado (sem campos pesados: reparo_imagens, os_arquivo, justificativa_imagem)
        // Esses campos são buscados sob demanda via fetchApontamentoDetalhes() ao abrir o modal
        fetchAllSupabasePages((from, to) => {
          let q = supabase
            .from('apontamentos')
            .select('id, resolvido, data_resolvido, hora_resolvido, reparo_valor, reparo_descricao, justificado, justificativa, justificativa_data, agendamento_data')
          if (dataCorteIso) q = q.gte('data_apontamento', dataCorteIso)
          return q.order('id', { ascending: true }).range(from, to)
        }),
      ] as const)
    } catch (err) {
      if (!silent) setPersistError('Erro de conexão ao carregar dados: ' + String(err))
      setCarregando(false)
      return
    }

    const countFinal = countError ? 0 : (totalRealizados ?? 0)
    if (!countError && totalRealizados != null) {
      countCacheRef.current = { value: countFinal, at: Date.now() }
    }
    setChecklistsRealizadosTotal(countFinal)

    if (clError) {
      if (!silent) setPersistError('Erro ao carregar checklists: ' + clError.message)
      setCarregando(false)
      return
    }

    const resolucoes = new Map<string, Resolucao>(
      ((resData ?? []) as unknown[]).map((r) => {
        const res = rowToResolucao(r)
        return [res.id, res]
      })
    )

    // 4. Expande cada checklist em um apontamento por item NC
    //    Só gera apontamentos para checklists que realmente têm respostas 'nc'.
    const vehicleMap = buildVehicleMap()
    const apontamentos: Apontamento[] = []
    for (const cl of (clData ?? []) as unknown[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const checklist = cl as any
      const respostas: Record<string, string> = checklist.respostas ?? {}
      const ncItems = Object.entries(respostas).filter(([, v]) => v === 'nc')
      if (ncItems.length === 0) continue
      for (const [itemId] of ncItems) {
        apontamentos.push(checklistItemToApontamento(checklist, itemId, resolucoes, vehicleMap))
      }
    }

    setRows(apontamentos)
    saveRowsToCache(apontamentos, countFinal)   // persiste para o próximo reload
    setPersistError(null)
    setCarregando(false)
  }, [])

  /** Recarga pública — exibe spinner (usada pelo botão "Atualizar" e pela carga inicial). */
  const recarregar = useCallback(async () => {
    await recarregarInternal(false)
  }, [recarregarInternal])

  useEffect(() => {
    // Se há cache válido → refresh silencioso; caso contrário → exibe spinner (primeiro load)
    const hasCachedData = loadRowsFromCache() !== null
    queueMicrotask(() => { void recarregarInternal(hasCachedData) })

    // Polling a cada 60s silencioso — substitui Realtime para eliminar drenagem contínua do WAL.
    // Os dados são atualizados em background sem piscar o spinner na tela.
    const POLL_INTERVAL_MS = 60_000
    const pollTimer = setInterval(() => { void recarregarInternal(true) }, POLL_INTERVAL_MS)

    return () => {
      clearInterval(pollTimer)
    }
  }, [recarregarInternal])

  const marcarResolvido = useCallback(async (
    id: string,
    payload?: { valor: number | null; descricao: string | null; imagens: string[]; osArquivo?: string | null; dataResolvido?: string | null },
    usuarioEmail = 'desconhecido',
  ) => {
    const now = new Date()
    const hoje = localIsoDate(now)
    const dataResolvido = payload?.dataResolvido || hoje
    const hora = localTimeHHmm(now)

    // Atualiza localmente de imediato
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              resolvido: true,
              dataResolvido,
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
        data_resolvido:   dataResolvido,
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
      return
    }

    // Grava no histórico
    await supabase.from('apontamento_historico').insert({
      apontamento_id:  id,
      acao:            'resolvido',
      usuario_email:   usuarioEmail,
      data_hora:       `${dataResolvido}T${hora}:00`,
      descricao:       payload?.descricao ?? null,
      reparo_valor:    payload?.valor ?? null,
      reparo_descricao: payload?.descricao ?? null,
    })
  }, [rows, recarregar])

  const marcarJustificado = useCallback(async (
    id: string,
    payload: { justificativa: string; data: string; imagem: string | null; agendamentoData: string | null },
    usuarioEmail = 'desconhecido',
  ) => {
    const now = new Date()
    const hora = localTimeHHmm(now)

    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              justificado:         true,
              justificativa:       payload.justificativa,
              justificativaData:   payload.data,
              justificativaImagem: payload.imagem,
              agendamentoData:     payload.agendamentoData,
            }
          : r,
      ),
    )

    const row = rows.find((r) => r.id === id)
    const { error } = await supabase
      .from('apontamentos')
      .upsert({
        id,
        veiculo_id:           row?.veiculoId      ?? '',
        veiculo_label:        row?.veiculoLabel   ?? '',
        prefixo:              row?.prefixo        ?? '',
        defeito:              row?.defeito        ?? '',
        data_apontamento:     row?.dataApontamento ?? payload.data,
        prazo:                row?.prazo          ?? payload.data,
        resolvido:            false,
        justificado:          true,
        justificativa:        payload.justificativa,
        justificativa_data:   payload.data,
        justificativa_imagem: payload.imagem,
        agendamento_data:     payload.agendamentoData,
        processo:             row?.processo ?? 'Checklist',
        base:                 row?.base ?? '',
        coordenador:          row?.coordenador ?? '',
        responsavel:          row?.responsavel ?? '',
        checklist_id:         row?.checklistId ?? null,
        nc_item_id:           row?.ncItemId ?? null,
        nc_fotos:             row?.ncFotos ?? [],
      })

    if (error) {
      setPersistError('Erro ao salvar justificativa: ' + error.message)
      await recarregar()
      return
    }

    const descHistorico = payload.agendamentoData
      ? `Justificativa: ${payload.justificativa} | Agendado para: ${payload.agendamentoData}`
      : `Justificativa: ${payload.justificativa}`

    await supabase.from('apontamento_historico').insert({
      apontamento_id:   id,
      acao:             'editado',
      usuario_email:    usuarioEmail,
      data_hora:        `${payload.data}T${hora}:00`,
      descricao:        descHistorico,
      reparo_valor:     null,
      reparo_descricao: null,
    })
  }, [rows, recarregar])

  const buscarHistorico = useCallback(async (apontamentoId: string): Promise<HistoricoRow[]> => {
    const { data } = await supabase
      .from('apontamento_historico')
      .select('*')
      .eq('apontamento_id', apontamentoId)
      .order('data_hora', { ascending: false })
    return (data ?? []) as HistoricoRow[]
  }, [])

  /** Busca sob demanda os campos pesados (imagens base64) de um apontamento.
   *  Chamado apenas ao abrir o modal de resolução/justificativa. */
  const fetchApontamentoDetalhes = useCallback(async (id: string): Promise<{
    reparoImagens: string[]
    osArquivo: string | null
    justificativaImagem: string | null
  }> => {
    const { data } = await supabase
      .from('apontamentos')
      .select('reparo_imagens, os_arquivo, justificativa_imagem')
      .eq('id', id)
      .single()
    if (!data) return { reparoImagens: [], osArquivo: null, justificativaImagem: null }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = data as any
    // reparo_imagens pode chegar como: array de URLs, string única (URL), objeto {base64:...}
    // ou null — normaliza sempre para string[]
    let reparoImagens: string[] = []
    if (Array.isArray(d.reparo_imagens)) {
      reparoImagens = d.reparo_imagens.filter((v: unknown) => typeof v === 'string')
    } else if (typeof d.reparo_imagens === 'string' && d.reparo_imagens) {
      reparoImagens = [d.reparo_imagens]
    }
    return {
      reparoImagens,
      osArquivo:          d.os_arquivo          ?? null,
      justificativaImagem: d.justificativa_imagem ?? null,
    }
  }, [])

  const hasByChecklist = useCallback((checklistId: string, ncItemId: string): boolean => {
    return rows.some((r) => r.checklistId === checklistId && r.ncItemId === ncItemId && r.resolvido)
  }, [rows])

  const value = useMemo(
    () => ({
      rows,
      checklistsRealizadosTotal,
      carregando,
      periodoCarregado,
      setPeriodoCarregado,
      marcarResolvido,
      marcarJustificado,
      buscarHistorico,
      fetchApontamentoDetalhes,
      hasByChecklist,
      persistError,
      clearPersistError,
      recarregar,
    }),
    [rows, checklistsRealizadosTotal, carregando, periodoCarregado, setPeriodoCarregado, marcarResolvido, marcarJustificado, buscarHistorico, fetchApontamentoDetalhes, hasByChecklist, persistError, clearPersistError, recarregar],
  )

  return <ApontamentosContext.Provider value={value}>{children}</ApontamentosContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook exposto junto ao provider
export function useApontamentos() {
  const ctx = useContext(ApontamentosContext)
  if (!ctx) throw new Error('useApontamentos deve ser usado dentro de ApontamentosProvider')
  return ctx
}
