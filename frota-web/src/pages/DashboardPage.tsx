import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  type LucideIcon,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ClipboardX,
  Filter,
  Gauge,
  Truck,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  BASE_DASHBOARD_QUICK_SELECT_OPTIONS,
  BASE_FILTER_SELECT_OPTIONS,
  matchesBaseFilter,
} from '../data/baseFilterOptions'
import { COORDENADOR_FILTER_SELECT_OPTIONS, matchesCoordenadorFilter } from '../data/coordenadorFilterOptions'
import { PROCESSO_FILTER_SELECT_OPTIONS, matchesProcessoFilter } from '../data/processoFilterOptions'
import { Select } from '../components/ui/Select'
import {
  getVehicleOperationalStatusRows,
  getVehicleOperationalStatusSummary,
} from '../frota/vehicleOperationalStatus'
import { useTheme } from '../theme/ThemeProvider'
import { useApontamentos } from '../apontamentos/ApontamentosContext'
import { supabase } from '../lib/supabase'

type ChartRow = { name: string; realizados: number; naoRealizados: number }

const CHART_COLORS = {
  realizados: '#1E40AF',
  naoRealizados: '#FF8A65',
} as const

type AdesaoTooltipPayload = {
  name?: string
  value?: number | string
  color?: string
  dataKey?: string | number
}

