import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  Ban,
  Bike,
  BrainCircuit,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Sparkles,
  Tag,
  Truck,
  User,
  Wrench,
  X,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { askGemini, isGeminiConfigured } from '../services/aiService'
import {
  addFleetVehicle,
  FLEET_MANUTENCAO_BY_PLACA_STORAGE_KEY,
  FLEET_STATUS_BY_PLACA_STORAGE_KEY,
  formatPlaca,
  getDisplayedFleetVehicles,
  isEmbeddedCatalogFleetVehicleId,
  normalizePlaca,
  removeFleetVehicle,
  setFleetVehicleManutencao,
  setFleetVehicleStatus,
  VEHICLE_TYPE_IDS,
  type FleetVehicle,
  type VehicleStatus,
  type VehicleTipo,
} from '../frota/vehicleRegistry'
import { isOperacionalAtivosDashboardKpi } from '../frota/vehicleOperationalStatus'
import { renderFormattedText } from '../utils/renderFormattedAiText'

const TYPE_FILTER_IDLE =
  'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'

const VEHICLE_TYPES: {
  id: VehicleTipo
  label: string
  icon: typeof Truck
  color: string
  pillActive: string
}[] = [
  {
    id: 'MUNCK',
    label: 'Munck',
    icon: Truck,
    color: 'text-blue-500',
    pillActive:
      'bg-blue-100 text-blue-900 ring-2 ring-blue-500/30 dark:bg-blue-950/60 dark:text-blue-200 dark:ring-blue-400/40',
  },
  {
    id: 'SKY',
    label: 'Sky',
    icon: Wrench,
    color: 'text-purple-500',
    pillActive:
      'bg-purple-100 text-purple-900 ring-2 ring-purple-500/30 dark:bg-purple-950/60 dark:text-purple-200 dark:ring-purple-400/40',
  },
  {
    id: 'MOTO',
    label: 'Moto',
    icon: Bike,
    color: 'text-orange-500',
    pillActive:
      'bg-orange-100 text-orange-900 ring-2 ring-orange-500/30 dark:bg-orange-950/60 dark:text-orange-200 dark:ring-orange-400/40',
  },
  {
    id: 'PICAPE 4X4',
    label: 'Picape 4x4',
    icon: Truck,
    color: 'text-emerald-500',
    pillActive:
      'bg-teal-100 text-teal-900 ring-2 ring-teal-500/30 dark:bg-teal-950/60 dark:text-teal-200 dark:ring-teal-400/40',
  },
  {
    id: 'PICAPE LEVE',
    label: 'Picape leve',
    icon: Truck,
    color: 'text-slate-500',
    pillActive:
      'bg-slate-200 text-slate-900 ring-2 ring-slate-400/40 dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-500/40',
  },
  {
    id: 'VEICULOS LEVES',
    label: 'Veículo leve',
    icon: Car,
    color: 'text-indigo-500',
    pillActive:
      'bg-indigo-100 text-indigo-900 ring-2 ring-indigo-500/30 dark:bg-indigo-950/60 dark:text-indigo-200 dark:ring-indigo-400/40',
  },
  {
    id: 'CARRETA',
    label: 'Carreta',
    icon: Truck,
    color: 'text-cyan-500',
    pillActive:
      'bg-cyan-100 text-cyan-900 ring-2 ring-cyan-500/30 dark:bg-cyan-950/60 dark:text-cyan-200 dark:ring-cyan-400/40',
  },
  {
    id: 'CAMINHÃO',
    label: 'Caminhão',
    icon: Truck,
    color: 'text-blue-600',
    pillActive:
      'bg-blue-100 text-blue-900 ring-2 ring-blue-500/30 dark:bg-blue-950/60 dark:text-blue-200 dark:ring-blue-400/40',
  },
  {
    id: 'OFICINA',
    label: 'Oficina',
    icon: Wrench,
    color: 'text-rose-500',
    pillActive:
      'bg-rose-100 text-rose-900 ring-2 ring-rose-500/30 dark:bg-rose-950/60 dark:text-rose-200 dark:ring-rose-400/40',
  },
  {
    id: 'MOTOPODA',
    label: 'Motopoda',
    icon: Wrench,
    color: 'text-lime-600',
    pillActive:
      'bg-lime-100 text-lime-900 ring-2 ring-lime-500/30 dark:bg-lime-950/60 dark:text-lime-200 dark:ring-lime-400/40',
  },
]

/** Chips principais na barra; Oficina e Motopoda entram no menu "Mais". */
const VEHICLE_TYPES_TOOLBAR_MAIN = VEHICLE_TYPES.filter((t) => t.id !== 'OFICINA' && t.id !== 'MOTOPODA')
const VEHICLE_TYPES_TOOLBAR_MORE = VEHICLE_TYPES.filter((t) => t.id === 'OFICINA' || t.id === 'MOTOPODA')

const LAYOUT_STORAGE_KEY = 'frota.vehicles.registroLayout'

