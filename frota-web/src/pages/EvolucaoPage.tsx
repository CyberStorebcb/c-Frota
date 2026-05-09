import { useMemo, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Download, RotateCcw, TrendingDown, TrendingUp, Zap } from 'lucide-react'
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
  mondayKeyFromDateIso,
  parseIsoDate,
} from '../apontamentos/evolucaoAnalytics'
import { Select, type SelectOption } from '../components/ui/Select'
import { EVOLUCAO_MOCK_APONTAMENTOS } from '../apontamentos/evolucaoMockApontamentos'

/** `true` = validação de layout com 50 defeitos mock (Jan–Mai/2026). */
const EVOLUCAO_PAGE_USE_MOCK_ROWS = true

const TOOLTIP_EXEMPLOS_MAX = 5

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

/** Cores de performance por dias médios do período (grid): verde / amarelo / vermelho. */
function classifyCelula(dias: number | null): {
  cellClass: string
  textClass: string
  label: string
} {
  if (dias == null)
    return {
      cellClass: 'bg-slate-600 dark:bg-slate-700',
      textClass: 'text-slate-200 dark:text-slate-300',
      label: 'Sem dados',
    }
  if (dias <= 15)
    return {
      cellClass: 'bg-emerald-600 dark:bg-emerald-700',
      textClass: 'text-emerald-50',
      label: 'Bom (verde)',
    }
  if (dias <= 30)
    return {
      cellClass: 'bg-orange-500 dark:bg-orange-600',
      textClass: 'text-orange-950 dark:text-orange-100',
      label: 'Atenção (laranja)',
    }
  return {
    cellClass: 'bg-red-600 dark:bg-red-700',
    textClass: 'text-red-50',
    label: 'Crítico (vermelho)',
  }
}

function gapColor(n: number): string {
  if (n === 0) return 'text-green-600 dark:text-green-500'
  if (n === 1) return 'text-amber-600 dark:text-amber-400'
  if (n <= 3) return 'text-orange-600 dark:text-orange-400'
  return 'text-red-600 dark:text-red-400'
}

function bordaDefeitos(abertos: number, resolvidos: number): string {
  if (abertos === 0) return '#374151'
  const pct = resolvidos / abertos
  if (pct >= 1) return '#16a34a'
  if (pct >= 0.5) return '#ca8a04'
  return '#dc2626'
}

function cardTextStyle(dias: number | null): string {
  if (!dias) return 'text-slate-500 dark:text-slate-400'
  if (dias <= 15) return 'text-emerald-600 dark:text-emerald-400'
  if (dias <= 30) return 'text-orange-600 dark:text-orange-400'
  return 'text-red-600 dark:text-red-400'
}

const LEGENDA_CORES = [
  { className: 'bg-emerald-600 dark:bg-emerald-700', label: '≤15d', desc: 'Verde' },
  { className: 'bg-orange-500 dark:bg-orange-600', label: '16–30d', desc: 'Laranja' },
  { className: 'bg-red-600 dark:bg-red-700', label: '≥31d', desc: 'Vermelho' },
  { className: 'bg-slate-600 dark:bg-slate-700', label: 'Sem dados', desc: '' },
] as const

