import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  type LucideIcon,
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ClipboardX,
  Gauge,
  ImageDown,
  RefreshCw,
  Truck,
  X,
} from 'lucide-react'

import { BASE_FILTER_SELECT_OPTIONS, matchesBaseFilter } from '../data/baseFilterOptions'
import { TOTAL_VEHICLE_ROWS } from '../data/totalVehiclesFleet.gen'
import { normalizePlaca } from '../frota/vehicleRegistry'
import { COORDENADOR_FILTER_SELECT_OPTIONS, matchesCoordenadorFilter } from '../data/coordenadorFilterOptions'
import { SUPERVISOR_FILTER_SELECT_OPTIONS, matchesSupervisorFilter } from '../data/supervisorFilterOptions'
import { RESPONSAVEL_FILTER_SELECT_OPTIONS, matchesResponsavelFilter } from '../data/responsavelFilterOptions'
import { PREFIXO_FILTER_SELECT_OPTIONS } from '../data/prefixoFilterOptions'
import { TIPO_FILTER_SELECT_OPTIONS } from '../data/tipoFilterOptions'
import { Select } from '../components/ui/Select'
import { FilterPanel, FilterPanelGroup, useFilterPanelVisible } from '../components/ui/FilterPanel'
import { useFleet } from '../frota/FleetContext'
import { useTheme } from '../theme/ThemeProvider'
import { useApontamentos } from '../apontamentos/ApontamentosContext'
import { apontamentoGroupKey, buildManageTableRows, type ApontamentoGroup } from '../apontamentos/groupApontamentos'
import {
  listDaysInPeriod,
} from '../checklists/checklistTop10Ranking'
import {
  aggregateChecklistCompletions,
  buildActiveFleetMap,
  filterActiveFleet,
} from '../checklists/checklistFleetScope'
import {
  countUniqueCompletionsInPeriod,
  fetchCompletedChecklistsInPeriod,
  getCachedChecklistCompletions,
} from '../checklists/fetchChecklistCompletions'
import type { DashboardAdesaoChartRow } from './DashboardAdesaoCharts'

const LazyDashboardAdesaoCharts = lazy(() =>
  import('./DashboardAdesaoCharts').then((m) => ({ default: m.DashboardAdesaoCharts })),
)

const PERIODO_OPTIONS = [
  { label: 'Hoje', value: 'hoje' },
  { label: 'Últimos 7 dias', value: '7d' },
  { label: 'Últimos 30 dias', value: '30d' },
  { label: 'Últimos 90 dias', value: '90d' },
  { label: 'Intervalo personalizado', value: 'custom' },
] as const

type DashboardChartLabelMode = 'hoje' | '7d' | '30d'

/** Data local YYYY-MM-DD (alinhado a `data_inspecao` gravada no checklist). */
function hojeLocalIso(): string {
  const d = new Date()
  return dateToLocalIso(d)
}

function dateToLocalIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function defaultCustomDesdeIso(): string {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  d.setHours(0, 0, 0, 0)
  return dateToLocalIso(d)
}

type DashboardPeriodoLimites = {
  inicioIso: string
  fimIso: string
  inicioMs: number
  fimMsEnd: number
  chartMode: DashboardChartLabelMode
}

function computePeriodoLimites(
  periodo: string,
  customDesde: string,
  customAte: string,
): DashboardPeriodoLimites {
  const hoje = hojeLocalIso()
  if (periodo === 'custom') {
    let a = customDesde.trim()
    let b = customAte.trim()
    const isoOk = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)
    if (!isoOk(a)) a = defaultCustomDesdeIso()
    if (!isoOk(b)) b = hoje
    if (a > b) [a, b] = [b, a]
    const d0 = new Date(a + 'T12:00:00')
    const d1 = new Date(b + 'T12:00:00')
    const spanDays = Math.max(1, Math.round((d1.getTime() - d0.getTime()) / 86_400_000) + 1)
    const chartMode: DashboardChartLabelMode = spanDays <= 1 ? 'hoje' : spanDays <= 7 ? '7d' : '30d'
    return {
      inicioIso: a,
      fimIso: b,
      inicioMs: new Date(a + 'T00:00:00').getTime(),
      fimMsEnd: new Date(b + 'T23:59:59.999').getTime(),
      chartMode,
    }
  }

  if (periodo === 'hoje') {
    return {
      inicioIso: hoje,
      fimIso: hoje,
      inicioMs: new Date(hoje + 'T00:00:00').getTime(),
      fimMsEnd: new Date(hoje + 'T23:59:59.999').getTime(),
      chartMode: 'hoje',
    }
  }

  const t = new Date()
  t.setHours(0, 0, 0, 0)
  const daysBack =
    periodo === '7d' ? 6 : periodo === '30d' ? 29 : periodo === '90d' ? 89 : 29
  t.setDate(t.getDate() - daysBack)
  const inicioIso = dateToLocalIso(t)
  const chartMode: DashboardChartLabelMode = periodo === '7d' ? '7d' : '30d'
  return {
    inicioIso,
    fimIso: hoje,
    inicioMs: new Date(inicioIso + 'T00:00:00').getTime(),
    fimMsEnd: new Date(hoje + 'T23:59:59.999').getTime(),
    chartMode,
  }
}