function AdesaoTooltipBody({
  active,
  payload,
  label,
  isDark,
}: {
  active?: boolean
  payload?: AdesaoTooltipPayload[]
  label?: string | number
  isDark: boolean
}) {
  if (!active || !payload?.length) return null
  const shell = isDark
    ? 'border border-slate-600/70 bg-slate-950/95 text-slate-100 shadow-2xl shadow-black/40 backdrop-blur-md'
    : 'border border-slate-200/90 bg-white/95 text-slate-900 shadow-2xl shadow-slate-900/10 backdrop-blur-md'
  return (
    <div className={`min-w-[188px] rounded-2xl px-3 py-2.5 ${shell}`}>
      <p className="mb-2 border-b border-slate-400/25 pb-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:border-slate-500/30 dark:text-slate-400">
        {label}
      </p>
      <ul className="space-y-2">
        {payload.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center justify-between gap-8 text-[13px] font-bold tabular-nums">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: p.color }} />
              <span className="truncate text-slate-600 dark:text-slate-300">{p.name}</span>
            </span>
            <span className="shrink-0 text-slate-900 dark:text-white">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const PERIODO_OPTIONS = [
  { label: 'Hoje', value: 'hoje' },
  { label: 'Últimos 7 dias', value: '7d' },
  { label: 'Últimos 30 dias', value: '30d' },
] as const

function periodoParaInicio(periodo: string): Date {
  const d = new Date()
  if (periodo === 'hoje') { d.setHours(0, 0, 0, 0); return d }
  if (periodo === '7d')  { d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d }
  d.setDate(d.getDate() - 29); d.setHours(0, 0, 0, 0); return d
}

/** Data local YYYY-MM-DD (alinhado a `data_inspecao` gravada no checklist). */
function hojeLocalIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function normalizePlacaDashboard(s: string): string {
  return s.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function checklistMatchesDashboardBase(
  dadosVeiculo: unknown,
  baseFilter: string,
  placaParaBase: Map<string, string>,
): boolean {
  if (baseFilter === 'todos') return true
  const o = dadosVeiculo && typeof dadosVeiculo === 'object' ? (dadosVeiculo as Record<string, unknown>) : null
  const placa = normalizePlacaDashboard(String(o?.placa ?? ''))
  if (!placa) return false
  const baseVeiculo = placaParaBase.get(placa)
  if (!baseVeiculo) return false
  return baseVeiculo.toLowerCase().includes(baseFilter.toLowerCase())
}

function fmtLabel(periodo: string, dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  if (periodo === 'hoje') {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  if (periodo === '7d') {
    return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  }
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
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

function QuickSelect({
  icon: Icon,
  value,
  onChange,
  options,
}: {
  icon: LucideIcon
  value: string
  onChange: (v: string) => void
  options: readonly { label: string; value: string }[]
}) {
  return (
    <div className="relative min-w-0">
      <Icon
        className="pointer-events-none absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500"
        aria-hidden
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-[132px] appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm font-bold text-slate-900 shadow-sm outline-none transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-blue-500/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900/60 sm:min-w-[158px]"
      >
        {options.map((o) => (
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
  )
}

type Stat = {
  label: string
  value: string
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
  const [periodo, setPeriodo] = useState<string>('7d')
  const [filtroBaseRapido, setFiltroBaseRapido] = useState<string>('todos')
  const [filtroProcesso, setFiltroProcesso] = useState<string>('todos')
  const [filtroBase, setFiltroBase] = useState<string>('todos')
  const [filtroCoordenador, setFiltroCoordenador] = useState<string>('todos')
  const [filtrosAvancadosVisiveis, setFiltrosAvancadosVisiveis] = useState(() => {
    try { return localStorage.getItem('frota.filtros.dashboard') === 'true' }
    catch { return false }
  })

  const baseEfetiva =
    filtroBaseRapido !== 'todos' ? filtroBaseRapido : filtroBase !== 'todos' ? filtroBase : 'todos'

  const placaParaBaseOperacional = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of getVehicleOperationalStatusRows()) {
      m.set(r.placa.trim().toUpperCase(), (r.base ?? '').trim())
    }
    return m
  }, [])

  // Checklists concluídos (progresso 100) por dia — dados reais do Supabase, filtrados pela base via placa.
  const [checklistsPorDia, setChecklistsPorDia] = useState<{ data: string; realizados: number; comNc: number }[]>([])

  useEffect(() => {
    const inicio = periodoParaInicio(periodo)
    const inicioIso = inicio.toISOString().slice(0, 10)

    void supabase
      .from('checklists')
      .select('data_inspecao, nc_count, dados_veiculo')
      .eq('progresso', 100)
      .gte('data_inspecao', inicioIso)
      .order('data_inspecao', { ascending: true })
      .then(({ data }) => {
        if (!data) {
          setChecklistsPorDia([])
          return
        }
        const map = new Map<string, { realizados: number; comNc: number }>()
        for (const row of data) {
          if (!checklistMatchesDashboardBase(row.dados_veiculo, baseEfetiva, placaParaBaseOperacional)) {
            continue
          }
          const dia = (row.data_inspecao as string).slice(0, 10)
          const prev = map.get(dia) ?? { realizados: 0, comNc: 0 }
          map.set(dia, {
            realizados: prev.realizados + 1,
            comNc: prev.comNc + ((row.nc_count as number) > 0 ? 1 : 0),
          })
        }
        setChecklistsPorDia(
          Array.from(map.entries()).map(([data, v]) => ({ data, ...v })),
        )
      })
  }, [periodo, baseEfetiva, placaParaBaseOperacional])

  const { rows } = useApontamentos()

  // Apontamentos filtrados (pendentes = não resolvidos)
  const pendenciasFiltradas = useMemo(() => {
    return rows.filter((r) => {
      if (r.resolvido) return false
      if (filtroProcesso !== 'todos' && !matchesProcessoFilter(r.processo, filtroProcesso)) return false
      if (baseEfetiva !== 'todos' && !matchesBaseFilter(r.base, baseEfetiva)) return false
      if (filtroCoordenador !== 'todos' && !matchesCoordenadorFilter(r.coordenador, filtroCoordenador)) return false
      return true
    })
  }, [rows, filtroProcesso, baseEfetiva, filtroCoordenador])

  // Gráfico: realizados vs com NC no período
  const chartData = useMemo<ChartRow[]>(() => {
    return checklistsPorDia.map((d) => ({
      name: fmtLabel(periodo, d.data),
      realizados: d.realizados,
      naoRealizados: d.comNc,
    }))
  }, [checklistsPorDia, periodo])

  // KPIs
  const stats = useMemo<Stat[]>(() => {
    const inicio = periodoParaInicio(periodo)
    const inicioMs = inicio.getTime()

    const checklistsNoPeriodo = checklistsPorDia.reduce((s, d) => s + d.realizados, 0)
    const comNcNoPeriodo = checklistsPorDia.reduce((s, d) => s + d.comNc, 0)
    const hojeIso = hojeLocalIso()
    const checklistsRealizadosHoje =
      checklistsPorDia.find((d) => d.data === hojeIso)?.realizados ?? 0
    const conformidade = checklistsNoPeriodo > 0
      ? `${Math.round(((checklistsNoPeriodo - comNcNoPeriodo) / checklistsNoPeriodo) * 100)}%`
      : '—'

    /** Mesmo critério do Status da frota: planilha total + categorias operacionais; ATIVOS no KPI = caixa ATIVOS + TRANSPORTE. */
    const linhasOperacionais =
      baseEfetiva === 'todos'
        ? getVehicleOperationalStatusRows()
        : getVehicleOperationalStatusRows().filter((r) => r.base.toLowerCase().includes(baseEfetiva))
    const resumoBase = getVehicleOperationalStatusSummary(linhasOperacionais)
    const ativosOperacionais =
      (resumoBase.find((s) => s.label === 'ATIVOS')?.count ?? 0) +
      (resumoBase.find((s) => s.label === 'TRANSPORTE')?.count ?? 0)

    const aderencia =
      ativosOperacionais > 0 && checklistsNoPeriodo > 0
        ? `${Math.min(999, Math.round((checklistsNoPeriodo / ativosOperacionais) * 100))}%`
        : '—'

    // Pendentes no período e filtro atual
    const pendentesNoPeriodo = pendenciasFiltradas.filter(
      (r) => new Date(r.dataApontamento + 'T00:00:00').getTime() >= inicioMs
    ).length

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
        label: 'Checklists realizados hoje',
        value: String(checklistsRealizadosHoje),
        Icon: ClipboardCheck,
        iconWrap: 'bg-blue-50 text-blue-600 group-hover:scale-110 dark:bg-blue-950/50 dark:text-blue-400',
        cardHover: 'hover:border-blue-400 dark:hover:border-blue-500',
        href: '/gerenciar/checklists',
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
        value: String(pendentesNoPeriodo),
        Icon: ClipboardX,
        iconWrap: 'bg-orange-50 text-orange-600 group-hover:scale-110 dark:bg-orange-950/50 dark:text-orange-400',
        cardHover: 'hover:border-orange-400 dark:hover:border-orange-500',
        href: '/gerenciar',
      },
      {
        label: 'Aderência da Frota',
        value: aderencia,
        Icon: Gauge,
        iconWrap: 'bg-sky-50 text-sky-600 group-hover:scale-110 dark:bg-sky-950/50 dark:text-sky-400',
        cardHover: 'hover:border-sky-400 dark:hover:border-sky-500',
      },
    ]
  }, [checklistsPorDia, pendenciasFiltradas, periodo, baseEfetiva])

  const chartUi = useMemo(
    () => ({
      grid: isDark ? 'rgba(148,163,184,0.14)' : '#e2e8f0',
      tick: isDark ? '#94a3b8' : '#64748b',
    }),
    [isDark],
  )

  return (
    <div className="-mx-3 -my-3 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-transparent text-slate-900 dark:text-slate-100 sm:-mx-4 sm:-my-4 lg:-mx-8 lg:-my-6 lg:overflow-hidden">
      <div className="shrink-0 overflow-hidden border-b border-slate-200/80 bg-transparent dark:border-slate-800/60 dark:bg-transparent sm:rounded-t-xl lg:rounded-t-2xl">
        <header className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-3.5 lg:px-8">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-5 lg:gap-8">
            <GomanLogo mode="full" />
            <div className="hidden h-8 w-px shrink-0 bg-slate-200 dark:bg-slate-700 md:block" />
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <QuickSelect
                icon={Calendar}
                value={periodo}
                onChange={setPeriodo}
                options={PERIODO_OPTIONS}
              />
              <QuickSelect
                icon={Filter}
                value={filtroBaseRapido}
                onChange={(v) => {
                  setFiltroBaseRapido(v)
                  setFiltroBase(v === 'todos' ? 'todos' : v)
                }}
                options={BASE_DASHBOARD_QUICK_SELECT_OPTIONS}
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              id="dashboard-toggle-filtros"
              aria-expanded={filtrosAvancadosVisiveis}
              aria-controls="dashboard-filtros-avancados"
              onClick={() => setFiltrosAvancadosVisiveis((v) => {
                const next = !v
                try { localStorage.setItem('frota.filtros.dashboard', String(next)) } catch { /* ignore */ }
                return next
              })}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-transparent px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-700 transition hover:bg-slate-100/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600/60 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5 sm:gap-2 sm:px-3.5 sm:text-[11px]"
            >
              {filtrosAvancadosVisiveis ? (
                <ChevronUp size={15} className="shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
              ) : (
                <ChevronDown size={15} className="shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
              )}
              <span className="max-w-[9rem] truncate sm:max-w-none">
                {filtrosAvancadosVisiveis ? 'Ocultar filtros' : 'Mostrar filtros'}
              </span>
            </button>
            <Link
              to="/gerenciar"
              className="flex items-center justify-center rounded-xl bg-[#1E3A8A] px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-900/15 transition-all duration-300 ease-out will-change-transform hover:-translate-y-0.5 hover:scale-[1.03] hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:translate-y-0 active:scale-[0.98] active:shadow-lg dark:shadow-blue-950/30 dark:focus-visible:ring-offset-slate-950 sm:rounded-2xl sm:px-5 sm:text-xs sm:py-3"
            >
              Detalhar
            </Link>
          </div>
        </header>

        <div
          id="dashboard-filtros-avancados"
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${filtrosAvancadosVisiveis ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-slate-100/80 bg-transparent px-4 py-3 dark:border-slate-800/60 dark:bg-transparent sm:px-6 sm:py-4 lg:px-8">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 lg:gap-4">
                <Select
                  label="Processo"
                  value={filtroProcesso}
                  onChange={setFiltroProcesso}
                  options={PROCESSO_FILTER_SELECT_OPTIONS}
                />
                <Select
                  label="Base"
                  value={filtroBase}
                  onChange={(v) => {
                    setFiltroBase(v)
                    if (v === 'todos') setFiltroBaseRapido('todos')
                    else setFiltroBaseRapido(v)
                  }}
                  options={BASE_FILTER_SELECT_OPTIONS}
                />
                <Select
                  label="Coordenador"
                  value={filtroCoordenador}
                  onChange={setFiltroCoordenador}
                  options={COORDENADOR_FILTER_SELECT_OPTIONS}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4 lg:flex-row lg:gap-5 lg:p-5">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden sm:gap-4">
          <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
            {stats.map((s) => {
              const Card = s.href ? Link : 'div'
              return (
              <Card
                key={s.label}
                to={s.href ?? '#'}
                className={`group flex flex-col items-center text-center rounded-2xl border border-slate-200/70 bg-transparent p-4 transition-all duration-300 dark:border-slate-700/50 dark:bg-transparent sm:rounded-[2rem] sm:p-5 ${s.cardHover} ${s.href ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400/40' : ''}`}
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
                </div>
              </Card>
            )})}
          </div>

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
                    Realizados vs. com NC
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

            <div className="flex h-[min(52vh,480px)] min-h-[260px] min-w-0 flex-1 flex-col p-3 sm:min-h-[300px] sm:p-4 lg:h-[min(56vh,560px)] lg:p-5">
              {chartData.length === 0 ? (
                <div className="flex flex-1 items-center justify-center text-sm font-semibold text-slate-400 dark:text-slate-600">
                  Nenhum checklist registrado neste período.
                </div>
              ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={240}
                initialDimension={{ width: 640, height: 320 }}
              >
                {viewMode === 'bar' ? (
                  <BarChart
                    data={chartData}
                    margin={{ top: 12, right: 10, left: 4, bottom: 8 }}
                    barCategoryGap="18%"
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartUi.grid} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fontWeight: 800, fill: chartUi.tick }}
                      tickMargin={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fontWeight: 800, fill: chartUi.tick }}
                      width={44}
                    />
                    <Tooltip
                      content={(props) => (
                        <AdesaoTooltipBody
                          active={props.active}
                          payload={props.payload as unknown as AdesaoTooltipPayload[] | undefined}
                          label={props.label}
                          isDark={isDark}
                        />
                      )}
                      cursor={false}
                      animationDuration={280}
                      animationEasing="ease-out"
                    />
                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      iconType="circle"
                      wrapperStyle={{ paddingTop: 18, fontSize: 11, fontWeight: 800 }}
                      formatter={(value) => <span className="text-slate-600 dark:text-slate-400">{value}</span>}
                    />
                    <Bar
                      dataKey="realizados"
                      name="Realizados"
                      fill={CHART_COLORS.realizados}
                      radius={[12, 12, 0, 0]}
                      barSize={40}
                      animationDuration={720}
                      animationEasing="ease-out"
                      animationBegin={0}
                      activeBar={{ fill: CHART_COLORS.realizados, stroke: '#93c5fd', strokeWidth: 2, opacity: 0.98 }}
                    />
                    <Bar
                      dataKey="naoRealizados"
                      name="Com NC"
                      fill={CHART_COLORS.naoRealizados}
                      radius={[12, 12, 0, 0]}
                      barSize={40}
                      animationDuration={720}
                      animationEasing="ease-out"
                      animationBegin={90}
                      activeBar={{ fill: CHART_COLORS.naoRealizados, stroke: '#fdba74', strokeWidth: 2, opacity: 0.98 }}
                    />
                  </BarChart>
                ) : (
                  <AreaChart data={chartData} margin={{ top: 12, right: 10, left: 4, bottom: 8 }}>
                    <defs>
                      <linearGradient id={`colorReal-${areaGradId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1E40AF" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#1E40AF" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id={`colorNao-${areaGradId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF8A65" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#FF8A65" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartUi.grid} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fontWeight: 800, fill: chartUi.tick }}
                      tickMargin={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fontWeight: 800, fill: chartUi.tick }}
                      width={44}
                    />
                    <Tooltip
                      content={(props) => (
                        <AdesaoTooltipBody
                          active={props.active}
                          payload={props.payload as unknown as AdesaoTooltipPayload[] | undefined}
                          label={props.label}
                          isDark={isDark}
                        />
                      )}
                      cursor={false}
                      animationDuration={280}
                      animationEasing="ease-out"
                    />
                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      iconType="circle"
                      wrapperStyle={{ paddingTop: 18, fontSize: 11, fontWeight: 800 }}
                      formatter={(value) => <span className="text-slate-600 dark:text-slate-400">{value}</span>}
                    />
                    <Area
                      type="monotone"
                      dataKey="realizados"
                      name="Realizados"
                      stroke={CHART_COLORS.realizados}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill={`url(#colorReal-${areaGradId})`}
                      dot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: CHART_COLORS.realizados }}
                      activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff', fill: CHART_COLORS.realizados }}
                      animationDuration={900}
                      animationEasing="ease-out"
                      animationBegin={0}
                    />
                    <Area
                      type="monotone"
                      dataKey="naoRealizados"
                      name="Com NC"
                      stroke={CHART_COLORS.naoRealizados}
                      strokeWidth={2.5}
                      fill={`url(#colorNao-${areaGradId})`}
                      fillOpacity={1}
                      dot={{ r: 3.5, strokeWidth: 2, stroke: '#fff', fill: CHART_COLORS.naoRealizados }}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: CHART_COLORS.naoRealizados }}
                      animationDuration={900}
                      animationEasing="ease-out"
                      animationBegin={120}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
              )}
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
