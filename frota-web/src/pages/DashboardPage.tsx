import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  type LucideIcon,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  ClipboardX,
  Filter,
  Loader2,
  Sparkles,
  TrendingUp,
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

import { Select } from '../components/ui/Select'
import { useTheme } from '../theme/ThemeProvider'
import { renderFormattedText } from '../utils/renderFormattedAiText'

type GeminiGenerateResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  error?: { message?: string }
}

async function callGemini(prompt: string, systemInstruction: string): Promise<string> {
  const key = (import.meta.env.VITE_GEMINI_API_KEY ?? '').trim()
  if (!key) throw new Error('API_KEY_MISSING')

  let model = (import.meta.env.VITE_GEMINI_MODEL ?? 'gemini-2.5-flash').trim()
  model = model.replace(/^models\//, '')

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
  }

  let retries = 5
  let delay = 1000

  while (retries > 0) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await response.json()) as GeminiGenerateResponse

      if (!response.ok) {
        const msg = data.error?.message ?? response.statusText
        throw new Error(msg || 'GEMINI_HTTP_ERROR')
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (typeof text === 'string' && text.trim()) return text
      throw new Error('GEMINI_EMPTY_RESPONSE')
    } catch (e) {
      retries -= 1
      if (retries === 0) throw e
      await new Promise((r) => setTimeout(r, delay))
      delay *= 2
    }
  }
  throw new Error('GEMINI_UNAVAILABLE')
}

/** Dados ilustrativos — adesão aos checklists por dia da semana */
const checklistData = [
  { name: 'Seg', realizados: 110, naoRealizados: 15 },
  { name: 'Ter', realizados: 125, naoRealizados: 10 },
  { name: 'Qua', realizados: 95, naoRealizados: 30 },
  { name: 'Qui', realizados: 140, naoRealizados: 5 },
  { name: 'Sex', realizados: 130, naoRealizados: 12 },
  { name: 'Sab', realizados: 45, naoRealizados: 8 },
]

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

const pendenciasMock = [
  {
    plate: 'ROU6H57',
    unit: 'PDT',
    status: 'Atrasado',
    processo: 'diario',
    base: 'pdt',
    coordenador: 'ana',
    responsavel: 'a',
    prefixo: '0101',
  },
  {
    plate: 'SNQ1J22',
    unit: 'BCB',
    status: 'Pendente',
    processo: 'semanal',
    base: 'bcb',
    coordenador: 'bruno',
    responsavel: 'b',
    prefixo: '0102',
  },
  {
    plate: 'RZR1F70',
    unit: 'STI',
    status: 'Atrasado',
    processo: 'diario',
    base: 'sti',
    coordenador: 'ana',
    responsavel: 'a',
    prefixo: '0101',
  },
  {
    plate: 'ROU7A90',
    unit: 'BCB',
    status: 'Atrasado',
    processo: 'semanal',
    base: 'bcb',
    coordenador: 'bruno',
    responsavel: 'a',
    prefixo: '0102',
  },
] as const

const PERIODO_OPTIONS = [
  { label: 'Últimos 7 dias', value: '7d' },
  { label: 'Últimos 30 dias', value: '30d' },
  { label: 'Hoje', value: 'hoje' },
] as const

const BASE_QUICK_OPTIONS = [
  { label: 'Todas as bases', value: 'todos' },
  { label: 'PDT', value: 'pdt' },
  { label: 'BCB', value: 'bcb' },
  { label: 'STI', value: 'sti' },
] as const

const PROCESSO_FILTER_OPTIONS = [
  { label: 'Todos', value: 'todos' },
  { label: 'Diário', value: 'diario' },
  { label: 'Semanal', value: 'semanal' },
] as const

const BASE_FILTER_OPTIONS = [
  { label: 'Todos', value: 'todos' },
  { label: 'PDT', value: 'pdt' },
  { label: 'BCB', value: 'bcb' },
  { label: 'STI', value: 'sti' },
] as const

const COORDENADOR_OPTIONS = [
  { label: 'Todos', value: 'todos' },
  { label: 'Ana', value: 'ana' },
  { label: 'Bruno', value: 'bruno' },
] as const

const RESPONSAVEL_OPTIONS = [
  { label: 'Todos', value: 'todos' },
  { label: 'Equipe A', value: 'a' },
  { label: 'Equipe B', value: 'b' },
] as const

