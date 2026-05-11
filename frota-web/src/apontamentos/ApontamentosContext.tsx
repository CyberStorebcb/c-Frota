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

// ---------------------------------------------------------------------------
// Tipo público
// ---------------------------------------------------------------------------
export type Apontamento = {
  id: string
  veiculoId: string
  veiculoLabel: string
  prefixo: string
  defeito: string
  dataApontamento: string
  prazo: string
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
  checklistId?: string
  ncFotos?: string[]
  ncItemId?: string
}

export type NovoApontamento = Omit<
  Apontamento,
  'id' | 'resolvido' | 'dataResolvido' | 'horaResolvido' | 'reparoValor' | 'reparoDescricao' | 'reparoImagens' | 'osArquivo'
>

// ---------------------------------------------------------------------------
// Conversão Supabase row ↔ Apontamento
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRow(r: any): Apontamento {
  return {
    id:              r.id,
    veiculoId:       r.veiculo_id       ?? '',
    veiculoLabel:    r.veiculo_label    ?? '',
    prefixo:         r.prefixo          ?? '',
    defeito:         r.defeito          ?? '',
    dataApontamento: r.data_apontamento ?? '',
    prazo:           r.prazo            ?? '',
    resolvido:       Boolean(r.resolvido),
    dataResolvido:   r.data_resolvido   ?? null,
    horaResolvido:   r.hora_resolvido   ?? null,
    reparoValor:     r.reparo_valor     != null ? Number(r.reparo_valor) : null,
    reparoDescricao: r.reparo_descricao ?? null,
    reparoImagens:   Array.isArray(r.reparo_imagens) ? r.reparo_imagens : [],
    osArquivo:       r.os_arquivo       ?? null,
    processo:        r.processo         ?? '',
    base:            r.base             ?? '',
    coordenador:     r.coordenador      ?? '',
    responsavel:     r.responsavel      ?? '',
    checklistId:     r.checklist_id     ?? undefined,
    ncItemId:        r.nc_item_id       ?? undefined,
    ncFotos:         Array.isArray(r.nc_fotos) && r.nc_fotos.length > 0 ? r.nc_fotos : undefined,
  }
}

