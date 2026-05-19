import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ClipboardX,
  Search,
  X,
} from 'lucide-react'

import { BASE_FILTER_SELECT_OPTIONS, matchesBaseFilter } from '../data/baseFilterOptions'
import { COORDENADOR_FILTER_SELECT_OPTIONS, matchesCoordenadorFilter } from '../data/coordenadorFilterOptions'
import { PROCESSO_FILTER_SELECT_OPTIONS, matchesProcessoFilter } from '../data/processoFilterOptions'
import { SUPERVISOR_FILTER_SELECT_OPTIONS, matchesSupervisorFilter } from '../data/supervisorFilterOptions'
import { Select } from '../components/ui/Select'
import { getDisplayedFleetVehicles } from '../frota/vehicleRegistry'
import { getVehicleOperationalStatusRowsWithLocals, isOperacionalAtivosDashboardKpi } from '../frota/vehicleOperationalStatus'
import { supabase } from '../lib/supabase'

// ─── helpers ───────────────────────────────────────────────────────────────

function hojeLocalIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dateToLocalIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function defaultDesde(): string {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  return dateToLocalIso(d)
}

function normPlaca(s: string): string {
  return s.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

const PERIODO_OPTIONS = [
  { label: 'Hoje', value: 'hoje' },
  { label: 'Últimos 7 dias', value: '7d' },
  { label: 'Últimos 30 dias', value: '30d' },
  { label: 'Últimos 90 dias', value: '90d' },
  { label: 'Intervalo personalizado', value: 'custom' },
] as const

function computeLimites(periodo: string, desde: string, ate: string): { ini: string; fim: string } {
  const hoje = hojeLocalIso()
  if (periodo === 'hoje') return { ini: hoje, fim: hoje }
  if (periodo === '7d') {
    const d = new Date(); d.setDate(d.getDate() - 6)
    return { ini: dateToLocalIso(d), fim: hoje }
  }
  if (periodo === '30d') {
    const d = new Date(); d.setDate(d.getDate() - 29)
    return { ini: dateToLocalIso(d), fim: hoje }
  }
  if (periodo === '90d') {
    const d = new Date(); d.setDate(d.getDate() - 89)
    return { ini: dateToLocalIso(d), fim: hoje }
  }
  // custom
  const isoOk = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)
  let a = isoOk(desde) ? desde : defaultDesde()
  let b = isoOk(ate) ? ate : hoje
  if (a > b) [a, b] = [b, a]
  return { ini: a, fim: b }
}

// ─── tipos ─────────────────────────────────────────────────────────────────

type VeiculoRow = {
  placa: string
  modelo: string
  base: string
  supervisor: string
  coordenador: string
  processo: string
}

type ChecklistRow = {
  placa: string
  modelo: string
  base: string
  supervisor: string
  coordenador: string
  processo: string
  data: string
  hora: string
  temNc: boolean
}

// ─── componente ────────────────────────────────────────────────────────────

