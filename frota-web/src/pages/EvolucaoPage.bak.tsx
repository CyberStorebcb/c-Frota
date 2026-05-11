import { useMemo, useEffect, useRef, useState, type ReactElement } from 'react'
import { Link } from 'react-router-dom'
import {
  CartesianGrid,
  ComposedChart,
  Bar,
  Line,
  LabelList,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowLeft, Download, RotateCcw, TrendingUp } from 'lucide-react'
import { useApontamentos } from '../apontamentos/ApontamentosContext'
import {
  type EvolucaoFiltros,
  type PontoEvolucao,
  buildMonthlyChartPoints,
  buildResolvidosCsv,
  buildWeeklyChartPoints,
  downloadCsv,
  filterResolvidosParaEvolucao,
  mediaDiasApontamentoResolucao,
  mediaDiasNosPontosDoGrafico,
} from '../apontamentos/evolucaoAnalytics'
import { BASE_FILTER_SELECT_OPTIONS } from '../data/baseFilterOptions'
import { COORDENADOR_FILTER_SELECT_OPTIONS } from '../data/coordenadorFilterOptions'
import { PROCESSO_FILTER_SELECT_OPTIONS } from '../data/processoFilterOptions'
import { Select, type SelectOption } from '../components/ui/Select'

const DATA_OPTS: SelectOption[] = [
  { value: 'todos', label: 'Todos' },
  { value: '30', label: 'Últimos 30 dias (resolução)' },
  { value: '90', label: 'Últimos 90 dias (resolução)' },
  { value: '365', label: 'Últimos 12 meses (resolução)' },
  { value: 'ano', label: 'Ano atual (resolução)' },
]

