import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, History, RefreshCw, TrendingUp, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApontamentos } from '../apontamentos/ApontamentosContext'
import {
  filterResolvidosParaEvolucao,
  type EvolucaoFiltros,
} from '../apontamentos/evolucaoAnalytics'
import {
  ResolutoresRanking,
  buildResolutoresRanking,
  primeiroNomeDoEmail,
} from '../components/apontamentos/ResolutoresRanking'
import { FilterPanel, FilterPanelGroup, useFilterPanelVisible } from '../components/ui/FilterPanel'
import { Select, type SelectOption } from '../components/ui/Select'
import { BASE_FILTER_SELECT_OPTIONS } from '../data/baseFilterOptions'
import { COORDENADOR_FILTER_SELECT_OPTIONS } from '../data/coordenadorFilterOptions'
import { PREFIXO_FILTER_SELECT_OPTIONS } from '../data/prefixoFilterOptions'
import { RESPONSAVEL_FILTER_SELECT_OPTIONS } from '../data/responsavelFilterOptions'
import { SUPERVISOR_FILTER_SELECT_OPTIONS } from '../data/supervisorFilterOptions'

const DATA_OPTS: SelectOption[] = [
  { value: 'todos', label: 'Todos' },
  { value: '30', label: 'Últimos 30 dias (resolução)' },
  { value: '90', label: 'Últimos 90 dias (resolução)' },
  { value: '365', label: 'Últimos 12 meses (resolução)' },
  { value: 'ano', label: 'Ano atual (resolução)' },
]