function fmtChartLabel(chartMode: DashboardChartLabelMode, dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  if (chartMode === 'hoje') {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  if (chartMode === '7d') {
    return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  }
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtIsoDateBR(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function checklistsRealizadosCardMeta(
  inicioIso: string,
  fimIso: string,
  _checklistsPorDiaNoPeriodo: { data: string; realizados: number; naoRealizados: number; comNc: number }[],
  totalNoPeriodo: number,
): { label: string; value: number } {
  const hojeIso = hojeLocalIso()
  const isSingleDay = inicioIso === fimIso

  if (isSingleDay) {
    const value = totalNoPeriodo
    if (inicioIso === hojeIso) {
      return { label: 'Checklists realizados hoje', value }
    }
    return { label: `Checklists realizados em ${fmtIsoDateBR(inicioIso)}`, value }
  }

  return { label: 'Checklists realizados no período', value: totalNoPeriodo }
}

// Skeleton de KPI card — exibido enquanto dados carregam
function StatCardSkeleton({ isLast = false }: { isLast?: boolean }) {
  return (
    <div
      className={`flex animate-pulse flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200/70 p-4 dark:border-slate-700/50 sm:rounded-[2rem] sm:p-5${isLast ? ' col-span-2 sm:col-span-1' : ''}`}
    >
      <div className="h-[52px] w-[52px] rounded-xl bg-slate-200 dark:bg-slate-700/60 sm:rounded-2xl" />
      <div className="h-2 w-24 rounded-full bg-slate-200 dark:bg-slate-700/60" />
      <div className="h-8 w-12 rounded-md bg-slate-200 dark:bg-slate-700/60" />
    </div>
  )
}

function GomanLogo({
  mode = 'full',
  className = '',
  variant = 'light',
}: {
  mode?: 'full' | 'icon'
  className?: string
  variant?: 'light' | 'dark'
}) {
  const uid = useId().replace(/:/g, '')
  const gradId = `gomanGrad-${uid}`
  const svg = (
    <svg
      viewBox="0 0 60 60"
      className={mode === 'icon' ? 'h-10 w-10 drop-shadow-md' : 'h-10 w-10 shrink-0 drop-shadow-md'}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E40AF" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      <circle cx="30" cy="30" r="28" fill={`url(#${gradId})`} />
      <path
        d="M18 32L26 40L42 22"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )

  if (mode === 'icon') {
    return <div className={`flex items-center justify-center ${className}`}>{svg}</div>
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {svg}
      <span
        className={`flex items-baseline text-2xl font-black tracking-tighter ${
          variant === 'dark' ? 'text-sky-300' : 'text-[#1E3A8A] dark:text-blue-400'
        }`}
      >
        Frota Web
      </span>
    </div>
  )
}


type Stat = {
  label: string
  value: string
  sub?: string
  Icon: LucideIcon
  iconWrap: string
  cardHover: string
  href?: string
}

export function DashboardPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const areaGradId = useId().replace(/:/g, '')
  const [viewMode, setViewMode] = useState<'bar' | 'area'>('bar')
  const [periodo, setPeriodo] = useState<string>(() => {
    try { return localStorage.getItem('frota.dashboard.periodo') ?? '7d' } catch { return '7d' }
  })
  const [customDesde, setCustomDesde] = useState<string>(() => {
    try { return localStorage.getItem('frota.dashboard.customDesde') ?? defaultCustomDesdeIso() } catch { return defaultCustomDesdeIso() }
  })
  const [customAte, setCustomAte] = useState<string>(() => {
    try { return localStorage.getItem('frota.dashboard.customAte') ?? hojeLocalIso() } catch { return hojeLocalIso() }
  })
  const [filtroBase, setFiltroBase] = useState<string>(() => {
    try { return localStorage.getItem('frota.dashboard.filtroBase') ?? 'todos' } catch { return 'todos' }
  })
  const [filtroCoordenador, setFiltroCoordenador] = useState<string>(() => {
    try { return localStorage.getItem('frota.dashboard.filtroCoordenador') ?? 'todos' } catch { return 'todos' }
  })
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>(() => {
    try { return localStorage.getItem('frota.dashboard.filtroResponsavel') ?? 'todos' } catch { return 'todos' }
  })
  const [filtroSupervisor, setFiltroSupervisor] = useState<string>(() => {
    try { return localStorage.getItem('frota.dashboard.filtroSupervisor') ?? 'todos' } catch { return 'todos' }
  })
  const [filtroTipo, setFiltroTipo] = useState<string>(() => {
    try { return localStorage.getItem('frota.dashboard.filtroTipo') ?? 'todos' } catch { return 'todos' }
  })
  const [filtroPrefixo, setFiltroPrefixo] = useState<string>(() => {
    try {
      const v = localStorage.getItem('frota.dashboard.filtroPrefixo')
      return v && v !== '' ? v : 'todos'
    } catch { return 'todos' }
  })
  const [filtrosAvancadosVisiveis, setFiltrosAvancadosVisiveis] = useFilterPanelVisible('frota.filtros.dashboard')
  const [recorrentesExpandido, setRecorrentesExpandido] = useState(false)
  const [recorrentesIconFloating, setRecorrentesIconFloating] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('frota.dashboard.periodo', periodo)
      localStorage.setItem('frota.dashboard.customDesde', customDesde)
      localStorage.setItem('frota.dashboard.customAte', customAte)
      localStorage.setItem('frota.dashboard.filtroBase', filtroBase)
      localStorage.setItem('frota.dashboard.filtroCoordenador', filtroCoordenador)
      localStorage.setItem('frota.dashboard.filtroResponsavel', filtroResponsavel)
      localStorage.setItem('frota.dashboard.filtroSupervisor', filtroSupervisor)
      localStorage.setItem('frota.dashboard.filtroTipo', filtroTipo)
      localStorage.setItem('frota.dashboard.filtroPrefixo', filtroPrefixo)
    } catch { /* ignore */ }
  }, [periodo, customDesde, customAte, filtroBase, filtroCoordenador, filtroResponsavel, filtroSupervisor, filtroTipo, filtroPrefixo])

  const navigate = useNavigate()

  const irParaDetalhar = () => {
    const params = new URLSearchParams()
    params.set('periodo', periodo)
    if (periodo === 'custom') {
      params.set('desde', customDesde)
      params.set('ate', customAte)
    }
    if (filtroBase !== 'todos') params.set('base', filtroBase)
    if (filtroCoordenador !== 'todos') params.set('gerencia', filtroCoordenador)
    if (filtroResponsavel !== 'todos') params.set('responsavel', filtroResponsavel)
    if (filtroSupervisor !== 'todos') params.set('supervisor', filtroSupervisor)
    if (filtroTipo !== 'todos') params.set('tipo', filtroTipo)
    if (filtroPrefixo !== 'todos') params.set('prefixo', filtroPrefixo)
    navigate(`/checklists/detalhar?${params.toString()}`)
  }

  const { vehicles: fleetVehicles } = useFleet()

  const activeFleetMap = useMemo(() => buildActiveFleetMap(fleetVehicles), [fleetVehicles])

  const checklistFleetFilters = useMemo(
    () => ({
      base: filtroBase,
      coordenador: filtroCoordenador,
      supervisor: filtroSupervisor,
      responsavel: filtroResponsavel,
      tipo: filtroTipo,
      prefixo: filtroPrefixo,
    }),
    [filtroBase, filtroCoordenador, filtroResponsavel, filtroSupervisor, filtroTipo, filtroPrefixo],
  )

  const prefixoOptions = PREFIXO_FILTER_SELECT_OPTIONS

  useEffect(() => {
    if (filtroPrefixo !== 'todos' && !prefixoOptions.some((o) => o.value === filtroPrefixo)) {
      setFiltroPrefixo('todos')
    }
  }, [filtroPrefixo, prefixoOptions])

  const limparFiltrosAvancados = useCallback(() => {
    setFiltroBase('todos')
    setFiltroCoordenador('todos')
    setFiltroResponsavel('todos')
    setFiltroSupervisor('todos')
    setFiltroTipo('todos')
    setFiltroPrefixo('todos')
  }, [])

  const filtrosAvancadosCount = useMemo(() => {
    let n = 0
    if (filtroBase !== 'todos') n += 1
    if (filtroCoordenador !== 'todos') n += 1
    if (filtroResponsavel !== 'todos') n += 1
    if (filtroSupervisor !== 'todos') n += 1
    if (filtroTipo !== 'todos') n += 1
    if (filtroPrefixo !== 'todos') n += 1
    return n
  }, [filtroBase, filtroCoordenador, filtroResponsavel, filtroSupervisor, filtroTipo, filtroPrefixo])

  const filtrosAvancadosResumo = useMemo(() => {
    const parts: string[] = []
    if (filtroBase !== 'todos') parts.push(`base ${filtroBase}`)
    if (filtroCoordenador !== 'todos') parts.push(`gerência ${filtroCoordenador}`)
    if (filtroResponsavel !== 'todos') parts.push(`resp. ${filtroResponsavel}`)
    if (filtroSupervisor !== 'todos') parts.push(`supervisor ${filtroSupervisor}`)
    if (filtroTipo !== 'todos') parts.push(`tipo ${filtroTipo}`)
    if (filtroPrefixo !== 'todos') parts.push(`prefixo ${filtroPrefixo}`)
    return parts.join(' · ') || undefined
  }, [filtroBase, filtroCoordenador, filtroResponsavel, filtroSupervisor, filtroTipo, filtroPrefixo])

  const scopedFleetPlacas = useMemo(
    () => filterActiveFleet(activeFleetMap, checklistFleetFilters).map((v) => v.placa),
    [activeFleetMap, checklistFleetFilters],
  )

  const scopedFleetPlacasSet = useMemo(() => new Set(scopedFleetPlacas), [scopedFleetPlacas])

  const { adminPlacasSet, operacionalPlacasSet } = useMemo(() => {
    const adm = new Set<string>()
    const op = new Set<string>()
    for (const row of TOTAL_VEHICLE_ROWS) {
      const setor = row.setor?.trim().toUpperCase()
      const p = normalizePlaca(row.placa)
      if (!p) continue
      if (setor === 'ADM') adm.add(p)
      else if (setor === 'OPERACIONAL') op.add(p)
    }
    return { adminPlacasSet: adm, operacionalPlacasSet: op }
  }, [])

  const ativosAdministrativos = useMemo(
    () => scopedFleetPlacas.filter((p) => adminPlacasSet.has(p)).length,
    [scopedFleetPlacas, adminPlacasSet],
  )

  const scopedFleetPlacasOperacionais = useMemo(
    () => scopedFleetPlacas.filter((p) => operacionalPlacasSet.has(p)),
    [scopedFleetPlacas, operacionalPlacasSet],
  )

  const ativosOperacionaisFiltrado = scopedFleetPlacasOperacionais.length

  const [veiculosCardVirado, setVeiculosCardVirado] = useState(false)
  const dashboardSetorAdm = veiculosCardVirado
  const ativosSetorFiltrado = dashboardSetorAdm ? ativosAdministrativos : ativosOperacionaisFiltrado
  const setorChecklistLabel = dashboardSetorAdm ? 'administrativos' : 'operacionais'
  const toggleVeiculosCard = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setVeiculosCardVirado((v) => !v)
  }, [])

  const periodoLimites = useMemo(
    () => computePeriodoLimites(periodo, customDesde, customAte),
    [periodo, customDesde, customAte],
  )
  const periodoInicioIso = periodoLimites.inicioIso
  const periodoFimIso = periodoLimites.fimIso
  const periodoChartMode = periodoLimites.chartMode

  // Checklists concluídos (progresso 100) por dia — separados por setor (operacional / ADM).
  const [checklistsPorDiaOp, setChecklistsPorDiaOp] = useState<{ data: string; realizados: number; naoRealizados: number; comNc: number }[]>([])
  const [checklistCompletionsOp, setChecklistCompletionsOp] = useState<Set<string>>(() => new Set())
  const [checklistsPorDiaAdm, setChecklistsPorDiaAdm] = useState<{ data: string; realizados: number; naoRealizados: number; comNc: number }[]>([])
  const [checklistCompletionsAdm, setChecklistCompletionsAdm] = useState<Set<string>>(() => new Set())
  // true enquanto o primeiro fetch de checklists não terminou (sem cache disponível)
  const [checklistsCarregando, setChecklistsCarregando] = useState(true)

  useEffect(() => {
    let cancelled = false

    // Aplica cache imediatamente — evita tela em branco ao voltar para o dashboard
    const cached = getCachedChecklistCompletions(periodoInicioIso, periodoFimIso)
    if (cached) {
      const op = aggregateChecklistCompletions(cached, activeFleetMap, checklistFleetFilters, operacionalPlacasSet)
      const adm = aggregateChecklistCompletions(cached, activeFleetMap, checklistFleetFilters, adminPlacasSet)
      setChecklistCompletionsOp(op.completions)
      setChecklistsPorDiaOp(op.porDia)
      setChecklistCompletionsAdm(adm.completions)
      setChecklistsPorDiaAdm(adm.porDia)
      setChecklistsCarregando(false)
      return () => { cancelled = true }
    }

    setChecklistsCarregando(true)
    void fetchCompletedChecklistsInPeriod(periodoInicioIso, periodoFimIso)
      .then((data) => {
        if (cancelled) return
        const op = aggregateChecklistCompletions(
          data,
          activeFleetMap,
          checklistFleetFilters,
          operacionalPlacasSet,
        )
        const adm = aggregateChecklistCompletions(
          data,
          activeFleetMap,
          checklistFleetFilters,
          adminPlacasSet,
        )
        setChecklistCompletionsOp(op.completions)
        setChecklistsPorDiaOp(op.porDia)
        setChecklistCompletionsAdm(adm.completions)
        setChecklistsPorDiaAdm(adm.porDia)
        setChecklistsCarregando(false)
      })
      .catch(() => {
        if (cancelled) return
        setChecklistsPorDiaOp([])
        setChecklistCompletionsOp(new Set())
        setChecklistsPorDiaAdm([])
        setChecklistCompletionsAdm(new Set())
        setChecklistsCarregando(false)
      })

    return () => {
      cancelled = true
    }
  }, [periodoInicioIso, periodoFimIso, activeFleetMap, checklistFleetFilters, operacionalPlacasSet, adminPlacasSet])

  const checklistCompletions = dashboardSetorAdm ? checklistCompletionsAdm : checklistCompletionsOp
  const checklistsPorDia = dashboardSetorAdm ? checklistsPorDiaAdm : checklistsPorDiaOp

  const { rows, carregando: apontamentosCarregando } = useApontamentos()

  // Apontamentos filtrados (pendentes = não resolvidos)
  const pendenciasFiltradas = useMemo(() => {
    return rows.filter((r) => {
      if (r.resolvido) return false
      if (filtroBase !== 'todos' && !matchesBaseFilter(r.base, filtroBase)) return false
      if (filtroCoordenador !== 'todos' && !matchesCoordenadorFilter(r.coordenador, filtroCoordenador)) return false
      if (filtroResponsavel !== 'todos' && !matchesResponsavelFilter(r.responsavel, filtroResponsavel)) return false
      if (filtroSupervisor !== 'todos' && !matchesSupervisorFilter(r.supervisor, filtroSupervisor)) return false
      return true
    })
  }, [rows, filtroBase, filtroCoordenador, filtroResponsavel, filtroSupervisor])

  const gruposRecorrentes = useMemo(() => {
    // Pega todos os rows como ManageTableRows e extrai os grupos
    const tableRows = buildManageTableRows(pendenciasFiltradas, true, 'desc')
    return tableRows
      .filter((r): r is { type: 'group'; group: ApontamentoGroup; sortKey: string } => r.type === 'group')
      .map((r) => r.group)
      .filter((g) => g.diasConsecutivos >= 3)
      .slice(0, 5) // máx 5 alertas
  }, [pendenciasFiltradas])

  useEffect(() => {
    if (gruposRecorrentes.length === 0) {
      setRecorrentesExpandido(false)
      setRecorrentesIconFloating(false)
      return
    }
    setRecorrentesExpandido(false)
    setRecorrentesIconFloating(true)
    const t = window.setTimeout(() => setRecorrentesIconFloating(false), 5000)
    return () => window.clearTimeout(t)
  }, [gruposRecorrentes])

  const checklistsPorDiaNoPeriodo = useMemo(() => {
    return checklistsPorDia
      .filter((d) => d.data >= periodoInicioIso && d.data <= periodoFimIso)
      .sort((a, b) => a.data.localeCompare(b.data))
  }, [checklistsPorDia, periodoInicioIso, periodoFimIso])

  const periodDays = useMemo(
    () => listDaysInPeriod(periodoInicioIso, periodoFimIso),
    [periodoInicioIso, periodoFimIso],
  )

  // Gráfico: realizados, não realizados e com NC no período
  const chartData = useMemo<DashboardAdesaoChartRow[]>(() => {
    return checklistsPorDiaNoPeriodo.map((d) => ({
      name: fmtChartLabel(periodoChartMode, d.data),
      realizados: d.realizados,
      naoRealizados: d.naoRealizados,
      comNc: d.comNc,
    }))
  }, [checklistsPorDiaNoPeriodo, periodoChartMode])

  const chartTotals = useMemo(() => ({
    realizados: checklistsPorDiaNoPeriodo.reduce((s, d) => s + d.realizados, 0),
    naoRealizados: checklistsPorDiaNoPeriodo.reduce((s, d) => s + d.naoRealizados, 0),
    comNc: checklistsPorDiaNoPeriodo.reduce((s, d) => s + d.comNc, 0),
  }), [checklistsPorDiaNoPeriodo])

  // KPIs
  const stats = useMemo<Stat[]>(() => {
    const checklistsNoPeriodo = countUniqueCompletionsInPeriod(checklistCompletions, periodDays)
    const comNcNoPeriodo = checklistsPorDiaNoPeriodo.reduce((s, d) => s + d.comNc, 0)
    const checklistsRealizadosCard = checklistsRealizadosCardMeta(
      periodoInicioIso,
      periodoFimIso,
      checklistsPorDiaNoPeriodo,
      checklistsNoPeriodo,
    )

    // Enquanto o fetch não terminou, mostra '—' em vez de zeros enganosos
    const LOADING = '—'

    const conformidade = checklistsCarregando
      ? LOADING
      : checklistsNoPeriodo > 0
        ? `${Math.round(((checklistsNoPeriodo - comNcNoPeriodo) / checklistsNoPeriodo) * 100)}%`
        : '—'

    /** Mesmo critério do Status da frota: planilha total + categorias operacionais; ATIVOS no KPI = caixa ATIVOS + TRANSPORTE. */
    const ativosOperacionais = scopedFleetPlacasSet.size

    // Aderência segue o período e o setor do card (operacional ou ADM):
    const esperados = ativosSetorFiltrado * periodDays.length
    const pctAderencia = esperados > 0 ? Math.min(100, Math.round((checklistsNoPeriodo / esperados) * 100)) : 0
    const aderencia = checklistsCarregando
      ? LOADING
      : esperados > 0 ? `${pctAderencia}%` : '—'
    const aderenciaSub = checklistsCarregando
      ? 'Carregando…'
      : periodDays.length === 1
        ? `${checklistsNoPeriodo} de ${esperados} checklists ${setorChecklistLabel} realizados`
        : `${checklistsNoPeriodo} de ${esperados} esperados (${periodDays.length} dias · ${setorChecklistLabel})`

    // Pendentes = defeitos não resolvidos agora (independente do período selecionado)
    const pendentesUnicas = new Set(
      pendenciasFiltradas.map((r) => apontamentoGroupKey(r) ?? r.id),
    ).size

    return [
      {
        label: 'Total de veículos ativos',
        value: String(ativosOperacionais),
        Icon: Truck,
        iconWrap: 'bg-purple-50 text-purple-600 group-hover:scale-110 dark:bg-purple-950/50 dark:text-purple-400',
        cardHover: 'hover:border-purple-400 dark:hover:border-purple-500',
        href: '/veiculos/status',
      },
      {
        label: checklistsRealizadosCard.label,
        value: checklistsCarregando ? LOADING : String(checklistsRealizadosCard.value),
        Icon: ClipboardCheck,
        iconWrap: 'bg-blue-50 text-blue-600 group-hover:scale-110 dark:bg-blue-950/50 dark:text-blue-400',
        cardHover: 'hover:border-blue-400 dark:hover:border-blue-500',
        href: dashboardSetorAdm ? '/checklists/detalhar/adm' : '/gerenciar/checklists',
      },
      {
        label: 'Conformidade',
        value: conformidade,
        Icon: CheckCircle2,
        iconWrap: 'bg-emerald-50 text-emerald-600 group-hover:scale-110 dark:bg-emerald-950/50 dark:text-emerald-400',
        cardHover: 'hover:border-emerald-400 dark:hover:border-emerald-500',
      },
      {
        label: 'Pendentes',
        value: apontamentosCarregando ? LOADING : String(pendentesUnicas),
        Icon: ClipboardX,
        iconWrap: 'bg-orange-50 text-orange-600 group-hover:scale-110 dark:bg-orange-950/50 dark:text-orange-400',
        cardHover: 'hover:border-orange-400 dark:hover:border-orange-500',
        href: '/gerenciar',
      },
      {
        label: 'Aderência da Frota',
        value: aderencia,
        sub: aderenciaSub,
        Icon: Gauge,
        iconWrap: 'bg-sky-50 text-sky-600 group-hover:scale-110 dark:bg-sky-950/50 dark:text-sky-400',
        cardHover: 'hover:border-sky-400 dark:hover:border-sky-500',
      },
    ]
  }, [checklistsPorDiaNoPeriodo, pendenciasFiltradas, periodoLimites, periodoInicioIso, periodoFimIso, scopedFleetPlacasSet, ativosSetorFiltrado, checklistCompletions, periodDays, dashboardSetorAdm, setorChecklistLabel, checklistsCarregando, apontamentosCarregando])

  const chartUi = useMemo(
    () => ({
      grid: isDark ? 'rgba(148,163,184,0.14)' : '#e2e8f0',
      tick: isDark ? '#94a3b8' : '#64748b',
    }),
    [isDark],
  )

  const contentRef = useRef<HTMLDivElement>(null)
  const [exportando, setExportando] = useState(false)

  async function exportarImagem() {
    if (!contentRef.current || exportando) return
    setExportando(true)

    // Garante que o card de veículos exiba a frente (Ativos Operacionais) na foto
    const cardEstavaVirado = veiculosCardVirado
    if (cardEstavaVirado) setVeiculosCardVirado(false)

    // Aguarda o verso do flip card sair do DOM e a transição terminar antes de capturar
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    if (cardEstavaVirado) await new Promise((r) => setTimeout(r, 550))
    else await new Promise((r) => setTimeout(r, 50))

    const el = contentRef.current
    if (!el) { setExportando(false); return }

    // Coleta todos os ancestrais com overflow-hidden até o body e remove temporariamente
    const overflowEls: { el: HTMLElement; prev: string }[] = []
    let cursor: HTMLElement | null = el
    while (cursor && cursor !== document.body) {
      const cs = window.getComputedStyle(cursor)
      if (cs.overflow === 'hidden' || cs.overflowY === 'hidden') {
        overflowEls.push({ el: cursor, prev: cursor.style.overflow })
        cursor.style.overflow = 'visible'
      }
      cursor = cursor.parentElement
    }

    // Expande o próprio elemento para mostrar conteúdo completo
    const prevStyle = { height: el.style.height, minHeight: el.style.minHeight, maxHeight: el.style.maxHeight }
    el.style.height = 'auto'
    el.style.minHeight = 'unset'
    el.style.maxHeight = 'unset'

    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(el, {
        backgroundColor: isDark ? '#020617' : '#f8fafc',
        pixelRatio: 3,
        width: el.scrollWidth,
        height: el.scrollHeight,
      })
      const link = document.createElement('a')
      const hoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')
      link.download = `dashboard-frota-${hoje}.png`
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } finally {
      // Restaura tudo
      el.style.height = prevStyle.height
      el.style.minHeight = prevStyle.minHeight
      el.style.maxHeight = prevStyle.maxHeight
      for (const { el: e, prev } of overflowEls) e.style.overflow = prev
      if (cardEstavaVirado) setVeiculosCardVirado(true)
      setExportando(false)
    }
  }

  const recorrentesCount = gruposRecorrentes.length
  const showRecorrentesIcon = recorrentesCount > 0 && !recorrentesExpandido
  const recorrentesIconButton = showRecorrentesIcon ? (
    <button
      type="button"
      onClick={() => setRecorrentesExpandido(true)}
      data-tour="dashboard-recorrentes"
      title={`${recorrentesCount} defeito${recorrentesCount > 1 ? 's' : ''} recorrente${recorrentesCount > 1 ? 's' : ''} — clique para ver`}
      aria-label={`${recorrentesCount} defeitos recorrentes. Clique para expandir.`}
      className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 shadow-sm transition hover:scale-105 hover:bg-rose-100 hover:shadow-md dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-400 dark:hover:bg-rose-950/70"
    >
      <AlertTriangle size={16} aria-hidden />
      <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-black text-white shadow-sm">
        {recorrentesCount}
      </span>
    </button>
  ) : null

  return (
    <div className="-mx-3 -my-3 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-transparent text-slate-900 dark:text-slate-100 sm:-mx-4 sm:-my-4 lg:-mx-8 lg:-my-6">
      <div className="shrink-0 overflow-hidden border-b border-slate-200/80 bg-transparent dark:border-slate-800/60 dark:bg-transparent sm:rounded-t-xl lg:rounded-t-2xl">
        <header className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-3.5 lg:px-8">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-5 lg:gap-8">
            <GomanLogo mode="full" />
            <div className="hidden h-8 w-px shrink-0 bg-slate-200 dark:bg-slate-700 md:block" />
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="relative min-w-0">
                <Calendar
                  className="pointer-events-none absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  aria-hidden
                />
                <select
                  id="dashboard-periodo-preset"
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                  aria-label="Período do dashboard"
                  className="w-full min-w-[132px] appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm font-bold text-slate-900 shadow-sm outline-none transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-blue-500/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900/60 sm:min-w-[158px]"
                >
                  {PERIODO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  aria-hidden
                />
              </div>
              {periodo === 'custom' ? (
                <div
                  className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-end sm:gap-2"
                  role="group"
                  aria-labelledby="dashboard-periodo-preset"
                >
                  <label className="flex min-w-0 flex-1 flex-col gap-1 sm:min-w-[9.5rem]">
                    <span className="pl-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      De
                    </span>
                    <input
                      type="date"
                      value={customDesde}
                      max={hojeLocalIso()}
                      onChange={(e) => setCustomDesde(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold tabular-nums text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </label>
                  <label className="flex min-w-0 flex-1 flex-col gap-1 sm:min-w-[9.5rem]">
                    <span className="pl-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Até
                    </span>
                    <input
                      type="date"
                      value={customAte}
                      min={customDesde}
                      max={hojeLocalIso()}
                      onChange={(e) => setCustomAte(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold tabular-nums text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={exportarImagem}
              disabled={exportando}
              title="Exportar imagem do dashboard"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-transparent px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-700 transition hover:bg-slate-100/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 dark:border-slate-600/60 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5 sm:gap-2 sm:px-3.5 sm:text-[11px]"
            >
              <ImageDown size={15} className="shrink-0" aria-hidden />
              <span className="hidden sm:inline">{exportando ? 'Exportando…' : 'Exportar'}</span>
            </button>
            <button
              type="button"
              onClick={irParaDetalhar}
              className="flex items-center justify-center rounded-xl bg-[#1E3A8A] px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-900/15 transition-all duration-300 ease-out will-change-transform hover:-translate-y-0.5 hover:scale-[1.03] hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:translate-y-0 active:scale-[0.98] active:shadow-lg dark:shadow-blue-950/30 dark:focus-visible:ring-offset-slate-950 sm:rounded-2xl sm:px-5 sm:text-xs sm:py-3"
            >
              Detalhar
            </button>
          </div>
        </header>

      </div>

      <FilterPanel
        variant="section"
        visible={filtrosAvancadosVisiveis}
        onVisibleChange={setFiltrosAvancadosVisiveis}
        activeCount={filtrosAvancadosCount}
        onClear={limparFiltrosAvancados}
        summary={filtrosAvancadosResumo}
        toggleButtonProps={{ id: 'dashboard-toggle-filtros', 'aria-controls': 'dashboard-filtros-avancados' }}
        contentProps={{ id: 'dashboard-filtros-avancados' }}
        beforeToggleExtra={showRecorrentesIcon && !recorrentesIconFloating ? recorrentesIconButton : null}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <FilterPanelGroup title="Gestão" columns="sm:grid-cols-2 lg:grid-cols-4">
            <Select label="Gerência" value={filtroCoordenador} onChange={setFiltroCoordenador} options={COORDENADOR_FILTER_SELECT_OPTIONS} tone="dark" />
            <Select label="Responsável" value={filtroResponsavel} onChange={setFiltroResponsavel} options={RESPONSAVEL_FILTER_SELECT_OPTIONS} tone="dark" />
            <Select label="Supervisor" value={filtroSupervisor} onChange={setFiltroSupervisor} options={SUPERVISOR_FILTER_SELECT_OPTIONS} tone="dark" />
            <Select label="Base" value={filtroBase} onChange={setFiltroBase} options={BASE_FILTER_SELECT_OPTIONS} tone="dark" />
          </FilterPanelGroup>
          <FilterPanelGroup title="Veículo" columns="sm:grid-cols-2">
            <Select label="Tipo" value={filtroTipo} onChange={setFiltroTipo} options={TIPO_FILTER_SELECT_OPTIONS} tone="dark" />
            <Select label="Prefixo" value={filtroPrefixo} onChange={setFiltroPrefixo} options={prefixoOptions} tone="dark" />
          </FilterPanelGroup>
        </div>
      </FilterPanel>

      {showRecorrentesIcon && recorrentesIconFloating ? (
        <div className="pointer-events-none fixed inset-y-0 right-0 z-40 flex items-center pr-2 sm:pr-4">
          <div className="pointer-events-auto animate-pulse">
            {recorrentesIconButton}
          </div>
        </div>
      ) : null}

      <div ref={contentRef} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4 lg:flex-row lg:gap-5 lg:p-5">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden sm:gap-4">
          <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
            {/* Card de veículos com flip frente/verso */}
            <div style={{ perspective: exportando ? 'none' : '800px' }} className="h-full">
              <div
                style={{
                  transformStyle: exportando ? 'flat' : 'preserve-3d',
                  transition: exportando ? 'none' : 'transform 0.5s ease',
                  transform: exportando ? 'none' : veiculosCardVirado ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
                className="relative h-full"
              >
                {/* Frente — operacionais */}
                <Link
                  to="/veiculos/status"
                  style={{ backfaceVisibility: exportando ? 'visible' : 'hidden' }}
                  className="group flex h-full w-full flex-col items-center justify-center text-center rounded-2xl border border-slate-200/70 bg-transparent p-4 transition-all duration-300 dark:border-slate-700/50 sm:rounded-[2rem] sm:p-5 hover:border-purple-400 dark:hover:border-purple-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                >
                  {!exportando && (
                  <button
                    type="button"
                    onClick={toggleVeiculosCard}
                    className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-indigo-600 shadow-sm transition-all hover:scale-105 hover:bg-indigo-100 active:scale-95 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
                    title="Ver ativos administrativos"
                  >
                    <RefreshCw size={10} className="transition-transform duration-500 hover:rotate-180" />
                    ADM
                  </button>
                  )}
                  <div className="mb-3 shrink-0 rounded-xl p-3 transition-transform group-hover:scale-110 sm:rounded-2xl sm:p-3.5 bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                    <Truck size={26} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="mb-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 sm:text-[10px]">
                      Ativos operacionais
                    </p>
                    <h3 className="text-2xl font-black tabular-nums tracking-tighter text-slate-800 dark:text-white sm:text-3xl min-[1100px]:text-4xl">
                      {String(ativosOperacionaisFiltrado)}
                    </h3>
                  </div>
                </Link>

                {/* Verso — administrativos (omitido na exportação: html-to-image não respeita backfaceVisibility) */}
                {!exportando && (
                <Link
                  to="/veiculos/status"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  className="group absolute inset-0 flex flex-col items-center justify-center text-center rounded-2xl border border-slate-200/70 bg-transparent p-4 transition-all duration-300 dark:border-slate-700/50 sm:rounded-[2rem] sm:p-5 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                >
                  <button
                    type="button"
                    onClick={toggleVeiculosCard}
                    className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-extrabold text-purple-600 shadow-sm transition-all hover:scale-105 hover:bg-purple-100 active:scale-95 dark:bg-purple-950/50 dark:text-purple-300 dark:hover:bg-purple-900/60"
                    title="Ver ativos operacionais"
                  >
                    <RefreshCw size={10} className="transition-transform duration-500 hover:rotate-180" />
                    OP
                  </button>
                  <div className="mb-3 shrink-0 rounded-xl p-3 transition-transform group-hover:scale-110 sm:rounded-2xl sm:p-3.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                    <Truck size={26} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="mb-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 sm:text-[10px]">
                      Ativos administrativos
                    </p>
                    <h3 className="text-2xl font-black tabular-nums tracking-tighter text-slate-800 dark:text-white sm:text-3xl min-[1100px]:text-4xl">
                      {String(ativosAdministrativos)}
                    </h3>
                  </div>
                </Link>
                )}
              </div>
            </div>

            {/* Demais cards — skeleton durante carga inicial */}
            {(checklistsCarregando || apontamentosCarregando)
              ? Array.from({ length: 4 }, (_, i) => (
                  <StatCardSkeleton key={i} isLast={i === 3} />
                ))
              : stats.filter((s) => s.label !== 'Total de veículos ativos').map((s) => {
                  const Card = s.href ? Link : 'div'
                  const isLast = stats[stats.length - 1]?.label === s.label
                  return (
                    <Card
                      key={s.label}
                      to={s.href ?? '#'}
                      className={`group flex flex-col items-center text-center rounded-2xl border border-slate-200/70 bg-transparent p-4 transition-all duration-300 dark:border-slate-700/50 dark:bg-transparent sm:rounded-[2rem] sm:p-5 ${isLast ? 'col-span-2 sm:col-span-1' : ''} ${s.cardHover} ${s.href ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400/40' : ''}`}
                    >
                      <div className={`mb-3 shrink-0 rounded-xl p-3 transition-transform sm:rounded-2xl sm:p-3.5 ${s.iconWrap}`}>
                        <s.Icon size={26} aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className="mb-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 sm:text-[10px]">
                          {s.label}
                        </p>
                        <h3 className="text-2xl font-black tabular-nums tracking-tighter text-slate-800 dark:text-white sm:text-3xl min-[1100px]:text-4xl">
                          {s.value}
                        </h3>
                        {s.sub && (
                          <p className="mt-1 text-[9px] font-semibold text-slate-400 dark:text-slate-500 sm:text-[10px]">
                            {s.sub}
                          </p>
                        )}
                      </div>
                    </Card>
                  )
                })
            }
          </div>

          {recorrentesExpandido && recorrentesCount > 0 && (
            <div data-tour="dashboard-recorrentes-panel" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
                <span className="flex-1 text-sm font-extrabold text-rose-800 dark:text-rose-200">
                  {recorrentesCount} defeito{recorrentesCount > 1 ? 's' : ''} recorrente{recorrentesCount > 1 ? 's' : ''} (3+ dias seguidos)
                </span>
                <button
                  type="button"
                  onClick={() => setRecorrentesExpandido(false)}
                  className="rounded-lg p-1 text-rose-400 transition hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-900/40 dark:hover:text-rose-300"
                  title="Recolher"
                  aria-label="Recolher defeitos recorrentes"
                >
                  <X size={15} />
                </button>
              </div>
              <ul className="flex flex-col gap-2">
                {gruposRecorrentes.map((g) => (
                  <li key={g.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-rose-900 dark:text-rose-200">
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 font-mono font-black dark:bg-rose-900/40">
                      {g.representative.prefixo || g.placa}
                    </span>
                    <span className="flex-1 leading-snug">{g.representative.defeito}</span>
                    <span className="shrink-0 font-extrabold text-rose-700 dark:text-rose-300">
                      {g.diasConsecutivos}d seguidos · {g.count}x
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                to="/gerenciar?severidade=imperativo"
                className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-extrabold text-rose-700 underline-offset-2 hover:underline dark:text-rose-300"
              >
                Ver no Gerenciar →
              </Link>
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-transparent dark:border-slate-700/50 dark:bg-transparent sm:rounded-[2.5rem]">
            <div className="flex shrink-0 flex-col gap-2 border-b border-slate-100/80 bg-transparent p-4 dark:border-slate-800/60 dark:bg-transparent sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-xl bg-[#1E3A8A] p-2.5 text-white shadow-md shadow-blue-900/20 dark:shadow-blue-950/40 sm:rounded-2xl sm:p-3">
                  <BarChart3 size={20} aria-hidden />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs font-black uppercase tracking-tighter text-slate-800 dark:text-white sm:text-sm">
                    Adesão aos checklists
                  </h2>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 sm:text-[10px]">
                    Realizados · Não realizados · Com NC
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 rounded-xl border border-slate-200/60 bg-transparent p-1 dark:border-slate-600/50 dark:bg-transparent sm:rounded-2xl sm:p-1.5">
                <button
                  type="button"
                  onClick={() => setViewMode('bar')}
                  className={`rounded-lg px-3 py-2 text-[9px] font-black transition-all sm:rounded-xl sm:px-5 sm:py-2.5 sm:text-[10px] ${
                    viewMode === 'bar'
                      ? 'bg-white/90 text-blue-600 shadow-sm dark:bg-slate-900/90 dark:text-blue-400'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  BARRAS
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('area')}
                  className={`rounded-lg px-3 py-2 text-[9px] font-black transition-all sm:rounded-xl sm:px-5 sm:py-2.5 sm:text-[10px] ${
                    viewMode === 'area'
                      ? 'bg-white/90 text-blue-600 shadow-sm dark:bg-slate-900/90 dark:text-blue-400'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  ÁREA
                </button>
              </div>
            </div>

            <div className="relative flex h-[min(52vh,480px)] min-h-[260px] min-w-0 flex-1 flex-col p-3 sm:min-h-[300px] sm:p-4 lg:h-[min(56vh,560px)] lg:p-5">
              {exportando && (
                <div className="pointer-events-none absolute right-6 top-4 z-10 min-w-[188px] rounded-2xl border border-slate-600/70 bg-slate-950/95 px-3 py-2.5 text-slate-100 shadow-2xl shadow-black/40">
                  <p className="mb-2 border-b border-slate-500/30 pb-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Total do período
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center justify-between gap-8 text-[13px] font-bold tabular-nums">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: '#1E40AF' }} />
                        <span className="text-slate-300">Realizados</span>
                      </span>
                      <span className="text-white">{chartTotals.realizados}</span>
                    </li>
                    <li className="flex items-center justify-between gap-8 text-[13px] font-bold tabular-nums">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: '#EF4444' }} />
                        <span className="text-slate-300">Não realizados</span>
                      </span>
                      <span className="text-white">{chartTotals.naoRealizados}</span>
                    </li>
                    <li className="flex items-center justify-between gap-8 text-[13px] font-bold tabular-nums">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: '#FF8A65' }} />
                        <span className="text-slate-300">Com NC</span>
                      </span>
                      <span className="text-white">{chartTotals.comNc}</span>
                    </li>
                  </ul>
                </div>
              )}
              <Suspense
                fallback={
                  <div className="flex min-h-[240px] flex-1 items-center justify-center gap-2 text-sm font-semibold text-slate-400 dark:text-slate-500">
                    <span
                      className="size-5 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 dark:border-slate-600 dark:border-t-slate-300"
                      aria-hidden
                    />
                    A carregar gráfico…
                  </div>
                }
              >
                <LazyDashboardAdesaoCharts
                  chartData={chartData}
                  viewMode={viewMode}
                  chartUi={chartUi}
                  isDark={isDark}
                  areaGradId={areaGradId}
                  isLoading={checklistsCarregando}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
      `}</style>
    </div>
  )
}
