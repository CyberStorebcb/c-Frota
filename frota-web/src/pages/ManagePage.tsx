import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  History,
  Inbox,
  Loader2,
  TrendingUp,
  RotateCcw,
  Upload,
  Search,
  Settings2,
  Truck,
  X,
  ZoomIn,
} from 'lucide-react'
import type { Apontamento } from '../apontamentos/ApontamentosContext'
import { useApontamentos } from '../apontamentos/ApontamentosContext'
import { formatDefeitoParaExibicao } from '../apontamentos/defeitoExibicao'
import { useAuth } from '../auth/AuthContext'
import { BASE_FILTER_SELECT_OPTIONS, matchesBaseFilter } from '../data/baseFilterOptions'
import { COORDENADOR_FILTER_SELECT_OPTIONS, matchesCoordenadorFilter } from '../data/coordenadorFilterOptions'
import { PROCESSO_FILTER_SELECT_OPTIONS, matchesProcessoFilter } from '../data/processoFilterOptions'
import { Select, type SelectOption } from '../components/ui/Select'
import { Portal } from '../components/ui/Portal'

function formatDateBR(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function isDefeitoEntrante(r: Apontamento, nowMs: number) {
  if (r.resolvido) return false
  const ap = new Date(r.dataApontamento + 'T12:00:00').getTime()
  const ageDays = (nowMs - ap) / 86_400_000
  return ageDays >= 0 && ageDays <= 7
}

function formatCurrency(digits: string): string {
  const cents = parseInt(digits, 10)
  if (!Number.isFinite(cents)) return ''
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

function parseCurrency(masked: string): number | null {
  const raw = masked.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : null
}

function uniqSorted(values: string[]): SelectOption[] {
  const u = [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  return u.map((v) => ({ value: v, label: v }))
}


const PAGE_SIZE_OPTIONS: SelectOption[] = [
  { value: '25', label: '25 por página' },
  { value: '50', label: '50 por página' },
  { value: '100', label: '100 por página' },
]

function StatPill({
  label,
  value,
  icon,
  tone,
  selected = false,
  onClick,
}: {
  label: string
  value: string
  icon: React.ReactNode
  tone: 'slate' | 'emerald' | 'rose' | 'sky'
  selected?: boolean
  onClick?: () => void
}) {
  const toneClass =
    tone === 'emerald'
      ? 'border-emerald-200/80 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100'
      : tone === 'rose'
        ? 'border-rose-200/80 bg-rose-50 text-rose-950 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100'
        : tone === 'sky'
          ? 'border-sky-200/80 bg-sky-50 text-sky-950 dark:border-sky-900/45 dark:bg-sky-950/35 dark:text-sky-100'
          : 'border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100'

  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={[
        'flex flex-col items-center gap-2 rounded-2xl border px-4 py-3 text-center shadow-soft',
        onClick ? 'transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0' : '',
        selected ? 'ring-2 ring-brand-500/60' : 'ring-0',
        toneClass,
      ].join(' ')}
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/80 text-current shadow-sm dark:bg-slate-950/50">
        {icon}
      </span>
      <div>
        <div className="text-xs font-extrabold uppercase tracking-wide opacity-80">{label}</div>
        <div className="text-lg font-black tracking-tight">{value}</div>
      </div>
    </Tag>
  )
}

export function ManagePage() {
  const { rows, carregando, marcarResolvido, checklistsRealizadosTotal } = useApontamentos()
  const { user } = useAuth()
  const canMarkResolved = user?.role === 'admin'

  const [visao, setVisao] = useState<'apontamentos' | 'pendentes' | 'resolvidos'>('apontamentos')
  const [vehicleId, setVehicleId] = useState<string>('todos')
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(() => {
    try { return localStorage.getItem('frota.filtros.manage') === 'true' }
    catch { return false }
  })
  const [query, setQuery] = useState('')
  const [processo, setProcesso] = useState('todos')
  const [base, setBase] = useState('todos')
  const [coordenador, setCoordenador] = useState('todos')
  const [responsavel, setResponsavel] = useState('todos')
  const [prefixo, setPrefixo] = useState('todos')
  const [data, setData] = useState('todos')
  const [pagina, setPagina] = useState(1)
  const [pageSizeStr, setPageSizeStr] = useState('25')
  const pageSize = Number(pageSizeStr) || 25
  const [nowMs, setNowMs] = useState(() => Date.now())
  const tabelaRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const vehicleOptions = useMemo<SelectOption[]>(() => {
    const map = new Map<string, string>()
    for (const r of rows) {
      if (!map.has(r.veiculoId)) map.set(r.veiculoId, r.veiculoLabel)
    }
    const opts = Array.from(map.entries()).map(([value, label]) => ({ value, label }))
    opts.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
    return [{ value: 'todos', label: 'Todos os veículos' }, ...opts]
  }, [rows])

  const respOptions = useMemo<SelectOption[]>(() => {
    return [{ value: 'todos', label: 'Todos' }, ...uniqSorted(rows.map((r) => r.responsavel))]
  }, [rows])

  const prefixoOptions = useMemo<SelectOption[]>(() => {
    return [{ value: 'todos', label: 'Todos' }, ...uniqSorted(rows.map((r) => r.prefixo))]
  }, [rows])

  const dataOpts = useMemo<SelectOption[]>(() => {
    const anos = [...new Set(rows.map((r) => r.dataApontamento.slice(0, 4)).filter(Boolean))]
      .sort((a, b) => Number(b) - Number(a))
    const anoAtual = String(new Date().getFullYear())
    return [
      { value: 'todos', label: 'Todos' },
      { value: 'hoje', label: 'Hoje' },
      { value: '7d', label: 'Últimos 7 dias' },
      { value: '30d', label: 'Últimos 30 dias' },
      { value: 'ano', label: `Ano atual (${anoAtual})` },
      ...anos.map((a) => ({ value: a, label: a })),
    ]
  }, [rows])

  /** Filtros da página (veículo, data, busca, etc.) sem recorte por visão Pendentes/Resolvidos — usado nos KPIs e como base da tabela. */
  const rowsMatchingFiltros = useMemo(() => {
    let list = rows
    if (vehicleId !== 'todos') list = list.filter((r) => r.veiculoId === vehicleId)
    if (processo !== 'todos') list = list.filter((r) => matchesProcessoFilter(r.processo, processo))
    if (base !== 'todos') list = list.filter((r) => matchesBaseFilter(r.base, base))
    if (coordenador !== 'todos') list = list.filter((r) => matchesCoordenadorFilter(r.coordenador, coordenador))
    if (responsavel !== 'todos') list = list.filter((r) => r.responsavel === responsavel)
    if (prefixo !== 'todos') list = list.filter((r) => r.prefixo === prefixo)

    if (data !== 'todos') {
      const now = new Date()
      now.setHours(23, 59, 59, 999)
      const nowMs = now.getTime()
      const ano = now.getFullYear()

      if (data === 'ano') {
        list = list.filter((r) => Number(r.dataApontamento.slice(0, 4)) === ano)
      } else if (/^\d{4}$/.test(data)) {
        list = list.filter((r) => r.dataApontamento.startsWith(data))
      } else if (data === 'hoje') {
        const inicioHoje = new Date()
        inicioHoje.setHours(0, 0, 0, 0)
        list = list.filter((r) => new Date(r.dataApontamento + 'T00:00:00').getTime() >= inicioHoje.getTime())
      } else {
        const dias = data === '7d' ? 7 : 30
        const min = nowMs - dias * 86_400_000
        list = list.filter((r) => new Date(r.dataApontamento + 'T00:00:00').getTime() >= min)
      }
    }
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (r) =>
          r.defeito.toLowerCase().includes(q) ||
          r.veiculoLabel.toLowerCase().includes(q) ||
          r.prefixo.toLowerCase().includes(q) ||
          r.base.toLowerCase().includes(q) ||
          r.responsavel.toLowerCase().includes(q),
      )
    }
    return [...list].sort(
      (a, b) => new Date(a.dataApontamento).getTime() - new Date(b.dataApontamento).getTime(),
    )
  }, [rows, vehicleId, processo, base, coordenador, responsavel, prefixo, data, query])

  const sortedFiltered = useMemo(() => {
    let list = rowsMatchingFiltros
    if (visao === 'pendentes') list = list.filter((r) => !r.resolvido)
    if (visao === 'resolvidos') list = list.filter((r) => r.resolvido)
    return list
  }, [rowsMatchingFiltros, visao])

  const stats = useMemo(() => {
    const pendentes = rowsMatchingFiltros.filter((r) => !r.resolvido).length
    const resolvidos = rowsMatchingFiltros.filter((r) => r.resolvido).length
    const entrantes = rowsMatchingFiltros.filter((r) => isDefeitoEntrante(r, nowMs)).length
    return { total: rowsMatchingFiltros.length, pendentes, resolvidos, entrantes }
  }, [rowsMatchingFiltros, nowMs])

  const totalFiltrados = sortedFiltered.length
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrados / pageSize))
  const paginaEfetiva = Math.min(Math.max(1, pagina), totalPaginas)

  const paginaRows = useMemo(() => {
    const start = (paginaEfetiva - 1) * pageSize
    return sortedFiltered.slice(start, start + pageSize)
  }, [sortedFiltered, paginaEfetiva, pageSize])

  const irParaPagina = (p: number) => {
    const next = Math.min(Math.max(1, p), totalPaginas)
    setPagina(next)
    tabelaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const filtrosAtivos =
    vehicleId !== 'todos' ||
    processo !== 'todos' ||
    base !== 'todos' ||
    coordenador !== 'todos' ||
    responsavel !== 'todos' ||
    prefixo !== 'todos' ||
    data !== 'todos'

  const limparFiltros = () => {
    setVehicleId('todos')
    setProcesso('todos')
    setBase('todos')
    setCoordenador('todos')
    setResponsavel('todos')
    setPrefixo('todos')
    setData('todos')
    setPagina(1)
  }

  const prazoPassou = (prazoIso: string | null, resolvido: boolean) => {
    if (resolvido || !prazoIso) return false
    const t = new Date(prazoIso + 'T23:59:59').getTime()
    return nowMs > t
  }

  const [resolveOpen, setResolveOpen] = useState(false)
  const [resolveId, setResolveId] = useState<string | null>(null)
  const [resolveValor, setResolveValor] = useState<string>('')
  const [resolveData, setResolveData] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [resolveDescricao, setResolveDescricao] = useState<string>('')
  const [resolveImgs, setResolveImgs] = useState<string[]>([])
  const [resolveOsFile, setResolveOsFile] = useState<{ name: string; data: string } | null>(null)
  const [salvando, setSalvando] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const osFileRef = useRef<HTMLInputElement | null>(null)

  const currentResolve = useMemo(
    () => (resolveId ? rows.find((r) => r.id === resolveId) ?? null : null),
    [rows, resolveId],
  )

  const openResolveModal = (r: Apontamento) => {
    if (!canMarkResolved) return
    setResolveId(r.id)
    const digits = r.reparoValor != null ? String(Math.round(r.reparoValor * 100)) : ''
    setResolveValor(digits ? formatCurrency(digits) : '')
    setResolveData(r.dataResolvido ?? new Date().toISOString().slice(0, 10))
    setResolveDescricao(r.reparoDescricao ?? '')
    setResolveImgs(r.reparoImagens ?? [])
    setResolveOsFile(r.osArquivo ? { name: 'OS Anexada', data: r.osArquivo } : null)
    setResolveOpen(true)
  }

  const closeResolveModal = () => {
    setResolveOpen(false)
    setResolveId(null)
    setResolveValor('')
    setResolveData(new Date().toISOString().slice(0, 10))
    setResolveDescricao('')
    setResolveImgs([])
    setResolveOsFile(null)
    if (fileRef.current) fileRef.current.value = ''
    if (osFileRef.current) osFileRef.current.value = ''
  }

  const addOsFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    const reader = new FileReader()
    const data = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(new Error('Falha ao ler arquivo'))
      reader.readAsDataURL(file)
    })
    setResolveOsFile({ name: file.name, data })
    if (osFileRef.current) osFileRef.current.value = ''
  }

  const addImages = async (files: FileList | null) => {
    if (!files) return
    const remaining = Math.max(0, 3 - resolveImgs.length)
    const picked = Array.from(files).slice(0, remaining)
    const toDataUrl = (f: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result ?? ''))
        reader.onerror = () => reject(new Error('Falha ao ler imagem'))
        reader.readAsDataURL(f)
      })
    try {
      const urls = (await Promise.all(picked.map(toDataUrl))).filter(Boolean)
      setResolveImgs((prev) => [...prev, ...urls].slice(0, 3))
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const confirmResolve = async () => {
    if (!canMarkResolved || !resolveId) return
    setSalvando(true)
    const v = resolveValor.trim()
    const valor = v ? parseCurrency(v) : null
    const desc = resolveDescricao.trim()
    await marcarResolvido(resolveId, {
      valor: Number.isFinite(valor ?? NaN) ? valor : null,
      dataResolvido: resolveData || null,
      descricao: desc ? desc : null,
      imagens: resolveImgs,
      osArquivo: resolveOsFile?.data ?? null,
    })
    setSalvando(false)
    closeResolveModal()
  }

  useEffect(() => {
    if (!canMarkResolved && resolveOpen) {
      queueMicrotask(() => {
        setResolveOpen(false)
        setResolveId(null)
        setResolveValor('')
        setResolveData(new Date().toISOString().slice(0, 10))
        setResolveDescricao('')
        setResolveImgs([])
        setResolveOsFile(null)
        if (fileRef.current) fileRef.current.value = ''
        if (osFileRef.current) osFileRef.current.value = ''
      })
    }
  }, [canMarkResolved, resolveOpen])

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-900 text-white shadow-soft dark:bg-slate-100 dark:text-slate-900">
            <Settings2 size={18} />
          </div>
          <div>
            <div className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Gerenciar
            </div>
            <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Controle de defeitos e relatórios da frota.
            </div>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <Link
            to="/gerenciar/evolucao"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-900 shadow-soft hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900 sm:flex-initial"
          >
            <TrendingUp size={18} />
            Evolução
          </Link>
          <Link
            to="/gerenciar/historico"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-900 shadow-soft hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900 sm:flex-initial"
          >
            <History size={18} />
            Histórico
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatPill
          label="Checklists realizados"
          value={String(filtrosAtivos ? new Set(rowsMatchingFiltros.map((r) => r.checklistId)).size : checklistsRealizadosTotal)}
          icon={<ClipboardList size={18} />}
          tone="slate"
          selected={visao === 'apontamentos'}
          onClick={() => { setVisao('apontamentos'); setPagina(1) }}
        />
        <StatPill
          label="Pendentes"
          value={String(stats.pendentes)}
          icon={<AlertTriangle size={18} />}
          tone="rose"
          selected={visao === 'pendentes'}
          onClick={() => { setVisao('pendentes'); setPagina(1) }}
        />
        <StatPill
          label="Resolvidos"
          value={String(stats.resolvidos)}
          icon={<CheckCircle2 size={18} />}
          tone="emerald"
          selected={visao === 'resolvidos'}
          onClick={() => { setVisao('resolvidos'); setPagina(1) }}
        />
        <StatPill
          label="Defeitos entrantes"
          value={String(stats.entrantes)}
          icon={<Inbox size={18} />}
          tone="sky"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Filtros</span>
          <button
            type="button"
            onClick={() => setFiltrosVisiveis((v) => {
              const next = !v
              try { localStorage.setItem('frota.filtros.manage', String(next)) } catch { /* ignore */ }
              return next
            })}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-transparent px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-700 transition hover:bg-slate-100/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600/60 dark:text-slate-200 dark:hover:bg-white/5"
          >
            {filtrosVisiveis
              ? <><ChevronUp size={13} className="text-slate-400" /> Ocultar filtros</>
              : <><ChevronDown size={13} className="text-slate-400" /> Mostrar filtros</>
            }
          </button>
        </div>
        <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${filtrosVisiveis ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <div className="flex flex-col gap-3 p-4">
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7">
                <Select
                  label="Filtrar por veículo"
                  value={vehicleId}
                  options={vehicleOptions}
                  onChange={(v) => { setVehicleId(v); setPagina(1) }}
                />
                <Select
                  label="Processo"
                  value={processo}
                  options={PROCESSO_FILTER_SELECT_OPTIONS}
                  onChange={(v) => { setProcesso(v); setPagina(1) }}
                />
                <Select
                  label="Base"
                  value={base}
                  options={BASE_FILTER_SELECT_OPTIONS}
                  onChange={(v) => { setBase(v); setPagina(1) }}
                />
                <Select
                  label="Coordenador"
                  value={coordenador}
                  options={COORDENADOR_FILTER_SELECT_OPTIONS}
                  onChange={(v) => { setCoordenador(v); setPagina(1) }}
                />
                <Select
                  label="Responsável"
                  value={responsavel}
                  options={respOptions}
                  onChange={(v) => { setResponsavel(v); setPagina(1) }}
                />
                <Select
                  label="Prefixo"
                  value={prefixo}
                  options={prefixoOptions}
                  onChange={(v) => { setPrefixo(v); setPagina(1) }}
                />
                <Select label="Data" value={data} options={dataOpts} onChange={(v) => { setData(v); setPagina(1) }} />
              </div>
              <div className="flex items-end gap-3">
                <div className="min-w-0 flex-1">
                  <div className="whitespace-nowrap text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Buscar defeito ou veículo
                  </div>
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
                    <Search size={16} className="shrink-0 text-slate-400 dark:text-slate-500" />
                    <input
                      value={query}
                      onChange={(e) => { setQuery(e.target.value); setPagina(1) }}
                      placeholder="Texto do defeito, prefixo ou placa..."
                      className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={limparFiltros}
                  disabled={!filtrosAtivos}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 shadow-soft hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                  title="Limpar filtros"
                >
                  <RotateCcw size={18} aria-hidden />
                  Limpar
                </button>
              </div>
            </div>
          </div>
        </div>

        {carregando && (
          <div className="mt-4 flex items-center justify-center gap-2 py-10 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <Loader2 size={18} className="animate-spin" />
            Carregando apontamentos...
          </div>
        )}
        <div
          ref={tabelaRef}
          className={`mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 ${carregando ? 'hidden' : ''}`}
        >
          <table className="min-w-[1040px] w-full border-collapse text-center text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
                <th className="px-4 py-3 text-center">Veículo</th>
                <th className="px-4 py-3 text-center">Processo</th>
                <th className="px-4 py-3 text-center">Base</th>
                <th className="px-4 py-3 text-center">Coordenador</th>
                <th className="px-4 py-3 text-center">Defeito</th>
                <th className="px-4 py-3 text-center">Data de apontamento</th>
                <th className="px-4 py-3 text-center">Prazo</th>
                <th className="px-4 py-3 text-center">Resolvido ou não</th>
              </tr>
            </thead>
            <tbody className="font-semibold text-slate-800 dark:text-slate-200">
              {sortedFiltered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                    Nenhum registro para os filtros atuais.
                  </td>
                </tr>
              ) : (
                paginaRows.map((r) => {
                  const atrasado = prazoPassou(r.prazo, r.resolvido)
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 dark:border-slate-800/80 dark:hover:bg-slate-900/40"
                    >
                      <td className="align-middle px-4 py-3">
                        <span className="inline-flex flex-col items-center gap-1.5">
                          <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
                            <Truck size={14} />
                          </span>
                          <span className="font-mono text-xs tracking-tight">{r.veiculoLabel}</span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-middle text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex justify-center">
                          {r.checklistId
                            ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"><ClipboardList size={10} />Checklist NC</span>
                            : r.processo}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-middle text-xs text-slate-600 dark:text-slate-300">
                        {r.base}
                      </td>
                      <td className="max-w-[140px] px-4 py-3 align-middle text-xs text-slate-600 dark:text-slate-300">
                        <span className="mx-auto block max-w-full truncate">{r.coordenador}</span>
                      </td>
                      <td className="max-w-[220px] px-4 py-3 align-middle text-xs leading-snug sm:text-sm">
                        {formatDefeitoParaExibicao(r.defeito)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-middle text-xs sm:text-sm">
                        {formatDateBR(r.dataApontamento)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-middle text-xs sm:text-sm">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={atrasado ? 'font-black text-rose-600 dark:text-rose-400' : ''}>
                            {r.prazo ? formatDateBR(r.prazo) : '—'}
                          </span>
                          {atrasado ? (
                            <span className="text-[10px] font-extrabold uppercase text-rose-600 dark:text-rose-400">
                              Atrasado
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center justify-center gap-2">
                          {r.resolvido ? (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-extrabold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                              title="Resolvido"
                            >
                              <Check size={16} strokeWidth={3} className="text-emerald-600" aria-hidden />
                              Sim
                            </span>
                          ) : (
                            <>
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1.5 text-xs font-extrabold text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
                                title="Não resolvido"
                              >
                                <X size={14} strokeWidth={2.5} className="text-rose-600" aria-hidden />
                                Não
                              </span>
                              {canMarkResolved ? (
                                <button
                                  type="button"
                                  onClick={() => openResolveModal(r)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-emerald-500/60 bg-emerald-50 text-emerald-700 shadow-sm transition hover:bg-emerald-100 hover:ring-2 hover:ring-emerald-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60 dark:focus-visible:ring-offset-slate-950"
                                  title="Marcar como resolvido"
                                  aria-label={`Marcar defeito ${formatDefeitoParaExibicao(r.defeito).slice(0, 48)} do veículo ${r.prefixo} como resolvido`}
                                >
                                  <Check size={18} strokeWidth={3} aria-hidden />
                                </button>
                              ) : null}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {totalFiltrados === 0 ? (
              <>Nenhum registro com os filtros atuais.</>
            ) : (
              <>
                Mostrando{' '}
                <span className="font-extrabold text-slate-700 dark:text-slate-300">
                  {(paginaEfetiva - 1) * pageSize + 1}
                </span>
                {' — '}
                <span className="font-extrabold text-slate-700 dark:text-slate-300">
                  {Math.min(paginaEfetiva * pageSize, totalFiltrados)}
                </span>
                {' de '}
                <span className="font-extrabold text-slate-700 dark:text-slate-300">{totalFiltrados}</span>
                {' registro(s). Ordem: mais antigos primeiro na coluna '}
                <span className="font-extrabold">&quot;Data de apontamento&quot;</span>.
              </>
            )}
          </div>
          {totalFiltrados > 0 ? (
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <div className="w-[168px] shrink-0">
                <Select
                  label="Por página"
                  value={pageSizeStr}
                  options={PAGE_SIZE_OPTIONS}
                  onChange={(v) => { setPageSizeStr(v); setPagina(1) }}
                />
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => irParaPagina(paginaEfetiva - 1)}
                  disabled={paginaEfetiva <= 1}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={20} aria-hidden />
                </button>
                <span className="min-w-[7.5rem] px-2 text-center text-xs font-extrabold tabular-nums text-slate-600 dark:text-slate-300">
                  {paginaEfetiva} / {totalPaginas}
                </span>
                <button
                  type="button"
                  onClick={() => irParaPagina(paginaEfetiva + 1)}
                  disabled={paginaEfetiva >= totalPaginas}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  aria-label="Próxima página"
                >
                  <ChevronRight size={20} aria-hidden />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {resolveOpen && canMarkResolved ? (
        <Portal>
          <button
            type="button"
            className="fixed inset-0 z-[9998] bg-black/50"
            onPointerDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              closeResolveModal()
            }}
            aria-label="Fechar"
          />
          <div className="fixed inset-0 z-[9999] overflow-y-auto overscroll-contain">
            <div className="flex min-h-[100dvh] justify-center p-4 py-6 sm:items-center sm:py-8">
              <div
                className="my-auto flex w-full max-w-xl max-h-[min(100dvh-1.5rem,52rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-950"
                onPointerDown={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Finalizar reparo"
              >
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 pb-3 pt-4 dark:border-slate-800">
                <div className="min-w-0 pr-2">
                  <div className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
                    Marcar como resolvido
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {currentResolve ? (
                      <>
                        <span className="font-extrabold">{currentResolve.prefixo}</span> — {formatDefeitoParaExibicao(currentResolve.defeito)}
                      </>
                    ) : (
                      'Informe o valor e anexe evidências.'
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeResolveModal}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
              {/* Fotos da NC de origem (quando apontamento vem de checklist) */}
              {currentResolve?.ncFotos && currentResolve.ncFotos.length > 0 && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/50 dark:bg-rose-950/20">
                  <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-rose-500 dark:text-rose-400">
                    Foto(s) da não conformidade registrada no checklist
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {currentResolve.ncFotos.map((src, i) => (
                      <a
                        key={src}
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative h-24 w-24 overflow-hidden rounded-xl border-2 border-rose-200 bg-slate-100 shadow-sm transition hover:border-rose-400 dark:border-rose-800 dark:bg-slate-900"
                        title="Ver foto em tamanho real"
                      >
                        <img src={src} alt={`NC foto ${i + 1}`} className="h-full w-full object-cover transition group-hover:scale-105" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/25">
                          <ZoomIn size={18} className="text-white opacity-0 drop-shadow transition group-hover:opacity-100" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Data da resolução
                  </div>
                  <input
                    type="date"
                    value={resolveData}
                    onChange={(e) => setResolveData(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:[color-scheme:dark]"
                  />
                </div>

                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Valor gasto no reparo (R$)
                  </div>
                  <input
                    value={resolveValor}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '')
                      setResolveValor(digits ? formatCurrency(digits) : '')
                    }}
                    inputMode="numeric"
                    placeholder="0,00"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                  <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Imagens (máx. 3)
                  </div>
                  <div className="mt-1 flex gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => void addImages(e.target.files)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={resolveImgs.length >= 3}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      <Upload size={16} />
                      Anexar
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {resolveImgs.map((src, idx) => (
                      <div key={src} className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                        <img src={src} alt={`Anexo ${idx + 1}`} className="h-20 w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setResolveImgs((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75"
                          aria-label="Remover imagem"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-baseline gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Anexar
                    <span className="text-sky-600 dark:text-sky-400">OS</span>
                    <span className="text-[10px] font-semibold normal-case tracking-normal text-slate-400 dark:text-slate-500">
                      (Ordem de Serviço)
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      ref={osFileRef}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => void addOsFile(e.target.files)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => osFileRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      <Upload size={16} />
                      {resolveOsFile ? 'Substituir' : 'Anexar'}
                    </button>
                    {resolveOsFile ? (
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
                        <span className="min-w-0 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {resolveOsFile.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setResolveOsFile(null)
                            if (osFileRef.current) osFileRef.current.value = ''
                          }}
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 dark:bg-rose-950/40 dark:text-rose-400"
                          aria-label="Remover OS"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                        Arquivo ou imagem
                      </span>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Descrição do serviço
                  </div>
                  <textarea
                    value={resolveDescricao}
                    onChange={(e) => setResolveDescricao(e.target.value)}
                    rows={3}
                    className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                  <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  </div>
                </div>
              </div>
              </div>

              <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeResolveModal}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void confirmResolve()}
                  disabled={salvando}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-soft hover:bg-emerald-700 disabled:opacity-60"
                >
                  {salvando
                    ? <Loader2 size={18} className="animate-spin" />
                    : <Check size={18} strokeWidth={3} />}
                  {salvando ? 'Salvando...' : 'Confirmar resolvido'}
                </button>
              </div>
            </div>
          </div>
          </div>
        </Portal>
      ) : null}
    </div>
  )
}