export function ResolutoresRankingPage() {
  const { rows, carregando, recarregar } = useApontamentos()
  const [filtrosVisiveis, setFiltrosVisiveis] = useFilterPanelVisible('frota.filtros.ranking')
  const lsGet = (k: string, fb: string) => { try { return localStorage.getItem(k) ?? fb } catch { return fb } }

  const [filtroBase, setFiltroBase] = useState(() => lsGet('frota.ranking.base', 'todos'))
  const [filtroCoord, setFiltroCoord] = useState(() => lsGet('frota.ranking.coord', 'todos'))
  const [filtroResp, setFiltroResp] = useState(() => lsGet('frota.ranking.resp', 'todos'))
  const [filtroSupervisor, setFiltroSupervisor] = useState(() => lsGet('frota.ranking.supervisor', 'todos'))
  const [filtroPrefixo, setFiltroPrefixo] = useState(() => lsGet('frota.ranking.prefixo', 'todos'))
  const [filtroData, setFiltroData] = useState<EvolucaoFiltros['data']>(
    () => (lsGet('frota.ranking.data', 'todos') as EvolucaoFiltros['data']),
  )

  useEffect(() => {
    try {
      localStorage.setItem('frota.ranking.base', filtroBase)
      localStorage.setItem('frota.ranking.coord', filtroCoord)
      localStorage.setItem('frota.ranking.resp', filtroResp)
      localStorage.setItem('frota.ranking.supervisor', filtroSupervisor)
      localStorage.setItem('frota.ranking.prefixo', filtroPrefixo)
      localStorage.setItem('frota.ranking.data', filtroData)
    } catch { /* ignore */ }
  }, [filtroBase, filtroCoord, filtroResp, filtroSupervisor, filtroPrefixo, filtroData])

  const filtrosObj = useMemo<EvolucaoFiltros>(
    () => ({
      base: filtroBase,
      coordenador: filtroCoord,
      responsavel: filtroResp,
      supervisor: filtroSupervisor,
      prefixo: filtroPrefixo,
      data: filtroData,
    }),
    [filtroBase, filtroCoord, filtroResp, filtroSupervisor, filtroPrefixo, filtroData],
  )

  const resolvidosFiltrados = useMemo(
    () => filterResolvidosParaEvolucao(rows, filtrosObj),
    [rows, filtrosObj],
  )

  const ranking = useMemo(
    () => buildResolutoresRanking(resolvidosFiltrados, primeiroNomeDoEmail),
    [resolvidosFiltrados],
  )

  const limparFiltros = () => {
    setFiltroBase('todos')
    setFiltroCoord('todos')
    setFiltroResp('todos')
    setFiltroSupervisor('todos')
    setFiltroPrefixo('todos')
    setFiltroData('todos')
  }

  const filtrosAtivosCount = useMemo(() => {
    let n = 0
    if (filtroBase !== 'todos') n += 1
    if (filtroCoord !== 'todos') n += 1
    if (filtroResp !== 'todos') n += 1
    if (filtroSupervisor !== 'todos') n += 1
    if (filtroPrefixo !== 'todos') n += 1
    if (filtroData !== 'todos') n += 1
    return n
  }, [filtroBase, filtroCoord, filtroResp, filtroSupervisor, filtroPrefixo, filtroData])

  const filtrosResumo = useMemo(() => {
    const parts: string[] = []
    if (filtroBase !== 'todos') parts.push(`base ${filtroBase}`)
    if (filtroCoord !== 'todos') parts.push(`gerência ${filtroCoord}`)
    if (filtroResp !== 'todos') parts.push(`resp. ${filtroResp}`)
    if (filtroSupervisor !== 'todos') parts.push(`supervisor ${filtroSupervisor}`)
    if (filtroPrefixo !== 'todos') parts.push(`prefixo ${filtroPrefixo}`)
    if (filtroData !== 'todos') {
      const label = DATA_OPTS.find((o) => o.value === filtroData)?.label ?? filtroData
      parts.push(label.toLowerCase())
    }
    return parts.join(' · ') || undefined
  }, [filtroBase, filtroCoord, filtroResp, filtroSupervisor, filtroPrefixo, filtroData])

  return (
    <div className="space-y-5">
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
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-600 text-white shadow-soft dark:bg-emerald-700">
              <Trophy size={18} aria-hidden />
            </div>
            <div>
              <div className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                Ranking
              </div>
              <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Quem mais resolveu apontamentos no período selecionado
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/gerenciar/evolucao"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-900 shadow-soft hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
          >
            <TrendingUp size={18} aria-hidden />
            Evolução
          </Link>
          <Link
            to="/gerenciar/historico"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-900 shadow-soft hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
          >
            <History size={18} aria-hidden />
            Histórico
          </Link>
          <button
            type="button"
            onClick={() => void recarregar()}
            disabled={carregando}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-900 shadow-soft hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
          >
            <RefreshCw size={18} className={carregando ? 'animate-spin' : ''} aria-hidden />
            Atualizar
          </button>
        </div>
      </div>

      <FilterPanel
        visible={filtrosVisiveis}
        onVisibleChange={setFiltrosVisiveis}
        activeCount={filtrosAtivosCount}
        onClear={limparFiltros}
        summary={filtrosResumo}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <FilterPanelGroup title="Gestão" columns="sm:grid-cols-2 lg:grid-cols-4">
            <Select label="Gerência" value={filtroCoord} options={COORDENADOR_FILTER_SELECT_OPTIONS} onChange={setFiltroCoord} tone="dark" />
            <Select label="Responsável" value={filtroResp} options={RESPONSAVEL_FILTER_SELECT_OPTIONS} onChange={setFiltroResp} tone="dark" />
            <Select label="Supervisor" value={filtroSupervisor} options={SUPERVISOR_FILTER_SELECT_OPTIONS} onChange={setFiltroSupervisor} tone="dark" />
            <Select label="Base" value={filtroBase} options={BASE_FILTER_SELECT_OPTIONS} onChange={setFiltroBase} tone="dark" />
          </FilterPanelGroup>
          <FilterPanelGroup title="Veículo e período" columns="sm:grid-cols-2">
            <Select label="Prefixo" value={filtroPrefixo} options={PREFIXO_FILTER_SELECT_OPTIONS} onChange={setFiltroPrefixo} tone="dark" />
            <Select label="Data da resolução" value={filtroData} options={DATA_OPTS} onChange={(v) => setFiltroData(v as EvolucaoFiltros['data'])} tone="dark" />
          </FilterPanelGroup>
        </div>
      </FilterPanel>

      {carregando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-400">
          <RefreshCw size={16} className="animate-spin" aria-hidden />
          A carregar resoluções…
        </div>
      ) : (
        <ResolutoresRanking entries={ranking} totalResolvidos={resolvidosFiltrados.length} />
      )}
    </div>
  )
}