export function EvolucaoPage() {
  const { rows: rowsFromCtx } = useApontamentos()
  const rows = EVOLUCAO_PAGE_USE_MOCK_ROWS ? EVOLUCAO_MOCK_APONTAMENTOS : rowsFromCtx
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [wrapW, setWrapW] = useState(0)
  const [agregacao, setAgregacao] = useState<'semana' | 'mes'>('semana')
  const [tooltipCell, setTooltipCell] = useState<{ point: PontoEvolucao; x: number; y: number } | null>(null)
  const [tooltipLine2, setTooltipLine2] = useState<{
    chave: string; periodo: string; abertos: number; resolvidos: number; pendentes: number; x: number; y: number
  } | null>(null)

  const [filtroProcesso, setFiltroProcesso] = useState('todos')
  const [filtroBase, setFiltroBase] = useState('todos')
  const [filtroCoord, setFiltroCoord] = useState('todos')
  const [filtroResp, setFiltroResp] = useState('todos')
  const [filtroPrefixo, setFiltroPrefixo] = useState('todos')
  const [filtroData, setFiltroData] = useState<EvolucaoFiltros['data']>('todos')

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWrapW(el.clientWidth))
    ro.observe(el)
    setWrapW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const optProcesso = useMemo(() => {
    const opts = uniqSorted(rows.map((r) => r.processo))
    return [{ value: 'todos', label: 'Todos' }, ...opts]
  }, [rows])

  const optBase = useMemo(() => {
    const opts = uniqSorted(rows.map((r) => r.base))
    return [{ value: 'todos', label: 'Todos' }, ...opts]
  }, [rows])

  const optCoord = useMemo(() => {
    const opts = uniqSorted(rows.map((r) => r.coordenador))
    return [{ value: 'todos', label: 'Todos' }, ...opts]
  }, [rows])

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

  const boundaryRange = useMemo(() => {
    const now = new Date()
    const p2 = (n: number) => String(n).padStart(2, '0')
    const toIso = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
    const todayIso = toIso(now)
    if (filtroData === 'todos') return undefined
    return filtroData === 'ano'
      ? { from: `${now.getFullYear()}-01-01`, to: todayIso }
      : { from: toIso(new Date(now.getTime() - Number(filtroData) * 86_400_000)), to: todayIso }
  }, [filtroData])

  const chartData = useMemo(() => {
    return agregacao === 'semana'
      ? buildWeeklyChartPoints(resolvidosFiltrados, boundaryRange)
      : buildMonthlyChartPoints(resolvidosFiltrados, boundaryRange)
  }, [resolvidosFiltrados, agregacao, boundaryRange])

  const mediaGeralDias = useMemo(
    () => mediaDiasApontamentoResolucao(resolvidosFiltrados),
    [resolvidosFiltrados],
  )

  const heatmapStats = useMemo(() => {
    const totalResolvido = chartData.reduce((s, p) => s + p.resolvidos, 0)
    const comDados = chartData.filter(
      (p): p is PontoEvolucao & { diasMedios: number } => p.diasMedios != null && p.resolvidos > 0,
    )
    if (!comDados.length) return { totalResolvido, semanaRapida: null, semanaLenta: null }
    const semanaRapida = comDados.reduce((best, p) => (p.diasMedios < best.diasMedios ? p : best))
    const semanaLenta = comDados.reduce((worst, p) => (p.diasMedios > worst.diasMedios ? p : worst))
    return { totalResolvido, semanaRapida, semanaLenta }
  }, [chartData])

  /** Maior intervalo (em semanas inteiras) entre duas datas de resolução consecutivas no recorte filtrado. */
  const maiorGapEntreResolucoes = useMemo(() => {
    const datas = [
      ...new Set(
        resolvidosFiltrados.map((r) => r.dataResolvido).filter((d): d is string => Boolean(d)),
      ),
    ].sort()
    if (datas.length < 2) {
      return { semanas: 0 as number, dataAnterior: null as string | null, dataPosterior: null as string | null }
    }
    const msSemana = 7 * 86_400_000
    let maxSemanas = 0
    let dataAnterior: string | null = null
    let dataPosterior: string | null = null
    for (let i = 1; i < datas.length; i++) {
      const a = parseIsoDate(datas[i - 1]!)
      const b = parseIsoDate(datas[i]!)
      const semanas = Math.round((b - a) / msSemana)
      if (semanas > maxSemanas) {
        maxSemanas = semanas
        dataAnterior = datas[i - 1]!
        dataPosterior = datas[i]!
      }
    }
    return { semanas: maxSemanas, dataAnterior, dataPosterior }
  }, [resolvidosFiltrados])

  const linha2Data = useMemo(() => {
    const keyFn = (iso: string) =>
      agregacao === 'semana' ? mondayKeyFromDateIso(iso) : iso.slice(0, 7)

    const filtered = rows.filter((r) => {
      if (filtroProcesso !== 'todos' && r.processo !== filtroProcesso) return false
      if (filtroBase !== 'todos' && r.base !== filtroBase) return false
      if (filtroCoord !== 'todos' && r.coordenador !== filtroCoord) return false
      if (filtroResp !== 'todos' && r.responsavel !== filtroResp) return false
      if (filtroPrefixo !== 'todos' && r.prefixo !== filtroPrefixo) return false
      if (boundaryRange) {
        if (r.dataApontamento < boundaryRange.from) return false
        if (r.dataApontamento > boundaryRange.to) return false
      }
      return true
    })

    const map = new Map<string, { abertos: number; resolvidos: number; pendentes: number }>()
    for (const r of filtered) {
      const k = keyFn(r.dataApontamento)
      if (!map.has(k)) map.set(k, { abertos: 0, resolvidos: 0, pendentes: 0 })
      const entry = map.get(k)!
      entry.abertos++
      if (r.resolvido) entry.resolvidos++
      else entry.pendentes++
    }

    return chartData.map((p) => {
      const d = map.get(p.chave) ?? { abertos: 0, resolvidos: 0, pendentes: 0 }
      return { chave: p.chave, periodo: p.periodo, ...d }
    })
  }, [rows, filtroProcesso, filtroBase, filtroCoord, filtroResp, filtroPrefixo, agregacao, chartData, boundaryRange])

  const resumoAcessivel = useMemo(() => {
    if (!resolvidosFiltrados.length) {
      return 'Nenhum defeito resolvido no recorte filtrado.'
    }
    const m = mediaGeralDias != null ? `Média de ${mediaGeralDias} dias entre apontamento e resolução.` : ''
    const tot = chartData.reduce((s, p) => s + p.resolvidos, 0)
    const periodo = agregacao === 'semana' ? 'por semana' : 'por mês'
    return `${resolvidosFiltrados.length} defeitos resolvidos no filtro, ${tot} no gráfico agregado ${periodo}. ${m} ${chartData.length} períodos no eixo horizontal.`
  }, [resolvidosFiltrados, mediaGeralDias, chartData, agregacao])

  const localIsoDate = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const exportarCsv = () => {
    const csv = buildResolvidosCsv(resolvidosFiltrados)
    const stamp = localIsoDate(new Date())
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

  const isMobile = wrapW > 0 && wrapW < 640
  const cellSize = isMobile ? 60 : 80
  const periodoChip =
    agregacao === 'semana'
      ? `${chartData.length} semana(s) no heatmap`
      : `${chartData.length} mês(es) no heatmap`

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
          <Select label="Processo" value={filtroProcesso} options={optProcesso} onChange={setFiltroProcesso} />
          <Select label="Base" value={filtroBase} options={optBase} onChange={setFiltroBase} />
          <Select label="Coordenador" value={filtroCoord} options={optCoord} onChange={setFiltroCoord} />
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
        role="region"
        aria-label={resumoAcessivel}
      >
        <div>
          <div className="text-sm font-black text-slate-900 dark:text-slate-100">
            Velocidade de resolução
          </div>
        </div>

        {chartData.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <CheckCircle2 size={13} />
                Resolvidos no período
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {heatmapStats.totalResolvido}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Clock size={13} />
                Dias médios
              </div>
              <div className={`text-2xl font-black ${cardTextStyle(mediaGeralDias)}`}>
                {mediaGeralDias != null ? `${mediaGeralDias} d` : '—'}
              </div>
              <div className="text-[10px] font-semibold leading-tight text-slate-500 dark:text-slate-400">
                Média por defeito no recorte (apont. → resolv.)
              </div>
            </div>

            <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Zap size={13} />
                {agregacao === 'semana' ? 'Semana' : 'Mês'} mais rápido(a)
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {heatmapStats.semanaRapida ? `${heatmapStats.semanaRapida.diasMedios} d` : '—'}
              </div>
              {heatmapStats.semanaRapida ? (
                <div className="text-[10px] font-semibold leading-tight text-slate-500 dark:text-slate-400">
                  {heatmapStats.semanaRapida.periodo}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <TrendingDown size={13} />
                {agregacao === 'semana' ? 'Semana' : 'Mês'} mais lento(a)
              </div>
              <div className={`text-2xl font-black ${cardTextStyle(heatmapStats.semanaLenta?.diasMedios ?? null)}`}>
                {heatmapStats.semanaLenta ? `${heatmapStats.semanaLenta.diasMedios} d` : '—'}
              </div>
              {heatmapStats.semanaLenta ? (
                <div className="text-[10px] font-semibold leading-tight text-slate-500 dark:text-slate-400">
                  {heatmapStats.semanaLenta.periodo}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <AlertTriangle size={13} />
                Maior gap (entre resoluções)
              </div>
              <div
                className={`text-2xl font-black ${maiorGapEntreResolucoes.semanas === 0 ? 'text-slate-500 dark:text-slate-400' : gapColor(maiorGapEntreResolucoes.semanas)}`}
              >
                {resolvidosFiltrados.length < 2
                  ? '—'
                  : `${maiorGapEntreResolucoes.semanas} ${maiorGapEntreResolucoes.semanas === 1 ? 'semana' : 'semanas'}`}
              </div>
              {maiorGapEntreResolucoes.dataAnterior && maiorGapEntreResolucoes.dataPosterior ? (
                <div className="text-[10px] font-semibold leading-tight text-slate-500 dark:text-slate-400">
                  {maiorGapEntreResolucoes.dataAnterior} → {maiorGapEntreResolucoes.dataPosterior}
                </div>
              ) : null}
            </div>
          </div>
        )}

        <div ref={wrapRef} className="mt-4 min-w-0">
          {chartData.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
              Nenhum defeito resolvido com os filtros atuais. Ajuste os filtros ou resolva itens em{' '}
              <Link to="/gerenciar" className="mt-1 font-extrabold text-brand-600 underline dark:text-brand-400">
                Gerenciar
              </Link>
              .
            </div>
          ) : (
            <>
              <div className="overflow-x-auto pb-2">
                <div className="inline-flex flex-col gap-3 px-1 pt-2" style={{ minWidth: '100%' }}>

                  {/* ── LINHA 1: Velocidade de resolução ── */}
                  <div className="flex items-end gap-2">
                    <div
                      style={{ width: 54, flexShrink: 0, height: cellSize }}
                      className="flex flex-col items-center justify-center gap-0.5"
                    >
                      <span className="text-sm leading-none">⏱</span>
                      <span className="text-[7px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Veloc.
                      </span>
                    </div>
                    <div className="flex gap-2 pb-1">
                      {chartData.map((p) => {
                        const cls = classifyCelula(p.diasMedios)
                        return (
                          <div key={p.chave} className="flex flex-shrink-0 flex-col items-center gap-1.5">
                            <div
                              style={{ width: cellSize, height: cellSize }}
                              className={[
                                'relative cursor-pointer rounded-xl transition-opacity hover:opacity-90',
                                cls.cellClass,
                              ].join(' ')}
                              onMouseEnter={(e) => setTooltipCell({ point: p, x: e.clientX, y: e.clientY })}
                              onMouseLeave={() => setTooltipCell(null)}
                              onMouseMove={(e) =>
                                setTooltipCell((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null))
                              }
                            >
                              <span className="absolute right-1.5 top-1.5 flex min-w-[18px] items-center justify-center rounded-full bg-black/30 px-1 text-[9px] font-extrabold text-white">
                                {p.resolvidos}
                              </span>
                              <div
                                className={`flex h-full items-center justify-center text-sm font-black ${cls.textClass}`}
                              >
                                {p.diasMedios != null ? `${p.diasMedios}d` : '—'}
                              </div>
                            </div>
                            <div
                              className="text-center font-semibold leading-tight text-slate-500 dark:text-slate-400"
                              style={{ fontSize: isMobile ? 8 : 9, maxWidth: cellSize }}
                            >
                              {p.periodo}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* ── LINHA 2: Defeitos abertos vs resolvidos ── */}
                  <div className="flex items-center gap-2 pb-1">
                    <div
                      style={{ width: 54, flexShrink: 0, height: cellSize }}
                      className="flex flex-col items-center justify-center gap-0.5"
                    >
                      <span className="text-sm leading-none">📋</span>
                      <span className="text-[7px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Def.
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {linha2Data.map((d) => (
                        <div key={d.chave} className="flex flex-shrink-0 flex-col items-center">
                          <div
                            style={{
                              width: cellSize,
                              height: cellSize,
                              backgroundColor: '#1e293b',
                              border: `2px solid ${bordaDefeitos(d.abertos, d.resolvidos)}`,
                            }}
                            className="flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl transition-opacity hover:opacity-90"
                            onMouseEnter={(e) => setTooltipLine2({ ...d, x: e.clientX, y: e.clientY })}
                            onMouseLeave={() => setTooltipLine2(null)}
                            onMouseMove={(e) =>
                              setTooltipLine2((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null))
                            }
                          >
                            <span className="text-base font-black leading-none text-white">
                              {d.abertos > 0 ? d.abertos : '—'}
                            </span>
                            {d.resolvidos > 0 ? (
                              <span className="text-[9px] font-extrabold leading-none text-emerald-400">
                                {d.resolvidos} resol.
                              </span>
                            ) : null}
                            {d.pendentes > 0 ? (
                              <span className="text-[9px] font-extrabold leading-none text-red-400">
                                {d.pendentes} pend.
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Legenda — dias médios
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Rápido →</span>
                  {LEGENDA_CORES.map((l) => (
                    <div key={l.label} className="flex items-center gap-1">
                      <span className={['inline-block h-4 w-4 rounded', l.className].join(' ')} />
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        {l.label}{l.desc ? ` ${l.desc}` : ''}
                      </span>
                    </div>
                  ))}
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">← Lento</span>
                </div>
                {mediaGeralDias != null ? (
                  <div className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Referência (mesma do card):{' '}
                    <span className="font-extrabold text-slate-700 dark:text-slate-200">
                      {mediaGeralDias} dias
                    </span>
                  </div>
                ) : null}
              </div>
            </>
          )}

          {tooltipCell ? (
            <div
              style={{
                position: 'fixed',
                left: tooltipCell.x + 14,
                top: tooltipCell.y - 10,
                zIndex: 9999,
                pointerEvents: 'none',
              }}
              className="max-w-[220px] rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="font-black text-slate-900 dark:text-slate-100">
                {tooltipCell.point.periodo}
              </div>
              <div className="mt-2 space-y-1 font-semibold text-slate-600 dark:text-slate-300">
                <div className="flex justify-between gap-4">
                  <span>Resolvidos</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">
                    {tooltipCell.point.resolvidos}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Dias médios</span>
                  <span className="font-black text-sky-600 dark:text-sky-400">
                    {tooltipCell.point.diasMedios != null ? `${tooltipCell.point.diasMedios} d` : '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Classificação</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">
                    {classifyCelula(tooltipCell.point.diasMedios).label}
                  </span>
                </div>
                {tooltipCell.point.exemplos.length > 0 ? (
                  <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                    <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                      Exemplos
                    </div>
                    <ul className="mt-1 list-inside list-disc text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                      {tooltipCell.point.exemplos.slice(0, TOOLTIP_EXEMPLOS_MAX).map((t, idx) => (
                        <li key={`${idx}-${t}`} className="truncate">
                          {t}
                        </li>
                      ))}
                    </ul>
                    {tooltipCell.point.exemplos.length > TOOLTIP_EXEMPLOS_MAX ? (
                      <p className="mt-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-500">
                        +{tooltipCell.point.exemplos.length - TOOLTIP_EXEMPLOS_MAX} itens não listados
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {tooltipLine2 ? (
            <div
              style={{
                position: 'fixed',
                left: tooltipLine2.x + 14,
                top: tooltipLine2.y - 10,
                zIndex: 9999,
                pointerEvents: 'none',
              }}
              className="max-w-[220px] rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="font-black text-slate-900 dark:text-slate-100">
                {tooltipLine2.periodo}
              </div>
              <div className="mt-2 space-y-1 font-semibold text-slate-600 dark:text-slate-300">
                <div className="flex justify-between gap-4">
                  <span>Defeitos abertos</span>
                  <span className="font-black text-slate-800 dark:text-slate-100">
                    {tooltipLine2.abertos}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Resolvidos</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">
                    {tooltipLine2.resolvidos}
                    {tooltipLine2.abertos > 0
                      ? ` (${Math.round((tooltipLine2.resolvidos / tooltipLine2.abertos) * 100)}%)`
                      : ''}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Pendentes</span>
                  <span className="font-black text-red-500 dark:text-red-400">
                    {tooltipLine2.pendentes}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