const PREFIXO_OPTIONS = [
  { label: 'Todos', value: 'todos' },
  { label: '0101', value: '0101' },
  { label: '0102', value: '0102' },
] as const

function GomanLogo({
  mode = 'full',
  className = '',
  variant = 'light',
}: {
  mode?: 'full' | 'icon'
  className?: string
  /** `dark`: texto claro sobre barra escura. */
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
      <Icon className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-slate-500 dark:text-slate-400" aria-hidden />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-[132px] appearance-none rounded-lg border border-slate-200/80 bg-transparent py-2 pl-8 pr-9 text-[11px] font-bold text-slate-800 outline-none transition hover:border-slate-300 hover:bg-slate-50/50 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600/60 dark:bg-transparent dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-white/5 sm:min-w-[158px]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" aria-hidden />
    </div>
  )
}

export function DashboardPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const areaGradId = useId().replace(/:/g, '')
  const [viewMode, setViewMode] = useState<'bar' | 'area'>('bar')
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)

  const [periodo, setPeriodo] = useState<string>('7d')
  const [filtroBaseRapido, setFiltroBaseRapido] = useState<string>('todos')
  const [filtroProcesso, setFiltroProcesso] = useState<string>('todos')
  const [filtroBase, setFiltroBase] = useState<string>('todos')
  const [filtroCoordenador, setFiltroCoordenador] = useState<string>('todos')
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>('todos')
  const [filtroPrefixo, setFiltroPrefixo] = useState<string>('todos')
  const [filtrosAvancadosVisiveis, setFiltrosAvancadosVisiveis] = useState(true)

  const geminiConfigured = Boolean((import.meta.env.VITE_GEMINI_API_KEY ?? '').trim())

  const baseEfetiva =
    filtroBaseRapido !== 'todos' ? filtroBaseRapido : filtroBase !== 'todos' ? filtroBase : 'todos'

  const pendenciasFiltradas = useMemo(() => {
    return pendenciasMock.filter((row) => {
      if (filtroProcesso !== 'todos' && row.processo !== filtroProcesso) return false
      if (baseEfetiva !== 'todos' && row.base !== baseEfetiva) return false
      if (filtroCoordenador !== 'todos' && row.coordenador !== filtroCoordenador) return false
      if (filtroResponsavel !== 'todos' && row.responsavel !== filtroResponsavel) return false
      if (filtroPrefixo !== 'todos' && row.prefixo !== filtroPrefixo) return false
      return true
    })
  }, [
    filtroProcesso,
    baseEfetiva,
    filtroCoordenador,
    filtroResponsavel,
    filtroPrefixo,
  ])

  const pendentesCount = pendenciasFiltradas.length

  const stats = useMemo(
    () =>
      [
        {
          label: 'Checklists hoje',
          value: '152',
          Icon: ClipboardCheck,
          iconWrap:
            'bg-blue-50 text-blue-600 group-hover:scale-110 dark:bg-blue-950/50 dark:text-blue-400',
          cardHover: 'hover:border-blue-400 dark:hover:border-blue-500',
        },
        {
          label: 'Conformidade',
          value: '94%',
          Icon: CheckCircle2,
          iconWrap:
            'bg-emerald-50 text-emerald-600 group-hover:scale-110 dark:bg-emerald-950/50 dark:text-emerald-400',
          cardHover: 'hover:border-emerald-400 dark:hover:border-emerald-500',
        },
        {
          label: 'Pendentes',
          value: String(pendentesCount),
          Icon: ClipboardX,
          iconWrap:
            'bg-orange-50 text-orange-600 group-hover:scale-110 dark:bg-orange-950/50 dark:text-orange-400',
          cardHover: 'hover:border-orange-400 dark:hover:border-orange-500',
        },
      ] as const,
    [pendentesCount],
  )

  const chartUi = useMemo(
    () => ({
      grid: isDark ? 'rgba(148,163,184,0.14)' : '#e2e8f0',
      tick: isDark ? '#94a3b8' : '#64748b',
    }),
    [isDark],
  )

  const handleGenerateAnalysis = async () => {
    if (!geminiConfigured) return
    setIsAiLoading(true)
    try {
      const res = await callGemini(
        `Dados semanais de checklists (realizados vs não realizados por dia): ${JSON.stringify(checklistData)}`,
        'És o analista de segurança da GOMAN. Analisa a taxa de realização de checklists e dá um insight curto sobre a adesão dos condutores, em Português de Portugal.',
      )
      setAiAnalysis(res)
    } catch {
      setAiAnalysis('Não foi possível gerar a análise. Verifique VITE_GEMINI_API_KEY no .env.')
    } finally {
      setIsAiLoading(false)
    }
  }

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
                options={BASE_QUICK_OPTIONS}
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              id="dashboard-toggle-filtros"
              aria-expanded={filtrosAvancadosVisiveis}
              aria-controls="dashboard-filtros-avancados"
              onClick={() => setFiltrosAvancadosVisiveis((v) => !v)}
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

        {filtrosAvancadosVisiveis ? (
          <div
            id="dashboard-filtros-avancados"
            className="border-t border-slate-100/80 bg-transparent px-4 py-3 dark:border-slate-800/60 dark:bg-transparent sm:px-6 sm:py-4 lg:px-8"
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
              <Select
                label="Processo"
                value={filtroProcesso}
                onChange={setFiltroProcesso}
                options={[...PROCESSO_FILTER_OPTIONS]}
              />
              <Select
                label="Base"
                value={filtroBase}
                onChange={(v) => {
                  setFiltroBase(v)
                  if (v === 'todos') setFiltroBaseRapido('todos')
                  else setFiltroBaseRapido(v)
                }}
                options={[...BASE_FILTER_OPTIONS]}
              />
              <Select
                label="Coordenador"
                value={filtroCoordenador}
                onChange={setFiltroCoordenador}
                options={[...COORDENADOR_OPTIONS]}
              />
              <Select
                label="Responsável"
                value={filtroResponsavel}
                onChange={setFiltroResponsavel}
                options={[...RESPONSAVEL_OPTIONS]}
              />
              <Select
                label="Prefixo"
                value={filtroPrefixo}
                onChange={setFiltroPrefixo}
                options={[...PREFIXO_OPTIONS]}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4 lg:flex-row lg:gap-5 lg:p-5">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden sm:gap-4">
          <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className={`group flex items-center justify-between rounded-2xl border border-slate-200/70 bg-transparent p-4 transition-all duration-300 dark:border-slate-700/50 dark:bg-transparent sm:rounded-[2rem] sm:p-5 ${s.cardHover}`}
              >
                <div className="min-w-0">
                  <p className="mb-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 sm:text-[10px]">
                    {s.label}
                  </p>
                  <h3 className="text-2xl font-black tabular-nums tracking-tighter text-slate-800 dark:text-white sm:text-3xl min-[1100px]:text-4xl">
                    {s.value}
                  </h3>
                </div>
                <div className={`shrink-0 rounded-xl p-3 transition-transform sm:rounded-2xl sm:p-3.5 ${s.iconWrap}`}>
                  <s.Icon size={26} aria-hidden />
                </div>
              </div>
            ))}
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
                    Realizados vs. não realizados
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
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={240}
                initialDimension={{ width: 640, height: 320 }}
              >
                {viewMode === 'bar' ? (
                  <BarChart
                    data={checklistData}
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
                      activeBar={{
                        fill: CHART_COLORS.realizados,
                        stroke: '#93c5fd',
                        strokeWidth: 2,
                        opacity: 0.98,
                      }}
                    />
                    <Bar
                      dataKey="naoRealizados"
                      name="Não realizados"
                      fill={CHART_COLORS.naoRealizados}
                      radius={[12, 12, 0, 0]}
                      barSize={40}
                      animationDuration={720}
                      animationEasing="ease-out"
                      animationBegin={90}
                      activeBar={{
                        fill: CHART_COLORS.naoRealizados,
                        stroke: '#fdba74',
                        strokeWidth: 2,
                        opacity: 0.98,
                      }}
                    />
                  </BarChart>
                ) : (
                  <AreaChart data={checklistData} margin={{ top: 12, right: 10, left: 4, bottom: 8 }}>
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
                      name="Não realizados"
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
            </div>
          </div>
        </div>

        <div className="flex min-h-0 w-full shrink-0 flex-col gap-3 overflow-hidden sm:gap-4 lg:h-full lg:max-w-[400px] lg:shrink-0 xl:max-w-[420px]">
          <div className="group relative flex shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-700/50 bg-transparent p-5 text-white dark:border-slate-600/40 sm:rounded-[2.5rem] sm:p-6">
            <div className="relative z-10">
              <div className="mb-4 flex items-center justify-between sm:mb-5">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <div className="rounded-xl bg-blue-600 p-2 shadow-md shadow-blue-600/30 sm:rounded-2xl sm:p-2.5">
                    <Sparkles size={17} aria-hidden />
                  </div>
                  <span className="truncate text-[10px] font-black uppercase tracking-[0.25em] text-blue-100 sm:text-xs sm:tracking-[0.35em]">
                    GOMAN Safety
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleGenerateAnalysis()}
                  disabled={isAiLoading || !geminiConfigured}
                  title={geminiConfigured ? 'Gerar análise' : 'Configure VITE_GEMINI_API_KEY'}
                  className="shrink-0 rounded-xl bg-white/10 p-2.5 transition-all hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-2xl sm:p-3"
                >
                  {isAiLoading ? (
                    <Loader2 size={19} className="animate-spin text-blue-400" aria-hidden />
                  ) : (
                    <TrendingUp size={19} aria-hidden />
                  )}
                </button>
              </div>
              <div className="min-h-[72px] max-h-48 overflow-y-auto rounded-2xl border border-white/10 bg-transparent p-4 sm:min-h-[88px] sm:max-h-56 sm:rounded-3xl sm:p-5">
                {aiAnalysis ? (
                  <div className="text-xs font-bold italic leading-relaxed text-blue-50 sm:text-sm [&_li]:font-semibold [&_li]:not-italic [&_p]:italic [&_strong]:not-italic">
                    {renderFormattedText(aiAnalysis)}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-2 text-center opacity-40 sm:py-3">
                    <BrainCircuit size={28} className="mb-2 sm:mb-3" aria-hidden />
                    <p className="text-[9px] font-black uppercase tracking-widest sm:text-[10px]">
                      Analisar conformidade de hoje
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-transparent dark:border-slate-700/50 dark:bg-transparent sm:rounded-[2.5rem] lg:min-h-[200px]">
            <div className="shrink-0 border-b border-slate-100/80 bg-transparent px-4 py-3 dark:border-slate-800/60 dark:bg-transparent sm:px-5 sm:py-4">
              <h3 className="text-[11px] font-black uppercase tracking-tight text-slate-800 dark:text-white sm:text-xs">
                Veículos sem checklist
              </h3>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 sm:text-[10px]">
                Ação necessária imediata
              </p>
            </div>
            <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3 sm:space-y-3 sm:px-5 sm:py-4">
              {pendenciasFiltradas.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200/70 bg-transparent px-4 py-8 text-center text-[11px] font-bold text-slate-400 dark:border-slate-600/50 dark:bg-transparent dark:text-slate-500">
                  Nenhum veículo com estes filtros.
                </p>
              ) : (
                pendenciasFiltradas.map((v) => (
                  <div
                    key={v.plate}
                    className="flex items-center justify-between rounded-xl border border-slate-100/70 bg-transparent p-3 dark:border-slate-700/45 dark:bg-transparent sm:rounded-2xl sm:p-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                      <div className="shrink-0 rounded-lg bg-orange-100 p-1.5 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400 sm:p-2">
                        <AlertTriangle size={15} aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-black text-slate-700 dark:text-slate-200 sm:text-xs">
                          {v.plate}
                        </p>
                        <p className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500">{v.unit}</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-slate-200/70 bg-transparent px-2 py-0.5 text-[8px] font-black uppercase text-slate-500 dark:border-slate-600/50 dark:bg-transparent dark:text-slate-400 sm:px-3 sm:text-[9px]">
                      {v.status}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="shrink-0 px-4 pb-4 pt-2 sm:px-5 sm:pb-5">
              <Link
                to="/gerenciar"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200/60 bg-transparent py-3 text-[9px] font-black uppercase text-slate-600 transition-all hover:bg-slate-100/50 dark:border-slate-600/45 dark:bg-transparent dark:text-slate-300 dark:hover:bg-white/5 sm:rounded-2xl sm:py-3.5 sm:text-[10px]"
              >
                Ver todos os alertas
                <ChevronRight size={14} aria-hidden />
              </Link>
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
