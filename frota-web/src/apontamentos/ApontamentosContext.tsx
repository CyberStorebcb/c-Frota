import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { loadApontamentosFromStorage, saveApontamentosToStorage } from './apontamentosPersist'

export type Apontamento = {
  id: string
  veiculoId: string
  veiculoLabel: string
  /** Prefixo numérico do veículo (filtro) */
  prefixo: string
  defeito: string
  dataApontamento: string
  prazo: string
  resolvido: boolean
  /** ISO yyyy-mm-dd — preenchida ao marcar como resolvido */
  dataResolvido: string | null
  /** Horário local (HH:mm) — preenchido ao marcar como resolvido */
  horaResolvido: string | null
  /** Valor gasto no reparo (R$) */
  reparoValor: number | null
  /** Descrição do serviço executado (opcional) */
  reparoDescricao: string | null
  /** Imagens anexadas (data URLs) */
  reparoImagens: string[]
  /** Arquivo da OS anexado (data URL — PDF ou imagem) */
  osArquivo: string | null
  processo: string
  base: string
  coordenador: string
  responsavel: string
  /** ID do checklist de origem (quando gerado automaticamente de NC) */
  checklistId?: string
  /** Fotos da não conformidade do checklist de origem */
  ncFotos?: string[]
  /** ID do item NC no schema do checklist */
  ncItemId?: string
}

const SEED: Apontamento[] = [
  {
    id: '1',
    veiculoId: 'v-0101',
    veiculoLabel: '0101 · ABC-1D23',
    prefixo: '0101',
    defeito: 'Luz de freio acesa no painel',
    dataApontamento: '2026-01-08',
    prazo: '2026-01-20',
    resolvido: false,
    dataResolvido: null,
    horaResolvido: null,
    reparoValor: null,
    reparoDescricao: null,
    reparoImagens: [],
    osArquivo: null,
    processo: 'Checklist',
    base: 'Base 01',
    coordenador: 'Carlos Mendes',
    responsavel: 'João Silva',
  },
  {
    id: '2',
    veiculoId: 'v-0201',
    veiculoLabel: '0201 · GHI-7J89',
    prefixo: '0201',
    defeito: 'Pneu traseiro direito com desgaste irregular',
    dataApontamento: '2026-02-14',
    prazo: '2026-02-28',
    resolvido: false,
    dataResolvido: null,
    horaResolvido: null,
    reparoValor: null,
    reparoDescricao: null,
    reparoImagens: [],
    osArquivo: null,
    processo: 'Corretiva',
    base: 'Base 02',
    coordenador: 'Ana Costa',
    responsavel: 'Maria Souza',
  },
  {
    id: '3',
    veiculoId: 'v-0101',
    veiculoLabel: '0101 · ABC-1D23',
    prefixo: '0101',
    defeito: 'Ar condicionado sem refrigeração',
    dataApontamento: '2026-03-02',
    prazo: '2026-03-15',
    resolvido: true,
    dataResolvido: '2026-03-12',
    horaResolvido: '14:20',
    reparoValor: 350,
    reparoDescricao: null,
    reparoImagens: [],
    osArquivo: null,
    processo: 'Checklist',
    base: 'Base 01',
    coordenador: 'Carlos Mendes',
    responsavel: 'João Silva',
  },
  {
    id: '4',
    veiculoId: 'v-0302',
    veiculoLabel: '0302 · QRS-6T78',
    prefixo: '0302',
    defeito: 'Documentação CRLV vencendo em 30 dias',
    dataApontamento: '2026-03-18',
    prazo: '2026-04-01',
    resolvido: false,
    dataResolvido: null,
    horaResolvido: null,
    reparoValor: null,
    reparoDescricao: null,
    reparoImagens: [],
    osArquivo: null,
    processo: 'Checklist',
    base: 'Base 03',
    coordenador: 'Ana Costa',
    responsavel: 'Pedro Lima',
  },
  {
    id: '5',
    veiculoId: 'v-0102',
    veiculoLabel: '0102 · DEF-4G56',
    prefixo: '0102',
    defeito: 'Ruído na suspensão dianteira',
    dataApontamento: '2026-04-01',
    prazo: '2026-04-10',
    resolvido: false,
    dataResolvido: null,
    horaResolvido: null,
    reparoValor: null,
    reparoDescricao: null,
    reparoImagens: [],
    osArquivo: null,
    processo: 'Corretiva',
    base: 'Base 01',
    coordenador: 'Carlos Mendes',
    responsavel: 'Maria Souza',
  },
  {
    id: '6',
    veiculoId: 'v-0202',
    veiculoLabel: '0202 · JKL-0M12',
    prefixo: '0202',
    defeito: 'Retrovisor lateral com trinca',
    dataApontamento: '2026-04-22',
    prazo: '2026-05-05',
    resolvido: false,
    dataResolvido: null,
    horaResolvido: null,
    reparoValor: null,
    reparoDescricao: null,
    reparoImagens: [],
    osArquivo: null,
    processo: 'Checklist',
    base: 'Base 02',
    coordenador: 'Ana Costa',
    responsavel: 'Pedro Lima',
  },
  {
    id: '7',
    veiculoId: 'v-0201',
    veiculoLabel: '0201 · GHI-7J89',
    prefixo: '0201',
    defeito: 'Vidro lateral com risco',
    dataApontamento: '2026-01-05',
    prazo: '2026-01-22',
    resolvido: true,
    dataResolvido: '2026-01-17',
    horaResolvido: '09:10',
    reparoValor: 120,
    reparoDescricao: null,
    reparoImagens: [],
    osArquivo: null,
    processo: 'Corretiva',
    base: 'Base 02',
    coordenador: 'Ana Costa',
    responsavel: 'Maria Souza',
  },
  {
    id: '8',
    veiculoId: 'v-0302',
    veiculoLabel: '0302 · QRS-6T78',
    prefixo: '0302',
    defeito: 'Estepe sem calibragem',
    dataApontamento: '2026-02-02',
    prazo: '2026-02-12',
    resolvido: true,
    dataResolvido: '2026-02-10',
    horaResolvido: '16:05',
    reparoValor: 60,
    reparoDescricao: null,
    reparoImagens: [],
    osArquivo: null,
    processo: 'Checklist',
    base: 'Base 03',
    coordenador: 'Ana Costa',
    responsavel: 'Pedro Lima',
  },
  {
    id: '9',
    veiculoId: 'v-0102',
    veiculoLabel: '0102 · DEF-4G56',
    prefixo: '0102',
    defeito: 'Farol baixo com umidade',
    dataApontamento: '2026-04-05',
    prazo: '2026-04-18',
    resolvido: true,
    dataResolvido: '2026-04-11',
    horaResolvido: '11:42',
    reparoValor: 220,
    reparoDescricao: null,
    reparoImagens: [],
    osArquivo: null,
    processo: 'Corretiva',
    base: 'Base 01',
    coordenador: 'Carlos Mendes',
    responsavel: 'João Silva',
  },
]