export function ChecklistDetalharPage() {
  const [searchParams] = useSearchParams()

  // herda filtros do dashboard via query string
  const [periodo, setPeriodo] = useState(searchParams.get('periodo') ?? 'hoje')
  const [customDesde, setCustomDesde] = useState(searchParams.get('desde') ?? defaultDesde())
  const [customAte, setCustomAte] = useState(searchParams.get('ate') ?? hojeLocalIso())
  const [filtroProcesso, setFiltroProcesso] = useState(searchParams.get('processo') ?? 'todos')
  const [filtroBase, setFiltroBase] = useState(searchParams.get('base') ?? 'todos')
  const [filtroCoordenador, setFiltroCoordenador] = useState(searchParams.get('gerencia') ?? 'todos')
  const [filtroSupervisor, setFiltroSupervisor] = useState(searchParams.get('supervisor') ?? 'todos')
  const [busca, setBusca] = useState('')
  const [aba, setAba] = useState<'nao_realizaram' | 'realizaram'>('nao_realizaram')

  const limites = useMemo(
    () => computeLimites(periodo, customDesde, customAte),
    [periodo, customDesde, customAte],
  )

  // ── frota ATIVA (exclui desmobilizado, avariado, aguardando, reserva) ────
  const frotaMap = useMemo(() => {
    const m = new Map<string, VeiculoRow>()
    for (const v of getDisplayedFleetVehicles()) {
      const placa = normPlaca(v.placa)
      if (!placa) continue
      if (!isOperacionalAtivosDashboardKpi(placa, v.prefixo ?? '')) continue
      m.set(placa, {
        placa,
        modelo: v.modelo ?? '—',
        base: v.base ?? '',
        supervisor: v.supervisor ?? '',
        coordenador: v.coordenador ?? '',
        processo: v.prefixo ?? '',
      })
    }
    // merge com operational rows para pegar base
    for (const r of getVehicleOperationalStatusRowsWithLocals(getDisplayedFleetVehicles())) {
      const placa = normPlaca(r.placa)
      const existing = m.get(placa)
      if (existing && r.base) existing.base = r.base
    }
    return m
  }, [])

  // ── checklists do período ─────────────────────────────────────────────────
  const [rawChecklists, setRawChecklists] = useState<ChecklistRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    void supabase
      .from('checklists')
      .select('dados_veiculo, data_inspecao, nc_count, created_at')
      .eq('progresso', 100)
      .gte('data_inspecao', limites.ini)
      .lte('data_inspecao', limites.fim)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!data) { setRawChecklists([]); setLoading(false); return }

        // deduplicar por placa — mantém o mais recente por período
        const seen = new Map<string, ChecklistRow>()
        for (const row of data) {
          const dv = row.dados_veiculo && typeof row.dados_veiculo === 'object'
            ? (row.dados_veiculo as Record<string, unknown>)
            : {}
          const placa = normPlaca(String(dv.placa ?? ''))
          if (!placa) continue
          if (seen.has(placa)) continue
          const frotaInfo = frotaMap.get(placa)
          seen.set(placa, {
            placa,
            modelo: String(dv.modelo ?? dv.veiculo ?? frotaInfo?.modelo ?? '—'),
            base: frotaInfo?.base ?? String(dv.base ?? ''),
            supervisor: frotaInfo?.supervisor ?? '',
            coordenador: frotaInfo?.coordenador ?? '',
            processo: frotaInfo?.processo ?? '',
            data: (row.data_inspecao as string).slice(0, 10),
            hora: row.created_at
              ? new Date(row.created_at as string).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              : '—',
            temNc: (row.nc_count as number) > 0,
          })
        }
        setRawChecklists(Array.from(seen.values()))
        setLoading(false)
      })
  }, [limites, frotaMap])

  // ── aplicar filtros ───────────────────────────────────────────────────────
  function passaFiltros(r: { base: string; supervisor: string; coordenador: string; processo: string }) {
    if (filtroBase !== 'todos' && !matchesBaseFilter(r.base, filtroBase)) return false
    if (filtroSupervisor !== 'todos' && !matchesSupervisorFilter(r.supervisor, filtroSupervisor)) return false
    if (filtroCoordenador !== 'todos' && !matchesCoordenadorFilter(r.coordenador, filtroCoordenador)) return false
    if (filtroProcesso !== 'todos' && !matchesProcessoFilter(r.processo, filtroProcesso)) return false
    return true
  }

  const placasRealizaram = useMemo(
    () => rawChecklists.filter(passaFiltros),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawChecklists, filtroBase, filtroSupervisor, filtroCoordenador, filtroProcesso],
  )

  const placasRealizaramSet = useMemo(
    () => new Set(placasRealizaram.map((r) => r.placa)),
    [placasRealizaram],
  )

  const placasNaoRealizaram = useMemo(() => {
    return Array.from(frotaMap.values())
      .filter((v) => !placasRealizaramSet.has(v.placa) && passaFiltros(v))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frotaMap, placasRealizaramSet, filtroBase, filtroSupervisor, filtroCoordenador, filtroProcesso])

  // ── busca ─────────────────────────────────────────────────────────────────
  const q = busca.trim().toUpperCase()

  const realizaramFiltrados = useMemo(() => {
    if (!q) return placasRealizaram
    return placasRealizaram.filter(
      (r) => r.placa.includes(q) || r.modelo.toUpperCase().includes(q) || r.base.toUpperCase().includes(q),
    )
  }, [placasRealizaram, q])

  const naoRealizaramFiltrados = useMemo(() => {
    if (!q) return placasNaoRealizaram
    return placasNaoRealizaram.filter(
      (r) => r.placa.includes(q) || r.modelo.toUpperCase().includes(q) || r.base.toUpperCase().includes(q),
    )
  }, [placasNaoRealizaram, q])

  const total = placasRealizaram.length + placasNaoRealizaram.length
  const pct = total > 0 ? Math.round((placasRealizaram.length / total) * 100) : 0

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-slate-100">Detalhar checklists</h1>
          <p className="text-xs font-medium text-slate-400">
            Veículos que realizaram e não realizaram o checklist no período selecionado
          </p>
        </div>

        {/* Resumo aderência */}
        {!loading && total > 0 && (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Aderência</p>
              <p className={`text-xl font-black ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                {pct}%
              </p>
            </div>
            <div className="h-10 w-10 shrink-0">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-100 dark:text-slate-800" />
                <circle
                  cx="18" cy="18" r="15" fill="none" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${pct * 0.942} 94.2`}
                  className={pct >= 80 ? 'text-emerald-500' : pct >= 50 ? 'text-amber-500' : 'text-rose-500'}
                  stroke="currentColor"
                />
              </svg>
            </div>
            <div className="text-xs font-semibold text-slate-500">
              <p>{placasRealizaram.length} realizaram</p>
              <p>{placasNaoRealizaram.length} não realizaram</p>
            </div>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {/* Período */}
          <div className="relative">
            <Calendar size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="h-9 appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-8 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {PERIODO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Datas personalizadas */}
          {periodo === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customDesde}
                onChange={(e) => setCustomDesde(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
              <span className="text-xs text-slate-400">até</span>
              <input
                type="date"
                value={customAte}
                onChange={(e) => setCustomAte(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
          )}
        </div>

        {/* Filtros em grade */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Select label="Processo" value={filtroProcesso} onChange={setFiltroProcesso} options={PROCESSO_FILTER_SELECT_OPTIONS} />
          <Select label="Base" value={filtroBase} onChange={setFiltroBase} options={BASE_FILTER_SELECT_OPTIONS} />
          <Select label="Gerência" value={filtroCoordenador} onChange={setFiltroCoordenador} options={COORDENADOR_FILTER_SELECT_OPTIONS} />
          <Select label="Supervisor" value={filtroSupervisor} onChange={setFiltroSupervisor} options={SUPERVISOR_FILTER_SELECT_OPTIONS} />
        </div>
      </div>

      {/* Busca */}
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Search size={14} className="shrink-0 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por placa, modelo ou base…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 placeholder-slate-400 outline-none dark:text-slate-200"
        />
        {busca && (
          <button type="button" onClick={() => setBusca('')} className="text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Abas + listas */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <span className="size-7 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600 dark:border-slate-600 dark:border-t-blue-400" />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:items-start">

          {/* Coluna: Não realizaram */}
          <div className="flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <ClipboardX size={15} className="text-rose-500" />
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Não realizaram</span>
              <span className="ml-auto rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                {naoRealizaramFiltrados.length}
              </span>
            </div>

            {naoRealizaramFiltrados.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-slate-400">
                <CheckCircle2 size={28} className="text-emerald-400" />
                <p className="text-xs font-semibold">
                  {q ? 'Sem resultados.' : 'Todos realizaram o checklist!'}
                </p>
              </div>
            ) : (
              <div className="custom-scrollbar max-h-[60vh] divide-y divide-slate-50 overflow-y-auto dark:divide-slate-800/60">
                {naoRealizaramFiltrados.map((v) => (
                  <div key={v.placa} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-20 shrink-0 text-xs font-extrabold tracking-wide text-slate-800 dark:text-slate-100">{v.placa}</span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">{v.modelo}</span>
                    {v.base && (
                      <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {v.base}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coluna: Realizaram */}
          <div className="flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <ClipboardCheck size={15} className="text-emerald-500" />
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Realizaram</span>
              <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                {realizaramFiltrados.length}
              </span>
            </div>

            {realizaramFiltrados.length === 0 ? (
              <div className="py-14 text-center text-xs font-semibold text-slate-400">
                {q ? 'Sem resultados.' : 'Nenhum checklist realizado no período.'}
              </div>
            ) : (
              <div className="custom-scrollbar max-h-[60vh] divide-y divide-slate-50 overflow-y-auto dark:divide-slate-800/60">
                {realizaramFiltrados.map((v) => (
                  <div key={v.placa} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-20 shrink-0 text-xs font-extrabold tracking-wide text-slate-800 dark:text-slate-100">{v.placa}</span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">{v.modelo}</span>
                    {v.base && (
                      <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {v.base}
                      </span>
                    )}
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                        {v.hora}
                      </span>
                      {v.temNc && (
                        <span className="rounded-lg bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                          NC
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
      `}</style>
    </div>
  )
}