function toInsert(a: Apontamento): Record<string, unknown> {
  return {
    id:               a.id,
    veiculo_id:       a.veiculoId,
    veiculo_label:    a.veiculoLabel,
    prefixo:          a.prefixo,
    defeito:          a.defeito,
    data_apontamento: a.dataApontamento,
    prazo:            a.prazo,
    resolvido:        a.resolvido,
    data_resolvido:   a.dataResolvido,
    hora_resolvido:   a.horaResolvido,
    reparo_valor:     a.reparoValor,
    reparo_descricao: a.reparoDescricao,
    reparo_imagens:   a.reparoImagens,
    os_arquivo:       a.osArquivo,
    processo:         a.processo,
    base:             a.base,
    coordenador:      a.coordenador,
    responsavel:      a.responsavel,
    checklist_id:     a.checklistId ?? null,
    nc_item_id:       a.ncItemId    ?? null,
    nc_fotos:         a.ncFotos     ?? [],
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

function sortByApontamento(a: Apontamento, b: Apontamento) {
  return new Date(a.dataApontamento).getTime() - new Date(b.dataApontamento).getTime()
}

// ---------------------------------------------------------------------------
// Contexto
// ---------------------------------------------------------------------------
type Ctx = {
  rows: Apontamento[]
  carregando: boolean
  marcarResolvido: (
    id: string,
    payload?: { valor: number | null; descricao: string | null; imagens: string[]; osArquivo?: string | null },
  ) => Promise<void>
  addApontamento: (novo: NovoApontamento) => Promise<string>
  hasByChecklist: (checklistId: string, ncItemId: string) => boolean
  persistError: string | null
  clearPersistError: () => void
  recarregar: () => Promise<void>
}

const ApontamentosContext = createContext<Ctx | null>(null)

export function ApontamentosProvider({ children }: { children: ReactNode }) {
  const [rows, setRows]               = useState<Apontamento[]>([])
  const [carregando, setCarregando]   = useState(true)
  const [persistError, setPersistError] = useState<string | null>(null)
  const clearPersistError = useCallback(() => setPersistError(null), [])
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const recarregar = useCallback(async () => {
    setCarregando(true)
    // Limpa dados legados do localStorage na primeira carga
    localStorage.removeItem('frota-apontamentos-v1')

    const { data, error } = await supabase
      .from('apontamentos')
      .select('*')
      .order('data_apontamento', { ascending: true })

    if (error) {
      setPersistError('Erro ao carregar apontamentos: ' + error.message)
      setRows([])
    } else {
      setRows(((data ?? []) as unknown[]).map(fromRow))
      setPersistError(null)
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    void recarregar()

    const ch = supabase
      .channel('apontamentos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apontamentos' }, () => {
        void recarregar()
      })
      .subscribe()

    channelRef.current = ch
    return () => { void supabase.removeChannel(ch) }
  }, [recarregar])

  const addApontamento = useCallback(async (novo: NovoApontamento): Promise<string> => {
    const id = `cl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const apontamento: Apontamento = {
      ...novo,
      id,
      resolvido: false,
      dataResolvido: null,
      horaResolvido: null,
      reparoValor: null,
      reparoDescricao: null,
      reparoImagens: [],
      osArquivo: null,
    }

    setRows((prev) => [...prev, apontamento].sort(sortByApontamento))

    const { error } = await supabase
      .from('apontamentos')
      .insert(toInsert(apontamento))

    if (error) {
      setRows((prev) => prev.filter((r) => r.id !== id))
      setPersistError('Erro ao salvar apontamento: ' + error.message)
    }

    return id
  }, [])

  const marcarResolvido = useCallback(async (
    id: string,
    payload?: { valor: number | null; descricao: string | null; imagens: string[]; osArquivo?: string | null },
  ) => {
    const now = new Date()
    const hoje = localIsoDate(now)
    const hora = localTimeHHmm(now)

    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              resolvido: true,
              dataResolvido: hoje,
              horaResolvido: hora,
              reparoValor: payload?.valor ?? r.reparoValor ?? null,
              reparoDescricao: typeof payload?.descricao === 'string' ? payload.descricao : r.reparoDescricao ?? null,
              reparoImagens: payload?.imagens?.slice(0, 3) ?? r.reparoImagens ?? [],
              osArquivo: payload?.osArquivo !== undefined ? payload.osArquivo : r.osArquivo ?? null,
            }
          : r,
      ),
    )

    const { error } = await supabase
      .from('apontamentos')
      .update({
        resolvido:        true,
        data_resolvido:   hoje,
        hora_resolvido:   hora,
        reparo_valor:     payload?.valor ?? null,
        reparo_descricao: payload?.descricao ?? null,
        reparo_imagens:   payload?.imagens?.slice(0, 3) ?? [],
        os_arquivo:       payload?.osArquivo ?? null,
      })
      .eq('id', id)

    if (error) {
      setPersistError('Erro ao atualizar apontamento: ' + error.message)
      void recarregar()
    }
  }, [recarregar])

  const hasByChecklist = useCallback((checklistId: string, ncItemId: string): boolean => {
    return rows.some((r) => r.checklistId === checklistId && r.ncItemId === ncItemId)
  }, [rows])

  const value = useMemo(
    () => ({ rows, carregando, marcarResolvido, addApontamento, hasByChecklist, persistError, clearPersistError, recarregar }),
    [rows, carregando, marcarResolvido, addApontamento, hasByChecklist, persistError, clearPersistError, recarregar],
  )

  return <ApontamentosContext.Provider value={value}>{children}</ApontamentosContext.Provider>
}

export function useApontamentos() {
  const ctx = useContext(ApontamentosContext)
  if (!ctx) throw new Error('useApontamentos deve ser usado dentro de ApontamentosProvider')
  return ctx
}