function uniqSorted(values: string[]): SelectOption[] {
  const u = [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  return u.map((v) => ({ value: v, label: v }))
}

function EvolucaoTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: PontoEvolucao }>
  label?: string
}): ReactElement | null {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="max-w-xs rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <div className="font-black text-slate-900 dark:text-slate-100">{label}</div>
      <div className="mt-2 space-y-1.5 font-semibold text-slate-600 dark:text-slate-300">
        <div className="flex justify-between gap-4">
          <span>Resolvidos no período</span>
          <span className="font-black text-emerald-600 dark:text-emerald-400">{row.resolvidos}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Dias médios (apont. → resolv.)</span>
          <span className="font-black text-sky-600 dark:text-sky-400">
            {row.diasMedios != null ? `${row.diasMedios} d` : '—'}
          </span>
        </div>
        {row.exemplos.length > 0 ? (
          <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
            <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
              Exemplos
            </div>
            <ul className="mt-1 list-inside list-disc text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              {row.exemplos.map((t) => (
                <li key={t} className="truncate">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function EvolucaoPage() {
  const { rows } = useApontamentos()
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(false)
  const [agregacao, setAgregacao] = useState<'semana' | 'mes'>('semana')

  const [filtroProcesso, setFiltroProcesso] = useState('todos')
  const [filtroBase, setFiltroBase] = useState('todos')
  const [filtroCoord, setFiltroCoord] = useState('todos')
  const [filtroResp, setFiltroResp] = useState('todos')
  const [filtroPrefixo, setFiltroPrefixo] = useState('todos')
  const [filtroData, setFiltroData] = useState<EvolucaoFiltros['data']>('todos')

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setReady((v) => v || el.clientWidth > 0))
    ro.observe(el)
    if (el.clientWidth > 0) setReady(true)
    return () => ro.disconnect()
  }, [])

  const optResp = useMemo(() => {
    const opts = uniqSorted(rows.map((r) => r.responsavel))
    return [{ value: 'todos', label: 'Todos' }, ...opts]
  }, [rows])

  const optPrefixo = useMemo(() => {
    const opts = uniqSorted(rows.map((r) => r.prefixo))
    return [{ value: 'todos', label: 'Todos' }, ...opts]
  }, [rows])

  const filtrosObj = useMemo<EvolucaoFiltros>(
    () => ({
      processo: filtroProcesso,
      base: filtroBase,
      coordenador: filtroCoord,
      responsavel: filtroResp,
      prefixo: filtroPrefixo,
      data: filtroData,
    }),
    [filtroProcesso, filtroBase, filtroCoord, filtroResp, filtroPrefixo, filtroData],
  )

  const resolvidosFiltrados = useMemo(
    () => filterResolvidosParaEvolucao(rows, filtrosObj),
    [rows, filtrosObj],
  )

  const chartData = useMemo(
    () =>
      agregacao === 'semana'
        ? buildWeeklyChartPoints(resolvidosFiltrados)
        : buildMonthlyChartPoints(resolvidosFiltrados),
    [resolvidosFiltrados, agregacao],
  )

  const mediaGeralDias = useMemo(
    () => mediaDiasApontamentoResolucao(resolvidosFiltrados),
    [resolvidosFiltrados],
  )

  const mediaDiasNoGrafico = useMemo(() => mediaDiasNosPontosDoGrafico(chartData), [chartData])

  const resumoAcessivel = useMemo(() => {
    if (!resolvidosFiltrados.length) {
      return 'Nenhum defeito resolvido no recorte filtrado.'
    }
    const m = mediaGeralDias != null ? `Média de ${mediaGeralDias} dias entre apontamento e resolução.` : ''
    const tot = chartData.reduce((s, p) => s + p.resolvidos, 0)
    const periodo = agregacao === 'semana' ? 'por semana' : 'por mês'
    return `${resolvidosFiltrados.length} defeitos resolvidos no filtro, ${tot} no gráfico agregado ${periodo}. ${m} ${chartData.length} períodos no eixo horizontal.`
  }, [resolvidosFiltrados, mediaGeralDias, chartData, agregacao])

  const exportarCsv = () => {
    const csv = buildResolvidosCsv(resolvidosFiltrados)
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`frota-evolucao-resolvidos-${stamp}.csv`, csv)
  }

  const limparFiltros = () => {
    setFiltroProcesso('todos')
    setFiltroBase('todos')
    setFiltroCoord('todos')
    setFiltroResp('todos')
    setFiltroPrefixo('todos')
    setFiltroData('todos')
  }

  const filtrosAtivos =
    filtroProcesso !== 'todos' ||
    filtroBase !== 'todos' ||
    filtroCoord !== 'todos' ||
    filtroResp !== 'todos' ||
    filtroPrefixo !== 'todos' ||
    filtroData !== 'todos'

  const eixoLabel = agregacao === 'semana' ? 'Qtd. / semana' : 'Qtd. / mês'
  const legendaBarra = agregacao === 'semana' ? 'Resolvidos / semana' : 'Resolvidos / mês'
  const periodoChip =
    agregacao === 'semana'
      ? `${chartData.length} semana(s) no eixo`
      : `${chartData.length} mês(es) no eixo`

  return (
    <div className="space-y-5">
      <p className="sr-only" aria-live="polite">
        {resumoAcessivel}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            to="/gerenciar"
            className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            aria-label="Voltar para Gerenciar"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-900 text-white shadow-soft dark:bg-slate-100 dark:text-slate-900">
              <TrendingUp size={18} />
            </div>
            <div>
              <div className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                Evolução
              </div>
              <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Ritmo de resolução, tempo médio até fechar, filtros e exportação do recorte
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportarCsv}
            disabled={resolvidosFiltrados.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-900 shadow-soft hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
          >
            <Download size={18} aria-hidden />
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-3 shadow-inner dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Filtros
          </div>
          <button
            type="button"
            onClick={limparFiltros}
            disabled={!filtrosAtivos}
            className={[
              'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-extrabold transition',
              filtrosAtivos
                ? 'text-brand-700 hover:bg-white dark:text-brand-400 dark:hover:bg-slate-800'
                : 'cursor-not-allowed text-slate-400 dark:text-slate-600',
            ].join(' ')}
          >
            <RotateCcw size={14} />
            Limpar filtros
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <Select label="Processo" value={filtroProcesso} options={PROCESSO_FILTER_SELECT_OPTIONS} onChange={setFiltroProcesso} />
          <Select label="Base" value={filtroBase} options={BASE_FILTER_SELECT_OPTIONS} onChange={setFiltroBase} />
          <Select label="Coordenador" value={filtroCoord} options={COORDENADOR_FILTER_SELECT_OPTIONS} onChange={setFiltroCoord} />
          <Select label="Responsável" value={filtroResp} options={optResp} onChange={setFiltroResp} />
          <Select label="Prefixo" value={filtroPrefixo} options={optPrefixo} onChange={setFiltroPrefixo} />
          <Select label="Data" value={filtroData} options={DATA_OPTS} onChange={(v) => setFiltroData(v as EvolucaoFiltros['data'])} />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-soft sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950">
        <div className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Agregação do gráfico
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={() => setAgregacao('semana')}
            className={[
              'rounded-lg px-3 py-1.5 text-xs font-extrabold transition',
              agregacao === 'semana'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800',
            ].join(' ')}
            aria-pressed={agregacao === 'semana'}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => setAgregacao('mes')}
            className={[
              'rounded-lg px-3 py-1.5 text-xs font-extrabold transition',
              agregacao === 'mes'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800',
            ].join(' ')}
            aria-pressed={agregacao === 'mes'}
          >
            Mês
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 shadow-soft dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-extrabold text-slate-800 dark:bg-slate-900 dark:text-slate-100">
          {resolvidosFiltrados.length} defeito(s) no recorte
        </span>
        {mediaGeralDias != null ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-extrabold text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
            Média global (apont. → resolv.): {mediaGeralDias} dias
          </span>
        ) : null}
        {chartData.length > 0 ? (
          <span className="rounded-full bg-sky-100 px-2.5 py-1 font-extrabold text-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
            {periodoChip}
          </span>
        ) : null}
      </div>

      <div
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-950"
        role="img"
        aria-label={resumoAcessivel}
      >
        <div>
          <div className="text-sm font-black text-slate-900 dark:text-slate-100">
            Velocidade de resolução
          </div>
          <div className="mt-1 max-w-4xl text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
            <strong className="text-slate-700 dark:text-slate-300">Barras</strong>: quantidade encerrada em
            cada {agregacao === 'semana' ? 'semana (segunda a domingo)' : 'mês civil'}, pela data de resolução.{' '}
            <strong className="text-slate-700 dark:text-slate-300">Linha azul</strong>: dias médios de ciclo
            no período. Períodos sem encerramento: barra 0 e linha interrompida.{' '}
            <strong className="text-slate-700 dark:text-slate-300">Tracejado</strong>: média dos períodos com
            linha no gráfico.
          </div>
        </div>

        <div ref={wrapRef} className="mt-4 h-[380px] min-w-0 px-1">
          {resolvidosFiltrados.length === 0 ? (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
              Nenhum defeito resolvido com os filtros atuais. Ajuste os filtros ou resolva itens em{' '}
              <Link to="/gerenciar" className="mt-1 font-extrabold text-brand-600 underline dark:text-brand-400">
                Gerenciar
              </Link>
              .
            </div>
          ) : !ready ? (
            <div className="flex h-full min-h-[220px] items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
              Carregando gráfico…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 12, bottom: 28, left: -8 }}>
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ fontSize: 11, fontWeight: 800 }}
                  formatter={(value) =>
                    value === 'resolvidos' ? legendaBarra : value === 'diasMedios' ? 'Dias médios' : String(value)
                  }
                />
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
                <XAxis
                  dataKey="periodo"
                  tick={{ fontSize: agregacao === 'mes' ? 11 : 9, fill: '#94A3B8' }}
                  tickMargin={6}
                  interval={0}
                  height={agregacao === 'mes' ? 40 : 52}
                  angle={agregacao === 'mes' ? 0 : -16}
                  textAnchor={agregacao === 'mes' ? 'middle' : 'end'}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  width={40}
                  allowDecimals={false}
                  label={{
                    value: eixoLabel,
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#94A3B8',
                    fontSize: 10,
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  width={44}
                  label={{
                    value: 'Dias médios',
                    angle: 90,
                    position: 'insideRight',
                    fill: '#94A3B8',
                    fontSize: 10,
                  }}
                />
                {mediaDiasNoGrafico != null ? (
                  <ReferenceLine
                    yAxisId="right"
                    y={mediaDiasNoGrafico}
                    stroke="#64748B"
                    strokeDasharray="5 5"
                    label={{
                      value: `Média períodos: ${mediaDiasNoGrafico} d`,
                      fill: '#64748B',
                      fontSize: 10,
                      position: 'insideTopRight',
                    }}
                  />
                ) : null}
                <Tooltip content={<EvolucaoTooltip />} />
                <Bar
                  yAxisId="left"
                  dataKey="resolvidos"
                  name="resolvidos"
                  fill="url(#ev-bar)"
                  radius={[8, 8, 4, 4]}
                  maxBarSize={56}
                >
                  <LabelList
                    dataKey="resolvidos"
                    position="top"
                    fill="#64748B"
                    fontSize={11}
                    fontWeight={800}
                    formatter={(v) => (typeof v === 'number' && v > 0 ? String(v) : '')}
                  />
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="diasMedios"
                  name="diasMedios"
                  stroke="#0EA5E9"
                  strokeWidth={2.5}
                  connectNulls={false}
                  dot={{ r: 4, fill: '#0EA5E9', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                >
                  <LabelList
                    dataKey="diasMedios"
                    position="top"
                    fill="#0EA5E9"
                    fontSize={10}
                    fontWeight={800}
                    formatter={(v) => (typeof v === 'number' ? `${v}` : '')}
                  />
                </Line>
                <defs>
                  <linearGradient id="ev-bar" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#22C55E" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#16A34A" stopOpacity={0.55} />
                  </linearGradient>
                </defs>
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
