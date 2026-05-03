import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  AreaChart as AreaIcon,
  BarChart3,
  CheckCircle2,
  Clock,
  LineChart,
  Truck,
  X,
} from 'lucide-react'
import { StatCard } from '../components/ui/StatCard'
import { Select } from '../components/ui/Select'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function formatNow() {
  const d = new Date()
  return d.toLocaleString('pt-BR')
}

function formatInt(n: number) {
  return new Intl.NumberFormat('pt-BR').format(n)
}

export function DashboardPage() {
  const realizedWrapRef = useRef<HTMLDivElement | null>(null)
  const notRealizedWrapRef = useRef<HTMLDivElement | null>(null)
  const [realizedReady, setRealizedReady] = useState(false)
  const [notRealizedReady, setNotRealizedReady] = useState(false)

  useEffect(() => {
    const el = realizedWrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setRealizedReady(el.getBoundingClientRect().width > 0))
    ro.observe(el)
    setRealizedReady(el.getBoundingClientRect().width > 0)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = notRealizedWrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setNotRealizedReady(el.getBoundingClientRect().width > 0))
    ro.observe(el)
    setNotRealizedReady(el.getBoundingClientRect().width > 0)
    return () => ro.disconnect()
  }, [])

  const [processo, setProcesso] = useState('todos')
  const [base, setBase] = useState('todos')
  const [coordenador, setCoordenador] = useState('todos')
  const [responsavel, setResponsavel] = useState('todos')
  const [prefixo, setPrefixo] = useState('todos')
  const [data, setData] = useState('todos')

  const [activeCard, setActiveCard] = useState<'pendentes' | 'realizados' | 'ativos'>('pendentes')
  const [viz, setViz] = useState<'bar' | 'area'>('bar')

  const realizados = useMemo(
    () => [
      { mes: 'Jan/24', qtd: 145 },
      { mes: 'Fev/24', qtd: 167 },
      { mes: 'Mar/24', qtd: 178 },
      { mes: 'Abr/24', qtd: 182 },
      { mes: 'Mai/24', qtd: 175 },
      { mes: 'Jun/24', qtd: 169 },
      { mes: 'Jul/24', qtd: 184 },
    ],
    [],
  )

  const realizadosTotal = useMemo(() => realizados.reduce((acc, r) => acc + r.qtd, 0), [realizados])
  const realizadosMediaMes = useMemo(
    () => Math.round(realizadosTotal / Math.max(1, realizados.length)),
    [realizadosTotal, realizados.length],
  )

  const naoRealizados = useMemo(
    () => [
      { mes: 'Jan/24', qtd: 42 },
      { mes: 'Fev/24', qtd: 20 },
      { mes: 'Mar/24', qtd: 9 },
      { mes: 'Abr/24', qtd: 5 },
      { mes: 'Mai/24', qtd: 12 },
      { mes: 'Jun/24', qtd: 18 },
      { mes: 'Jul/24', qtd: 3 },
    ],
    [],
  )

  const conformidade = useMemo(
    () => [
      { item: 'Pneus e Rodas', pct: 98 },
      { item: 'Sistema de Freios', pct: 95 },
      { item: 'Iluminação e Sinalização', pct: 92 },
      { item: 'Sistema Elétrico', pct: 88 },
      { item: 'Motor e Transmissão', pct: 91 },
      { item: 'Suspensão e Direção', pct: 89 },
      { item: 'Documentação', pct: 100 },
    ],
    [],
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="text-2xl font-black tracking-tight text-brand-800">
            Checklist Veicular
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {formatNow()}
          </div>
        </div>
        <img
          src="/images/a4c8c162-f15e-4de4-b0c7-1806b3f4a3ee.png"
          alt="CGB"
          className="block self-start sm:self-auto h-10 w-auto max-w-[200px] object-contain sm:h-12 sm:max-w-[260px]"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Veículos ativos"
          subtitle="Operação"
          value={formatInt(187)}
          colorClass="bg-gradient-to-br from-emerald-700 to-emerald-600"
          icon={<Truck size={18} />}
          meta={{ label: 'Online', icon: <CheckCircle2 size={14} /> }}
          selected={activeCard === 'ativos'}
          onClick={() => setActiveCard('ativos')}
        />
        <StatCard
          title="Pendentes"
          subtitle="Atenção imediata"
          value={formatInt(187)}
          colorClass="bg-gradient-to-br from-red-700 to-red-600"
          icon={<AlertTriangle size={18} />}
          meta={{ label: 'Hoje', icon: <Clock size={14} /> }}
          selected={activeCard === 'pendentes'}
          onClick={() => setActiveCard('pendentes')}
        />
        <StatCard
          title="Realizados"
          subtitle="Checklists concluídos"
          value={formatInt(187)}
          colorClass="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-700"
          icon={<CheckCircle2 size={18} />}
          meta={{ label: 'Acumulado', icon: <LineChart size={14} /> }}
          selected={activeCard === 'realizados'}
          onClick={() => setActiveCard('realizados')}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 sm:p-4 shadow-soft backdrop-blur dark:border-slate-800 dark:bg-slate-950/60">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <Select
            label="Processo"
            value={processo}
            onChange={setProcesso}
            options={[
              { label: 'Todos', value: 'todos' },
              { label: 'Diário', value: 'diario' },
              { label: 'Semanal', value: 'semanal' },
            ]}
          />
          <Select
            label="Base"
            value={base}
            onChange={setBase}
            options={[
              { label: 'Todos', value: 'todos' },
              { label: 'Base 01', value: 'base01' },
              { label: 'Base 02', value: 'base02' },
            ]}
          />
          <Select
            label="Coordenador"
            value={coordenador}
            onChange={setCoordenador}
            options={[
              { label: 'Todos', value: 'todos' },
              { label: 'Ana', value: 'ana' },
              { label: 'Bruno', value: 'bruno' },
            ]}
          />
          <Select
            label="Responsável"
            value={responsavel}
            onChange={setResponsavel}
            options={[
              { label: 'Todos', value: 'todos' },
              { label: 'Equipe A', value: 'a' },
              { label: 'Equipe B', value: 'b' },
            ]}
          />
          <Select
            label="Prefixo"
            value={prefixo}
            onChange={setPrefixo}
            options={[
              { label: 'Todos', value: 'todos' },
              { label: '0101', value: '0101' },
              { label: '0102', value: '0102' },
            ]}
          />
          <Select
            label="Data"
            value={data}
            onChange={setData}
            options={[
              { label: 'Todos', value: 'todos' },
              { label: 'Hoje', value: 'hoje' },
              { label: 'Últimos 7 dias', value: '7d' },
            ]}
          />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-soft dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black">Checklist Realizados</div>
              <div className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Média de <span className="font-extrabold text-slate-700 dark:text-slate-200">{formatInt(realizadosMediaMes)}</span> por mês na série
              </div>
            </div>
            <VizToggle value={viz} onChange={setViz} />
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Foco: <span className="font-extrabold">{labelForCard(activeCard)}</span>
          </div>
          <div ref={realizedWrapRef} className="mt-3 min-w-0 px-2 h-[170px]">
            {realizedReady ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={realizados} margin={{ top: 6, right: 14, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.35)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94A3B8' }} tickMargin={8} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} width={32} />
                  <Tooltip content={<NiceTooltip />} wrapperStyle={{ zIndex: 1 }} />
                  {viz === 'bar' ? (
                    <Bar dataKey="qtd" fill="url(#g-ok)" radius={[10, 10, 6, 6]} />
                  ) : (
                    <Area
                      type="monotone"
                      dataKey="qtd"
                      stroke="#22C55E"
                      fill="url(#a-ok)"
                      strokeWidth={2.5}
                    />
                  )}
                  <defs>
                    <linearGradient id="g-ok" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#16A34A" stopOpacity={0.55} />
                    </linearGradient>
                    <linearGradient id="a-ok" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#22C55E" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-xl bg-slate-100 dark:bg-slate-900/60" />
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-soft dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <div className="text-sm font-black">Checklist Não Realizados</div>
            <X size={18} className="text-slate-500 dark:text-slate-400" />
          </div>
          <div ref={notRealizedWrapRef} className="mt-3 min-w-0 px-2 h-[170px]">
            {notRealizedReady ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={naoRealizados} margin={{ top: 6, right: 14, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.35)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94A3B8' }} tickMargin={8} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} width={32} />
                  <Tooltip content={<NiceTooltip />} wrapperStyle={{ zIndex: 1 }} />
                  {viz === 'bar' ? (
                    <Bar dataKey="qtd" fill="url(#g-bad)" radius={[10, 10, 6, 6]} />
                  ) : (
                    <Area
                      type="monotone"
                      dataKey="qtd"
                      stroke="#EF4444"
                      fill="url(#a-bad)"
                      strokeWidth={2.5}
                    />
                  )}
                  <defs>
                    <linearGradient id="g-bad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#DC2626" stopOpacity={0.55} />
                    </linearGradient>
                    <linearGradient id="a-bad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-xl bg-slate-100 dark:bg-slate-900/60" />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-soft dark:border-slate-800 dark:bg-slate-950 lg:col-span-2 2xl:col-span-1">
          <div className="flex items-center justify-between">
            <div className="text-sm font-black">Índice de Conformidade</div>
            <LineChart size={18} className="text-slate-500 dark:text-slate-400" />
          </div>
          <div className="mt-3 space-y-3 max-h-[210px] overflow-auto pr-1">
            {conformidade.map((c) => (
              <div key={c.item}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{c.item}</div>
                  <div className="text-sm font-black text-slate-900 dark:text-slate-100">{c.pct}%</div>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-900/60">
                  <div
                    className={[
                      'h-2 rounded-full',
                      c.pct >= 95 ? 'bg-emerald-500' : c.pct >= 90 ? 'bg-amber-500' : 'bg-red-500',
                    ].join(' ')}
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function labelForCard(v: 'pendentes' | 'realizados' | 'ativos') {
  if (v === 'pendentes') return 'Pendentes'
  if (v === 'realizados') return 'Realizados'
  return 'Veículos ativos'
}

function VizToggle({
  value,
  onChange,
}: {
  value: 'bar' | 'area'
  onChange: (v: 'bar' | 'area') => void
}) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <button
        type="button"
        onClick={() => onChange('bar')}
        className={[
          'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-extrabold',
          value === 'bar'
            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
            : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900/60',
        ].join(' ')}
        aria-pressed={value === 'bar'}
      >
        <BarChart3 size={14} />
        Barras
      </button>
      <button
        type="button"
        onClick={() => onChange('area')}
        className={[
          'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-extrabold',
          value === 'area'
            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
            : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900/60',
        ].join(' ')}
        aria-pressed={value === 'area'}
      >
        <AreaIcon size={14} />
        Área
      </button>
    </div>
  )
}

type ChartTipProps = {
  active?: boolean
  label?: string | number
  payload?: ReadonlyArray<{ value?: number; name?: string }>
}

function NiceTooltip({ active, payload, label }: ChartTipProps) {
  if (!active || !payload?.length) return null
  const v = payload[0]?.value
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-soft dark:border-slate-800 dark:bg-slate-950">
      <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-base font-black text-slate-900 dark:text-slate-100">{v}</div>
    </div>
  )
}