/** Fecha `{` correspondente (assume strings JSON com aspas `"`). */
function findMatchingBraceEnd(src: string, startIdx: number): number {
  let depth = 0
  let inStr = false
  let escape = false
  for (let i = startIdx; i < src.length; i++) {
    const ch = src[i]!
    if (escape) {
      escape = false
      continue
    }
    if (inStr) {
      if (ch === '\\') escape = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') {
      inStr = true
      continue
    }
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

/**
 * Remove ecos do resumo JSON e fenced code que o modelo às vezes cola na análise
 * (melhora legibilidade no painel).
 */
function sanitizeAiFleetSuggestionText(raw: string): string {
  const trimmed = raw.replace(/\r\n/g, '\n').trim()
  if (!trimmed) return trimmed
  if (/^Erro\b/i.test(trimmed) || /^Desculpe\b/i.test(trimmed)) return trimmed

  let s = trimmed.replace(/```(?:json)?\s*[\s\S]*?```/gi, '\n')
  s = s.replace(/\n{3,}/g, '\n\n').trim()

  const reSummary = /\{\s*"totalFrota"\s*:/
  let idx = s.search(reSummary)
  while (idx !== -1) {
    const end = findMatchingBraceEnd(s, idx)
    if (end === -1) break
    s = (s.slice(0, idx) + s.slice(end + 1)).replace(/^\s*\n/, '').trim()
    idx = s.search(reSummary)
  }

  return s.trim()
}

function readInitialLayout(): 'grid' | 'list' {
  try {
    return localStorage.getItem(LAYOUT_STORAGE_KEY) === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

function VehicleOverflowMenu({
  vehicle,
  menuForId,
  setMenuForId,
  refresh,
  showNotification,
  placement = 'up',
  isAdmin = false,
}: {
  vehicle: FleetVehicle
  menuForId: string | null
  setMenuForId: (id: string | null) => void
  refresh: () => void
  showNotification: (message: string, type: 'success' | 'error') => void
  placement?: 'up' | 'down'
  isAdmin?: boolean
}) {
  const menuOpen = menuForId === vehicle.id
  const menuPosition =
    placement === 'up'
      ? 'absolute bottom-10 right-0 z-20 min-w-[160px]'
      : 'absolute right-0 top-full z-30 mt-1 min-w-[160px]'

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          setMenuForId(menuOpen ? null : vehicle.id)
        }}
        className="flex size-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label="Mais opções"
      >
        <MoreHorizontal size={18} />
      </button>
      {menuOpen ? (
        <div
          className={`${menuPosition} overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-950`}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          role="menu"
        >
          {isAdmin && vehicle.status !== 'ATIVO' && (
            <button
              type="button"
              role="menuitem"
              className="w-full px-4 py-2 text-left text-xs font-black uppercase tracking-wide text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
              onClick={() => {
                setFleetVehicleStatus(vehicle.placa, 'ATIVO')
                refresh(); setMenuForId(null)
                showNotification('Estado: ativo.', 'success')
              }}
            >
              Marcar ativo
            </button>
          )}
          {isAdmin && vehicle.status !== 'INATIVO' && (
            <button
              type="button"
              role="menuitem"
              className="w-full px-4 py-2 text-left text-xs font-black uppercase tracking-wide text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
              onClick={() => {
                setFleetVehicleStatus(vehicle.placa, 'INATIVO')
                refresh(); setMenuForId(null)
                showNotification('Veículo marcado como inativo.', 'success')
              }}
            >
              Marcar inativo
            </button>
          )}
          {isAdmin && !vehicle.emManutencao && (
            <button
              type="button"
              role="menuitem"
              className="w-full px-4 py-2 text-left text-xs font-black uppercase tracking-wide text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
              onClick={() => {
                setFleetVehicleManutencao(vehicle.placa, true)
                refresh(); setMenuForId(null)
                showNotification('Veículo marcado como em manutenção.', 'success')
              }}
            >
              Marcar em manutenção
            </button>
          )}
          {isAdmin && vehicle.emManutencao && (
            <button
              type="button"
              role="menuitem"
              className="w-full px-4 py-2 text-left text-xs font-black uppercase tracking-wide text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
              onClick={() => {
                setFleetVehicleManutencao(vehicle.placa, false)
                refresh(); setMenuForId(null)
                showNotification('Manutenção removida.', 'success')
              }}
            >
              Remover da manutenção
            </button>
          )}
          {isAdmin && !isEmbeddedCatalogFleetVehicleId(vehicle.id) ? (
            <button
              type="button"
              role="menuitem"
              className="w-full px-4 py-2 text-left text-xs font-black uppercase tracking-wide text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
              onClick={() => {
                removeFleetVehicle(vehicle.id)
                refresh(); setMenuForId(null)
                showNotification('Veículo removido.', 'success')
              }}
            >
              Remover
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function defaultForm() {
  const y = new Date().getFullYear().toString()
  return {
    placa: '',
    modelo: '',
    tipo: 'VEICULOS LEVES' as VehicleTipo,
    prefixo: '',
    responsavel: '',
    supervisor: '',
    coordenador: '',
    base: '',
    ano: y,
  }
}

/**
 * Controlo da frota: cadastro e listagem de veículos (UI alinhada ao painel operacional).
 */
export function RegistroVeiculosPage() {
  const [vehicles, setVehicles] = useState<FleetVehicle[]>(() => getDisplayedFleetVehicles())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'ALL' | VehicleTipo>('ALL')
  const [moreTypeMenuOpen, setMoreTypeMenuOpen] = useState(false)
  const moreTypeMenuRef = useRef<HTMLDivElement>(null)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [formData, setFormData] = useState(defaultForm)
  const [menuForId, setMenuForId] = useState<string | null>(null)
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>(readInitialLayout)
  /** Filtros por coluna (só aplicados na vista em lista). */
  const [colFilterPlaca, setColFilterPlaca] = useState('')
  const [colFilterModeloPrefixo, setColFilterModeloPrefixo] = useState('')
  const [colFilterOrgResp, setColFilterOrgResp] = useState('')
  const [colFilterLocalBase, setColFilterLocalBase] = useState('')
  const [colFilterStatus, setColFilterStatus] = useState<'ALL' | VehicleStatus | 'MANUTENÇÃO'>('ALL')
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [isChatSending, setIsChatSending] = useState(false)
  const [isChatCollapsed, setIsChatCollapsed] = useState(true)
  const [isChatVisible, setIsChatVisible] = useState(false)
  const [chatHistory, setChatHistory] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([
    {
      role: 'assistant',
      content: 'Olá! Sou o assistente FROTA AI. Como posso ajudar com a frota hoje?',
    },
  ])

  const refresh = () => setVehicles(getDisplayedFleetVehicles())

  const [ncNaoImpeditivos, setNcNaoImpeditivos] = useState<number | null>(null)

  useEffect(() => {
    if (!supabaseConfigured) return
    supabase
      .from('checklists')
      .select('nc_count, nc_imperativos')
      .then(({ data: rows }) => {
        if (!rows) return
        const total = rows.reduce((acc, r) => {
          const naoImp = Math.max(0, (r.nc_count ?? 0) - (r.nc_imperativos ?? 0))
          return acc + naoImp
        }, 0)
        setNcNaoImpeditivos(total)
      })
  }, [])

  const { user } = useAuth()
  const canRegisterVehicle = user?.role === 'admin'

  useEffect(() => {
    if (!menuForId) return
    const close = () => setMenuForId(null)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuForId])

  useEffect(() => {
    if (!moreTypeMenuOpen) return
    const onDoc = (e: MouseEvent) => {
      const el = moreTypeMenuRef.current
      if (el && !el.contains(e.target as Node)) setMoreTypeMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreTypeMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [moreTypeMenuOpen])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'frota.vehicles.registry' || e.key === FLEET_STATUS_BY_PLACA_STORAGE_KEY || e.key === FLEET_MANUTENCAO_BY_PLACA_STORAGE_KEY || e.key === null) {
        setVehicles(getDisplayedFleetVehicles())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (!canRegisterVehicle && isModalOpen) {
      queueMicrotask(() => setIsModalOpen(false))
    }
  }, [canRegisterVehicle, isModalOpen])

  /** Busca + tipo (barra superior); igual em grelha e em lista. */
  const globallyFilteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const placaNorm = normalizePlaca(v.placa)
      const placaDisplay = formatPlaca(v.placa).toLowerCase()
      const modeloStr = String(v.modelo || '').toLowerCase()
      const prefixoStr = String(v.prefixo || '').toLowerCase()
      const baseStr = String(v.base || '').toLowerCase()
      const respStr = String(v.responsavel || '').toLowerCase()
      const searchStr = search.toLowerCase()
      const searchPlaca = normalizePlaca(search)
      const matchesSearch =
        !searchStr ||
        (searchPlaca ? placaNorm.includes(searchPlaca) : false) ||
        placaDisplay.includes(searchStr) ||
        modeloStr.includes(searchStr) ||
        prefixoStr.includes(searchStr) ||
        baseStr.includes(searchStr) ||
        respStr.includes(searchStr)
      const matchesType = filterType === 'ALL' || v.tipo === filterType
      return matchesSearch && matchesType
    })
  }, [vehicles, search, filterType])

  /** Em lista, aplica ainda os filtros por coluna; na grelha ignora-os. */
  const filteredVehicles = useMemo(() => {
    if (layoutMode !== 'list') return globallyFilteredVehicles

    const fp = normalizePlaca(colFilterPlaca)
    const fm = colFilterModeloPrefixo.trim().toLowerCase()
    const fo = colFilterOrgResp.trim().toLowerCase()
    const fl = colFilterLocalBase.trim().toLowerCase()

    return globallyFilteredVehicles.filter((v) => {
      if (fp && !normalizePlaca(v.placa).includes(fp)) return false
      if (fm) {
        const blob = `${v.modelo} ${v.prefixo}`.toLowerCase()
        if (!blob.includes(fm)) return false
      }
      if (fo && !String(v.responsavel || '').toLowerCase().includes(fo)) return false
      if (fl && !String(v.base || '').toLowerCase().includes(fl)) return false
      if (colFilterStatus === 'MANUTENÇÃO') {
        if (!v.emManutencao) return false
      } else if (colFilterStatus !== 'ALL' && v.status !== colFilterStatus) {
        return false
      }
      return true
    })
  }, [
    globallyFilteredVehicles,
    layoutMode,
    colFilterPlaca,
    colFilterModeloPrefixo,
    colFilterOrgResp,
    colFilterLocalBase,
    colFilterStatus,
  ])

  const clearListColumnFilters = () => {
    setColFilterPlaca('')
    setColFilterModeloPrefixo('')
    setColFilterOrgResp('')
    setColFilterLocalBase('')
    setColFilterStatus('ALL')
  }

  const listColFiltersActive = Boolean(
    colFilterPlaca.trim() ||
      colFilterModeloPrefixo.trim() ||
      colFilterOrgResp.trim() ||
      colFilterLocalBase.trim() ||
      colFilterStatus !== 'ALL',
  )

  /** Totais da frota carregada (`getDisplayedFleetVehicles`). */
  const fleetStats = useMemo(
    () => ({
      total: vehicles.length,
      ativos: vehicles.filter(
        (v) => isOperacionalAtivosDashboardKpi(v.placa, v.prefixo),
      ).length,
      manutencao: vehicles.filter((v) => v.emManutencao).length,
    }),
    [vehicles],
  )

  /** Contagem por tipo (frota completa) para tooltip nos filtros. */
  const countByTipo = useMemo(() => {
    const m = new Map<VehicleTipo, number>()
    for (const id of VEHICLE_TYPE_IDS) m.set(id, 0)
    for (const v of vehicles) {
      m.set(v.tipo, (m.get(v.tipo) ?? 0) + 1)
    }
    return m
  }, [vehicles])

  /**
   * Totais exactos para a IA: o JSON detalhado (`fleetContextJson`) é truncado (~45k chars)
   * e pode omitir veículos; contagens devem usar sempre este bloco.
   */
  const fleetAiSummaryJson = useMemo(() => {
    const porTipo = {} as Record<VehicleTipo, number>
    for (const id of VEHICLE_TYPE_IDS) {
      porTipo[id] = countByTipo.get(id) ?? 0
    }
    return JSON.stringify({
      totalFrota: vehicles.length,
      porTipo,
      porStatus: {
        ativo: fleetStats.ativos,
        inativo: vehicles.filter((v) => v.status === 'INATIVO').length,
        emManutencao: fleetStats.manutencao,
      },
    })
  }, [vehicles, countByTipo, fleetStats])

  /** JSON compacto da frota para prompts (limite de tamanho para a API). */
  const fleetContextJson = useMemo(() => {
    const compact = vehicles.map((v) => ({
      placa: v.placa,
      modelo: v.modelo,
      tipo: v.tipo,
      status: v.status,
      prefixo: v.prefixo,
      base: v.base,
      responsavel: v.responsavel,
      ano: v.ano,
      source: v.source,
    }))
    const maxLen = 45_000
    let n = compact.length
    while (n > 0) {
      const s = JSON.stringify(compact.slice(0, n))
      if (s.length <= maxLen) return s
      n = Math.max(1, Math.floor(n * 0.85))
    }
    return '[]'
  }, [vehicles])

  const aiSuggestionSanitized = useMemo(() => {
    if (!aiAnalysis) return ''
    return sanitizeAiFleetSuggestionText(aiAnalysis)
  }, [aiAnalysis])

  const geminiConfigured = isGeminiConfigured()

  const inputFilterClass =
    'w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-[11px] font-bold text-slate-900 outline-none placeholder:font-semibold placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500'
  const selectFilterClass =
    'w-full min-w-0 rounded-lg border border-slate-200 bg-white px-1.5 py-1.5 text-[10px] font-black uppercase tracking-tight text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white'
  const selectFilterCenterClass = `${selectFilterClass} text-center`

  const handleOpenModal = () => {
    if (!canRegisterVehicle) return
    setIsModalOpen(true)
  }
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setFormData(defaultForm())
  }

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    window.setTimeout(() => setNotification(null), 3000)
  }

  const handleFleetAiAnalysis = async () => {
    if (!geminiConfigured) {
      showNotification('Configure VITE_GEMINI_API_KEY no .env para usar a análise IA.', 'error')
      return
    }
    setIsAiLoading(true)
    try {
      const prompt = `Resumo factual (fonte de verdade para totais e contagens por tipo; não contradigas estes números): ${fleetAiSummaryJson}\n\nAmostra detalhada da frota em JSON (pode estar truncada, só para contexto qualitativo): ${fleetContextJson}\n\nTarefa: analisa a frota GOMAN e apresenta **3 sugestões estratégicas** curtas e acionáveis.\n\nFormato (obrigatório):\n- Usa parágrafos curtos e listas com linhas começadas por "* " para cada ponto principal.\n- Não incluas JSON nem blocos de código (código entre três crases). Não repitas o resumo factual; se citares números, integra-os na frase.`

      const result = await askGemini(
        prompt,
        'És um analista de dados de logística. Para totais ou contagens, usa apenas totalFrota, porTipo e porStatus do resumo factual no início do prompt. Nunca incluas JSON, fences de código markdown nem dados em bruto na resposta ao utilizador — só texto útil. Português de Portugal, conciso e profissional.',
      )
      setAiAnalysis(result.ok ? result.text : 'Erro ao conectar com o serviço de inteligência. Tente novamente.')
    } catch {
      setAiAnalysis('Erro ao conectar com o serviço de inteligência. Tente novamente.')
      showNotification('Falha na análise IA.', 'error')
    } finally {
      setIsAiLoading(false)
    }
  }

  const handleChatSend = async () => {
    const trimmed = chatMessage.trim()
    if (!trimmed || isChatSending) return
    if (!geminiConfigured) {
      showNotification('Configure VITE_GEMINI_API_KEY no .env para usar o assistente.', 'error')
      return
    }
    setChatMessage('')
    setChatHistory((prev) => [...prev, { role: 'user', content: trimmed }])
    setIsChatSending(true)
    try {
      const prompt = `Resumo factual (fonte de verdade para totais e contagens; o JSON seguinte pode estar truncado): ${fleetAiSummaryJson}\n\nDetalhe parcial da frota (JSON): ${fleetContextJson}\n\nPergunta do utilizador: ${trimmed}`
      const response = await askGemini(
        prompt,
        'És o assistente FROTA AI. Responde de forma útil e educada em Português de Portugal. Para totais ou contagens por tipo ou estado, baseia-te exclusivamente em totalFrota, porTipo e porStatus do resumo factual; não contes veículos só pelo array detalhado.',
      )
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', content: response.ok ? response.text : 'Desculpe, tive um problema técnico. Pode repetir?' },
      ])
    } catch {
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', content: 'Desculpe, tive um problema técnico. Pode repetir?' },
      ])
    } finally {
      setIsChatSending(false)
    }
  }

  const setLayout = (mode: 'grid' | 'list') => {
    setLayoutMode(mode)
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, mode)
    } catch {
      /* ignore */
    }
  }

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    if (!canRegisterVehicle) return
    if (!formData.placa.trim() || !formData.modelo.trim()) {
      showNotification('Por favor, preencha placa e modelo.', 'error')
      return
    }
    const tipo = VEHICLE_TYPE_IDS.includes(formData.tipo as VehicleTipo) ? formData.tipo : 'VEICULOS LEVES'
    const res = addFleetVehicle({
      placa: formData.placa,
      modelo: formData.modelo,
      tipo,
      prefixo: formData.prefixo,
      responsavel: formData.responsavel,
      supervisor: formData.supervisor,
      coordenador: formData.coordenador,
      base: formData.base,
      ano: formData.ano,
    })
    if (res.ok === false) {
      showNotification(res.message, 'error')
      return
    }
    refresh()
    showNotification('Veículo cadastrado com sucesso!', 'success')
    handleCloseModal()
  }

  return (
    <div className="min-h-screen w-full min-w-0 bg-slate-50 pb-32 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100 -mx-3 px-3 sm:-mx-4 sm:px-4 lg:-mx-8 lg:px-4 xl:px-6">
      {notification ? (
        <div
          className={`fixed top-6 right-6 z-[100] flex translate-x-0 items-center gap-3 rounded-2xl px-6 py-4 shadow-2xl transition-opacity duration-300 ${
            notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
          }`}
          role="status"
        >
          {notification.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-bold">{notification.message}</span>
        </div>
      ) : null}

      <div className="w-full max-w-none space-y-8 pt-3 sm:pt-4 lg:pt-5">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">
              Frota <span className="text-blue-600">GOMAN</span>
            </h1>
            <p className="font-medium italic text-slate-500 dark:text-slate-400">Gestão centralizada de ativos e logística</p>
          </div>

          <div className="flex flex-wrap gap-3 self-start md:self-center">
            <button
              type="button"
              onClick={() => {
                void handleFleetAiAnalysis()
                setIsChatVisible(true)
                setIsChatCollapsed(false)
              }}
              disabled={isAiLoading || !geminiConfigured}
              title={
                geminiConfigured
                  ? 'Sugestões estratégicas com base na frota atual'
                  : 'Defina VITE_GEMINI_API_KEY no ficheiro .env'
              }
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-black text-indigo-700 transition-all hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-500/40 dark:bg-indigo-950/50 dark:text-indigo-200 dark:hover:bg-indigo-950/70"
            >
              {isAiLoading ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Sparkles size={20} aria-hidden />}
              Análise IA ✨
            </button>
            {canRegisterVehicle ? (
              <button
                type="button"
                onClick={handleOpenModal}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-95 dark:shadow-blue-900/30"
              >
                <Plus size={20} strokeWidth={3} />
                Novo veículo
              </button>
            ) : null}
          </div>
        </header>

        {aiAnalysis ? (
          <div className="relative overflow-hidden rounded-3xl border border-indigo-200/90 bg-white shadow-xl dark:border-indigo-500/30 dark:bg-slate-900">
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-700 px-5 py-4 dark:from-indigo-700 dark:to-blue-900">
              <div className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-white/10 blur-2xl" aria-hidden />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 shadow-lg shadow-indigo-950/20">
                    <BrainCircuit size={22} className="text-white" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-100/95">Sugestões</p>
                    <h2 className="mt-0.5 text-lg font-black tracking-tight text-white">Inteligência artificial</h2>
                    <p className="mt-1 max-w-xl text-xs font-semibold leading-snug text-indigo-100/85">
                      Análise com base nos totais da frota e numa amostra dos veículos — sem dados em bruto na resposta.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAiAnalysis(null)}
                  className="shrink-0 rounded-xl p-2 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                  aria-label="Fechar sugestões"
                >
                  <X size={20} strokeWidth={2.25} aria-hidden />
                </button>
              </div>
              <Sparkles className="pointer-events-none absolute -bottom-6 right-2 text-white/[0.12]" size={88} aria-hidden />
            </div>
            <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-5 dark:border-slate-800 dark:bg-slate-950/40">
              {aiSuggestionSanitized ? (
                <div className="max-w-none text-slate-900 dark:text-slate-100">{renderFormattedText(aiSuggestionSanitized)}</div>
              ) : (
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Não foi possível apresentar o texto das sugestões. Gere a análise novamente.
                </p>
              )}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          {(
            [
              {
                label: 'Total na frota',
                value: fleetStats.total,
                Icon: List,
                card:
                  'border-blue-200/90 bg-gradient-to-br from-white via-white to-blue-50/90 shadow-blue-500/[0.06] dark:border-blue-500/25 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/55 dark:shadow-blue-950/30',
                orb: 'bg-blue-400/25 dark:bg-blue-500/15',
                iconWrap:
                  'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-600/25 ring-2 ring-white/30 dark:from-blue-600 dark:to-blue-800 dark:shadow-blue-950/40 dark:ring-blue-400/20',
              },
              {
                label: 'Ativos',
                value: fleetStats.ativos,
                Icon: Check,
                card:
                  'border-emerald-200/90 bg-gradient-to-br from-white via-white to-emerald-50/90 shadow-emerald-500/[0.06] dark:border-emerald-500/25 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/40 dark:shadow-emerald-950/25',
                orb: 'bg-emerald-400/25 dark:bg-emerald-500/12',
                iconWrap:
                  'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/25 ring-2 ring-white/30 dark:from-emerald-600 dark:to-teal-800 dark:shadow-emerald-950/35 dark:ring-emerald-400/20',
              },
              {
                label: 'Precisam de atenção',
                value: ncNaoImpeditivos ?? '—',
                Icon: AlertCircle,
                card:
                  'border-amber-200/90 bg-gradient-to-br from-white via-white to-amber-50/90 shadow-amber-500/[0.06] dark:border-amber-500/25 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/35 dark:shadow-amber-950/25',
                orb: 'bg-amber-400/25 dark:bg-amber-500/12',
                iconWrap:
                  'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-600/25 ring-2 ring-white/30 dark:from-amber-600 dark:to-orange-800 dark:shadow-orange-950/35 dark:ring-amber-400/20',
              },
            ] satisfies { label: string; value: number | string; Icon: typeof List; card: string; orb: string; iconWrap: string }[]
          ).map(({ label, value, Icon, card, orb, iconWrap }) => (
            <div
              key={label}
              className={`group relative overflow-hidden rounded-3xl border p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${card}`}
            >
              <div
                className={`pointer-events-none absolute -left-12 -bottom-12 size-36 rounded-full opacity-40 blur-3xl transition-opacity duration-300 group-hover:opacity-70 ${orb}`}
                aria-hidden
              />
              <div
                className={`pointer-events-none absolute -right-10 -top-10 size-40 rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-90 ${orb}`}
                aria-hidden
              />
              <div className="relative flex w-full min-w-0 items-center gap-4">
                <div
                  className={`flex size-14 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 ${iconWrap}`}
                >
                  <Icon size={26} strokeWidth={2.25} aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5 text-left">
                  <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {label}
                  </span>
                  <p className="text-4xl font-black tabular-nums tracking-tight text-slate-900 dark:text-white">{value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex min-w-0 flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            {/*
              O painel do "Mais" não pode ficar dentro de `overflow-x-auto` (recorte vertical).
              A área rolável não usa flex-1: se cresce, cria um vão grande entre o último chip e "Mais".
              Com `max-w-full shrink` ela só ocupa a largura dos chips até o limite do pai e encolhe se necessário.
            */}
            <div className="flex min-w-0 w-full items-center gap-2 sm:w-0 sm:min-w-0 sm:flex-1">
              <div
                className="no-scrollbar max-w-full min-w-0 shrink overflow-x-auto scroll-smooth"
                role="toolbar"
                aria-label="Filtrar por tipo de veículo"
              >
                <div className="flex w-max items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMoreTypeMenuOpen(false)
                      setFilterType('ALL')
                    }}
                    title={`${vehicles.length} ${vehicles.length === 1 ? 'veículo' : 'veículos'} na frota (todos os tipos)`}
                    className={`inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-xl px-4 text-sm font-bold transition-all ${
                      filterType === 'ALL'
                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                        : `${TYPE_FILTER_IDLE}`
                    }`}
                  >
                    Todos
                  </button>
                  {VEHICLE_TYPES_TOOLBAR_MAIN.map((type) => {
                    const Icon = type.icon
                    const active = filterType === type.id
                    const n = countByTipo.get(type.id) ?? 0
                    const title = `${n} ${n === 1 ? 'veículo' : 'veículos'} — ${type.label}`
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => {
                          setMoreTypeMenuOpen(false)
                          setFilterType(type.id)
                        }}
                        title={title}
                        aria-label={title}
                        className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-bold transition-all ${
                          active ? type.pillActive : TYPE_FILTER_IDLE
                        }`}
                      >
                        <Icon size={14} strokeWidth={2.5} className="shrink-0" aria-hidden />
                        {type.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="relative shrink-0" ref={moreTypeMenuRef}>
                <button
                  type="button"
                  id="filtro-tipo-mais"
                  aria-expanded={moreTypeMenuOpen}
                  aria-haspopup="menu"
                  aria-controls="menu-filtro-tipo-mais"
                  onClick={() => setMoreTypeMenuOpen((o) => !o)}
                  title={
                    filterType === 'OFICINA' || filterType === 'MOTOPODA'
                      ? `${VEHICLE_TYPES.find((t) => t.id === filterType)?.label ?? ''} — ${countByTipo.get(filterType) ?? 0} veículos`
                      : 'Mais tipos de veículo'
                  }
                  className={`inline-flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-4 text-sm font-bold transition-all ${
                    filterType === 'OFICINA' || filterType === 'MOTOPODA'
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                      : moreTypeMenuOpen
                        ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white'
                        : TYPE_FILTER_IDLE
                  }`}
                >
                  <span>Mais</span>
                  <ChevronDown
                    size={15}
                    strokeWidth={2.5}
                    aria-hidden
                    className={`shrink-0 opacity-70 transition-transform duration-200 ${moreTypeMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {moreTypeMenuOpen ? (
                  <div
                    id="menu-filtro-tipo-mais"
                    role="menu"
                    aria-labelledby="filtro-tipo-mais"
                    className="anim-dropdown-in absolute left-0 top-[calc(100%+0.375rem)] z-[100] min-w-[14rem] rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/[0.04] dark:border-slate-600/80 dark:bg-slate-900 dark:shadow-black/40 dark:ring-white/[0.06]"
                  >
                    {VEHICLE_TYPES_TOOLBAR_MORE.map((type) => {
                      const Icon = type.icon
                      const active = filterType === type.id
                      const n = countByTipo.get(type.id) ?? 0
                      const labelCount = `${n} ${n === 1 ? 'veículo' : 'veículos'}`
                      return (
                        <button
                          key={type.id}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setFilterType(type.id)
                            setMoreTypeMenuOpen(false)
                          }}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-bold transition-colors ${
                            active
                              ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                              : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/80'
                          }`}
                        >
                          <Icon size={16} strokeWidth={2.5} aria-hidden className={`shrink-0 ${type.color}`} />
                          <span className="min-w-0 flex-1">{type.label}</span>
                          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-400 dark:text-slate-500">
                            {labelCount}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <div
              className="flex h-10 shrink-0 items-center justify-center gap-0.5 self-center rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800 sm:self-auto"
              role="group"
              aria-label="Modo de exibição"
            >
              <button
                type="button"
                onClick={() => setLayout('list')}
                aria-pressed={layoutMode === 'list'}
                title="Lista"
                className={`inline-flex size-9 items-center justify-center rounded-lg transition-all ${
                  layoutMode === 'list' ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400' : 'text-slate-500'
                }`}
              >
                <List size={18} strokeWidth={2.5} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setLayout('grid')}
                aria-pressed={layoutMode === 'grid'}
                title="Grelha"
                className={`inline-flex size-9 items-center justify-center rounded-lg transition-all ${
                  layoutMode === 'grid' ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400' : 'text-slate-500'
                }`}
              >
                <LayoutGrid size={18} strokeWidth={2.5} aria-hidden />
              </button>
            </div>
          </div>

          <div className="group relative w-full min-w-0">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500"
              aria-hidden
            />
            <input
              type="text"
              placeholder="Pesquisar por placa ou modelo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-3 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white"
            />
          </div>
        </div>

      {filteredVehicles.length > 0 && layoutMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVehicles.map((vehicle) => {
            const typeInfo =
              VEHICLE_TYPES.find((t) => t.id === vehicle.tipo) ??
              VEHICLE_TYPES.find((t) => t.id === 'VEICULOS LEVES')!
            const Icon = typeInfo.icon

            return (
              <div
                key={vehicle.id}
                className={`group relative overflow-hidden rounded-3xl border p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl ${
                  vehicle.emManutencao
                    ? 'border-amber-200 bg-amber-50 hover:border-amber-300 hover:shadow-amber-200/40 dark:border-amber-900/50 dark:bg-amber-950/20 dark:hover:border-amber-800'
                    : vehicle.status === 'INATIVO'
                    ? 'border-slate-300 bg-slate-100 hover:border-slate-400 hover:shadow-slate-200/40 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-slate-600'
                    : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-blue-600/10 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`rounded-2xl bg-slate-50 p-3 dark:bg-slate-800 ${typeInfo.color}`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {vehicle.source === 'total' ? (
                      <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        BASE
                      </span>
                    ) : null}
                    <div
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                        vehicle.status === 'ATIVO'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                          : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {vehicle.status === 'ATIVO' ? <CheckCircle2 size={11} /> : <Ban size={11} />}
                      {vehicle.status}
                    </div>
                    {vehicle.emManutencao && (
                      <div className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        <Wrench size={11} />
                        MANUTENÇÃO
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 space-y-1">
                  <h3 className="text-xl font-black uppercase leading-none tracking-tight text-slate-900 dark:text-white">
                    {formatPlaca(vehicle.placa)}
                  </h3>
                  <p className="text-sm font-bold uppercase text-slate-500 dark:text-slate-400">
                    {vehicle.modelo} • {vehicle.prefixo}
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Responsável</span>
                    <p className="truncate text-xs font-bold uppercase text-slate-700 dark:text-slate-300">{vehicle.responsavel}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Base</span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{vehicle.base}</p>
                  </div>
                  {(vehicle.coordenador && vehicle.coordenador !== 'NÃO ATRIBUÍDO') || (vehicle.supervisor && vehicle.supervisor !== 'NÃO ATRIBUÍDO') ? (
                    <div className="col-span-2 space-y-1 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <div className="flex gap-4">
                        {vehicle.coordenador && vehicle.coordenador !== 'NÃO ATRIBUÍDO' && (
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Coordenador</span>
                            <p className="truncate text-xs font-bold uppercase text-slate-700 dark:text-slate-300">{vehicle.coordenador}</p>
                          </div>
                        )}
                        {vehicle.supervisor && vehicle.supervisor !== 'NÃO ATRIBUÍDO' && (
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Supervisor</span>
                            <p className="truncate text-xs font-bold uppercase text-slate-700 dark:text-slate-300">{vehicle.supervisor}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="absolute bottom-4 right-4">
                  <VehicleOverflowMenu
                    vehicle={vehicle}
                    menuForId={menuForId}
                    setMenuForId={setMenuForId}
                    refresh={refresh}
                    showNotification={showNotification}
                    placement="up"
                    isAdmin={canRegisterVehicle}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {layoutMode === 'list' ? (
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[720px] border-collapse text-center text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Placa</th>
                <th className="px-4 py-3">Modelo / Prefixo</th>
                <th className="hidden px-4 py-3 md:table-cell">Órgão / Resp.</th>
                <th className="hidden px-4 py-3 lg:table-cell">Local / Base</th>
                <th className="hidden px-4 py-3 xl:table-cell">Coord. / Sup.</th>
                <th className="px-4 py-3">Estado</th>
                <th scope="col" className="w-12 px-2 py-3 pr-4 text-right">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-100/90 dark:border-slate-800 dark:bg-slate-900/90">
                <th className="px-2 py-2 align-top">
                  <label className="sr-only" htmlFor="flt-tipo-col">
                    Filtrar por tipo
                  </label>
                  <select
                    id="flt-tipo-col"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as 'ALL' | VehicleTipo)}
                    className={selectFilterCenterClass}
                  >
                    <option value="ALL">Todos</option>
                    {VEHICLE_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="px-2 py-2 align-top">
                  <label className="sr-only" htmlFor="flt-placa-col">
                    Filtrar por placa
                  </label>
                  <input
                    id="flt-placa-col"
                    type="text"
                    value={colFilterPlaca}
                    onChange={(e) => setColFilterPlaca(e.target.value)}
                    placeholder="Placa…"
                    className={inputFilterClass}
                  />
                </th>
                <th className="px-2 py-2 align-top">
                  <label className="sr-only" htmlFor="flt-mod-col">
                    Filtrar modelo ou prefixo
                  </label>
                  <input
                    id="flt-mod-col"
                    type="text"
                    value={colFilterModeloPrefixo}
                    onChange={(e) => setColFilterModeloPrefixo(e.target.value)}
                    placeholder="Modelo / prefixo…"
                    className={inputFilterClass}
                  />
                </th>
                <th className="hidden px-2 py-2 align-top md:table-cell">
                  <label className="sr-only" htmlFor="flt-org-col">
                    Filtrar órgão ou responsável
                  </label>
                  <input
                    id="flt-org-col"
                    type="text"
                    value={colFilterOrgResp}
                    onChange={(e) => setColFilterOrgResp(e.target.value)}
                    placeholder="Órgão / resp.…"
                    className={inputFilterClass}
                  />
                </th>
                <th className="hidden px-2 py-2 align-top lg:table-cell">
                  <label className="sr-only" htmlFor="flt-loc-col">
                    Filtrar local ou base
                  </label>
                  <input
                    id="flt-loc-col"
                    type="text"
                    value={colFilterLocalBase}
                    onChange={(e) => setColFilterLocalBase(e.target.value)}
                    placeholder="Local / base…"
                    className={inputFilterClass}
                  />
                </th>
                <th className="hidden px-2 py-2 align-top xl:table-cell">
                  <span className="sr-only">Filtrar coord./sup.</span>
                </th>
                <th className="px-2 py-2 align-top">
                  <label className="sr-only" htmlFor="flt-status-col">
                    Filtrar por estado
                  </label>
                  <select
                    id="flt-status-col"
                    value={colFilterStatus}
                    onChange={(e) => setColFilterStatus(e.target.value as 'ALL' | VehicleStatus | 'MANUTENÇÃO')}
                    className={selectFilterCenterClass}
                  >
                    <option value="ALL">Todos</option>
                    <option value="ATIVO">Ativo</option>
                    <option value="INATIVO">Inativo</option>
                    <option value="MANUTENÇÃO">Manut.</option>
                  </select>
                </th>
                <th className="px-2 py-2 pr-4 text-right align-top">
                  <button
                    type="button"
                    onClick={clearListColumnFilters}
                    disabled={!listColFiltersActive}
                    title="Limpar filtros desta linha"
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-white hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    <X size={16} strokeWidth={2.5} aria-hidden />
                    <span className="sr-only">Limpar filtros da tabela</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center">
                    <p className="text-base font-bold text-slate-600 dark:text-slate-300">Nenhum veículo com estes critérios.</p>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {globallyFilteredVehicles.length === 0
                        ? 'Ajuste a busca ou o tipo de veículo na barra acima.'
                        : 'Os filtros por coluna estão a excluir todos os resultados. Limpe-os com o botão no fim da linha de filtros.'}
                    </p>
                    {listColFiltersActive ? (
                      <button
                        type="button"
                        onClick={clearListColumnFilters}
                        className="mt-5 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-md hover:bg-blue-700"
                      >
                        Limpar filtros da tabela
                      </button>
                    ) : null}
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((vehicle) => {
                  const typeInfo =
                    VEHICLE_TYPES.find((t) => t.id === vehicle.tipo) ??
                    VEHICLE_TYPES.find((t) => t.id === 'VEICULOS LEVES')!
                  const Icon = typeInfo.icon

                  return (
                    <tr
                      key={vehicle.id}
                      className={`border-b transition-colors ${
                        vehicle.emManutencao
                          ? 'border-amber-200 bg-amber-50/60 hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 dark:hover:bg-amber-950/30'
                          : vehicle.status === 'INATIVO'
                          ? 'border-slate-200 bg-slate-100/60 hover:bg-slate-100 dark:border-slate-800/80 dark:bg-slate-900/40 dark:hover:bg-slate-800/40'
                          : 'border-slate-100 hover:bg-slate-50/80 dark:border-slate-800/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="px-4 py-3 align-middle">
                        <div className="flex justify-center">
                          <div className={`inline-flex rounded-xl bg-slate-100 p-2 dark:bg-slate-800 ${typeInfo.color}`}>
                            <Icon size={20} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="font-mono text-sm font-black uppercase text-slate-900 dark:text-white">{formatPlaca(vehicle.placa)}</span>
                      </td>
                      <td className="max-w-[220px] px-4 py-3 align-middle">
                        <div className="mx-auto max-w-full truncate text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                          {vehicle.modelo} • {vehicle.prefixo}
                        </div>
                      </td>
                      <td className="hidden max-w-[160px] px-4 py-3 align-middle md:table-cell">
                        <span className="mx-auto block max-w-full truncate text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                          {vehicle.responsavel}
                        </span>
                      </td>
                      <td className="hidden max-w-[160px] px-4 py-3 align-middle lg:table-cell">
                        <span className="mx-auto block max-w-full truncate text-xs font-bold text-slate-700 dark:text-slate-300">{vehicle.base}</span>
                      </td>
                      <td className="hidden px-4 py-3 align-middle xl:table-cell">
                        <div className="flex flex-col items-center gap-1 text-center">
                          {vehicle.coordenador && vehicle.coordenador !== 'NÃO ATRIBUÍDO' && (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Coord.</span>
                              <span className="max-w-[160px] truncate text-xs font-bold uppercase text-slate-700 dark:text-slate-300">{vehicle.coordenador}</span>
                            </div>
                          )}
                          {vehicle.supervisor && vehicle.supervisor !== 'NÃO ATRIBUÍDO' && (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Sup.</span>
                              <span className="max-w-[160px] truncate text-xs font-bold uppercase text-slate-700 dark:text-slate-300">{vehicle.supervisor}</span>
                            </div>
                          )}
                          {(!vehicle.coordenador || vehicle.coordenador === 'NÃO ATRIBUÍDO') && (!vehicle.supervisor || vehicle.supervisor === 'NÃO ATRIBUÍDO') && (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          {vehicle.source === 'total' ? (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              BASE
                            </span>
                          ) : null}
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                              vehicle.status === 'ATIVO'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {vehicle.status === 'ATIVO' ? <CheckCircle2 size={10} /> : <Ban size={10} />}
                            {vehicle.status}
                          </span>
                          {vehicle.emManutencao && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                              <Wrench size={10} />
                              MANUT.
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="relative px-2 py-3 pr-4 text-right align-middle">
                        <VehicleOverflowMenu
                          vehicle={vehicle}
                          menuForId={menuForId}
                          setMenuForId={setMenuForId}
                          refresh={refresh}
                          showNotification={showNotification}
                          placement="down"
                          isAdmin={canRegisterVehicle}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {filteredVehicles.length === 0 && layoutMode === 'grid' ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white py-20 text-slate-400 dark:border-slate-600 dark:bg-slate-900/50">
          <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300 dark:bg-slate-800">
            <Search size={40} strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Nenhum veículo encontrado</h3>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Tente ajustar os filtros ou o termo de pesquisa.</p>
        </div>
      ) : null}

      {canRegisterVehicle && isModalOpen ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm dark:bg-black/70"
            onClick={handleCloseModal}
            role="presentation"
          />

          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-[2.5rem] bg-white shadow-2xl dark:bg-slate-900">
            <header className="flex items-center justify-between border-b border-slate-50 p-8 dark:border-slate-800">
              <div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white">Novo registro</h2>
                <p className="mt-0.5 text-sm font-medium text-slate-400">Adicione um novo ativo à frota GOMAN</p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleSave} className="space-y-5 p-8 pt-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Placa</label>
                  <div className="relative">
                    <Tag className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-bold uppercase text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      placeholder="ABC-1234"
                      value={formatPlaca(formData.placa)}
                      onChange={(e) => setFormData({ ...formData, placa: normalizePlaca(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo de Veículo</label>
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 px-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as VehicleTipo })}
                  >
                    {VEHICLE_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Modelo / Marca</label>
                <div className="relative">
                  <Truck className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="Ex: Toyota Hilux"
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Prefixo</label>
                  <input
                    type="text"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-bold uppercase text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="Ex: STI302"
                    value={formData.prefixo}
                    onChange={(e) => setFormData({ ...formData, prefixo: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Ano</label>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      min={1980}
                      max={2100}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      value={formData.ano}
                      onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Responsável</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      placeholder="Nome do condutor"
                      value={formData.responsavel}
                      onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Base</label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-bold uppercase text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      placeholder="PDS / STI"
                      value={formData.base}
                      onChange={(e) => setFormData({ ...formData, base: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Supervisor</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      placeholder="Nome do supervisor"
                      value={formData.supervisor}
                      onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Coordenador</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      placeholder="Nome do coordenador"
                      value={formData.coordenador}
                      onChange={(e) => setFormData({ ...formData, coordenador: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 rounded-2xl border border-slate-200 py-4 text-sm font-black text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                >
                  Descartar
                </button>
                <button
                  type="submit"
                  className="flex-[1.5] rounded-2xl bg-blue-600 py-4 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-95"
                >
                  Salvar veículo
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      </div>

      {isChatVisible && (
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-end p-3 pb-4 md:p-4 md:pb-5">
        <div className="pointer-events-auto flex w-full max-w-[17rem] flex-col sm:max-w-xs md:max-w-sm">
          {isChatCollapsed ? (
            <button
              type="button"
              onClick={() => setIsChatCollapsed(false)}
              className="flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-blue-600 px-3 py-2 text-left text-white shadow-xl transition-colors hover:bg-blue-700 dark:border-slate-700 dark:bg-blue-700 dark:hover:bg-blue-600"
              aria-label="Expandir chat FROTA Assistant"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <div className="shrink-0 rounded-lg bg-white/20 p-1.5">
                  <BrainCircuit size={15} aria-hidden />
                </div>
                <span className="truncate text-xs font-bold tracking-tight">FROTA Assistant ✨</span>
              </div>
              <ChevronUp size={17} className="shrink-0 opacity-90" aria-hidden />
            </button>
          ) : (
            <div className="flex h-[min(26rem,65vh)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <div className="flex shrink-0 items-center justify-between gap-2 bg-blue-600 px-3 py-2.5 text-white dark:bg-blue-700">
                <div className="flex min-w-0 items-center gap-1.5">
                  <div className="shrink-0 rounded-lg bg-white/20 p-1.5">
                    <BrainCircuit size={15} aria-hidden />
                  </div>
                  <span className="truncate text-xs font-bold">FROTA Assistant ✨</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsChatCollapsed(true)}
                    className="shrink-0 rounded-lg p-1.5 text-white/85 transition-colors hover:bg-white/15 hover:text-white"
                    aria-label="Minimizar chat"
                  >
                    <ChevronDown size={17} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsChatVisible(false); setIsChatCollapsed(true) }}
                    className="shrink-0 rounded-lg p-1.5 text-white/85 transition-colors hover:bg-white/15 hover:text-white"
                    aria-label="Fechar assistente"
                  >
                    <X size={15} aria-hidden />
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950/80">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs font-medium ${
                        msg.role === 'user'
                          ? 'rounded-br-none bg-blue-600 text-white'
                          : 'rounded-bl-none border border-slate-100 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                      }`}
                    >
                      {renderFormattedText(msg.content)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex shrink-0 gap-2 border-t border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void handleChatSend()
                    }
                  }}
                  disabled={!geminiConfigured || isChatSending}
                  placeholder={geminiConfigured ? 'Perguntar sobre a frota…' : 'Configure a chave Gemini no .env'}
                  className="min-w-0 flex-1 rounded-xl border-none bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-900 outline-none ring-blue-500 focus:ring-2 disabled:opacity-60 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => void handleChatSend()}
                  disabled={!geminiConfigured || isChatSending || !chatMessage.trim()}
                  className="rounded-xl bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-600"
                  aria-label="Enviar mensagem"
                >
                  {isChatSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}