const SEED_BY_ID = new Map(SEED.map((r) => [r.id, r]))

function sortByApontamento(a: Apontamento, b: Apontamento) {
  return new Date(a.dataApontamento).getTime() - new Date(b.dataApontamento).getTime()
}

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

function initialRows(): Apontamento[] {
  const loaded = loadApontamentosFromStorage(SEED_BY_ID)
  if (loaded?.length) return loaded
  return [...SEED].sort(sortByApontamento)
}

export type NovoApontamento = Omit<Apontamento, 'id' | 'resolvido' | 'dataResolvido' | 'horaResolvido' | 'reparoValor' | 'reparoDescricao' | 'reparoImagens' | 'osArquivo'>

type Ctx = {
  rows: Apontamento[]
  marcarResolvido: (
    id: string,
    payload?: { valor: number | null; descricao: string | null; imagens: string[]; osArquivo?: string | null },
  ) => void
  addApontamento: (novo: NovoApontamento) => string
  hasByChecklist: (checklistId: string, ncItemId: string) => boolean
  persistError: string | null
  clearPersistError: () => void
}

const ApontamentosContext = createContext<Ctx | null>(null)

export function ApontamentosProvider({ children }: { children: ReactNode }) {
  const [rows, setRows] = useState<Apontamento[]>(initialRows)
  const [persistError, setPersistError] = useState<string | null>(null)

  useEffect(() => {
    const res = saveApontamentosToStorage(rows)
    setPersistError(res.ok === false ? res.message : null)
  }, [rows])

  const clearPersistError = useCallback(() => setPersistError(null), [])

  const addApontamento = useCallback((novo: NovoApontamento): string => {
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
    return id
  }, [])

  const hasByChecklist = useCallback((checklistId: string, ncItemId: string): boolean => {
    return rows.some((r) => r.checklistId === checklistId && r.ncItemId === ncItemId)
  }, [rows])

  const marcarResolvido = useCallback(
    (id: string, payload?: { valor: number | null; descricao: string | null; imagens: string[]; osArquivo?: string | null }) => {
    // Importante: usar data local (Brasília etc), não UTC do toISOString().
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
              reparoDescricao:
                typeof payload?.descricao === 'string' ? payload.descricao : r.reparoDescricao ?? null,
              reparoImagens: payload?.imagens?.slice(0, 3) ?? r.reparoImagens ?? [],
              osArquivo: payload?.osArquivo !== undefined ? payload.osArquivo : r.osArquivo ?? null,
            }
          : r,
      ),
    )
    },
    [],
  )

  const value = useMemo(
    () => ({ rows, marcarResolvido, addApontamento, hasByChecklist, persistError, clearPersistError }),
    [rows, marcarResolvido, addApontamento, hasByChecklist, persistError, clearPersistError],
  )

  return <ApontamentosContext.Provider value={value}>{children}</ApontamentosContext.Provider>
}

export function useApontamentos() {
  const ctx = useContext(ApontamentosContext)
  if (!ctx) {
    throw new Error('useApontamentos deve ser usado dentro de ApontamentosProvider')
  }
  return ctx
}
