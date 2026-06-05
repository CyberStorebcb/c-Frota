import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  ExternalLink,
  History,
  Inbox,
  Loader2,
  TrendingUp,
  RefreshCw,
  Upload,
  Settings2,
  Truck,
  Trophy,
  X,
  ZoomIn,
  MessageSquareWarning,
  Image as ImageIcon,
} from 'lucide-react'
import type { Apontamento, PeriodoCarregado } from '../apontamentos/ApontamentosContext'
import { useApontamentos } from '../apontamentos/ApontamentosContext'
import { formatDefeitoParaExibicao } from '../apontamentos/defeitoExibicao'
import {
  buildManageTableRows,
  findRecorrenteSiblingIds,
  apontamentoGroupKey,
  type ApontamentoGroup,
} from '../apontamentos/groupApontamentos'
import {
  downloadAgendaScreenshot,
  generateAgendaScreenshot,
} from '../apontamentos/generateAgendaScreenshot'
import {
  downloadResolvidosScreenshot,
  generateResolvidosScreenshot,
} from '../apontamentos/generateResolvidosScreenshot'
import { useAuth } from '../auth/AuthContext'
import { hasPermission } from '../auth/permissions'
import { BASE_FILTER_SELECT_OPTIONS, matchesBaseFilter } from '../data/baseFilterOptions'
import { COORDENADOR_FILTER_SELECT_OPTIONS, matchesCoordenadorFilter } from '../data/coordenadorFilterOptions'
import { SUPERVISOR_FILTER_SELECT_OPTIONS, matchesSupervisorFilter } from '../data/supervisorFilterOptions'
import { RESPONSAVEL_FILTER_SELECT_OPTIONS, matchesResponsavelFilter } from '../data/responsavelFilterOptions'
import { Select, type SelectOption } from '../components/ui/Select'
import { FilterPanel, FilterPanelGroup, FilterSearchField } from '../components/ui/FilterPanel'
import { Portal } from '../components/ui/Portal'
import {
  apontamentoMatchesVehicleFilter,
  formatPlaca,
  normalizePlaca,
  placaFromApontamentoVeiculoId,
} from '../frota/vehicleRegistry'
import { uploadChecklistEvidenceFile } from '../lib/checklistEvidenceUpload'

/** Extrai o primeiro nome do email: "claudio.ferreira@cgb..." → "CLAUDIO" */
function primeiroNomeDoEmail(email: string): string {
  const local = email.split('@')[0] ?? ''
  const parte = local.split('.')[0] ?? local
  return parte.toUpperCase()
}

const LOADING_MESSAGES = [
  'Acessando os dados, aguarde...',
  'Buscando checklists do período...',
  'Carregando apontamentos da frota...',
  'Processando defeitos registrados...',
  'Organizando dados por veículo...',
  'Verificando resoluções pendentes...',
  'Quase lá, preparando a tabela...',
]

function LoadingApontamentos() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setIdx((i) => (i + 1) % LOADING_MESSAGES.length), 2500)
    return () => window.clearInterval(id)
  }, [])
  return (
    <div className="mt-4 flex flex-col items-center justify-center gap-3 py-12">
      <Loader2 size={28} className="animate-spin text-brand-500 dark:text-brand-400" />
      <p
        key={idx}
        className="animate-fade-in text-sm font-semibold text-slate-500 dark:text-slate-400"
        style={{ animation: 'fadeIn 0.4s ease' }}
      >
        {LOADING_MESSAGES[idx]}
      </p>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}

function AgendaDetalheCampo({ label, value }: { label: string; value: string | null | undefined }) {
  const text = value?.trim()
  if (!text || text === '—' || text === 'N/A' || text === 'NÃO ATRIBUÍDO') return null
  return (
    <div>
      <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-xs font-semibold leading-snug text-slate-700 dark:text-slate-200">{text}</dd>
    </div>
  )
}

function formatDateBR(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function isApontamentoHoje(dataApontamento: string, nowMs: number) {
  const d = new Date(nowMs)
  const hoje = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return dataApontamento.slice(0, 10) === hoje
}

/** Defeito novo do dia: apontado hoje e ainda não resolvido. */
function isDefeitoEntrante(r: Apontamento, nowMs: number) {
  if (r.resolvido) return false
  return isApontamentoHoje(r.dataApontamento, nowMs)
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

function DefeitoSeveridadeIcon({ imperativo, size = 14 }: { imperativo: boolean; size?: number }) {
  if (imperativo) {
    return (
      <span
        title="Impeditivo — impede condução do veículo"
        className="inline-flex shrink-0 leading-none select-none"
        style={{ fontSize: size }}
        aria-hidden
      >
        🚫
      </span>
    )
  }
  return (
    <span title="Não impeditivo — precisa de atenção" className="inline-flex shrink-0">
      <AlertCircle size={size} className="text-amber-600 dark:text-amber-400" aria-hidden />
    </span>
  )
}



const PAGE_SIZE_OPTIONS: SelectOption[] = [
  { value: '25', label: '25 por página' },
  { value: '50', label: '50 por página' },
  { value: '100', label: '100 por página' },
]

const PERIODO_CARREGADO_OPTIONS: SelectOption[] = [
  { value: '180d', label: 'Últimos 6 meses' },
  { value: '1a',   label: 'Último 1 ano' },
  { value: '2a',   label: 'Últimos 2 anos' },
  { value: 'tudo', label: 'Histórico completo' },
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
  const { rows, carregando, marcarResolvido, marcarJustificado, fetchApontamentoDetalhes, checklistsRealizadosTotal, periodoCarregado, setPeriodoCarregado, recarregar } = useApontamentos()
  const { user } = useAuth()
  const canMarkResolved = hasPermission(user, 'resolve_apontamentos')
  const canJustify = user?.canJustify ?? false
  const [searchParams, setSearchParams] = useSearchParams()

  const lsGet = (k: string, fb: string) => { try { return localStorage.getItem(k) ?? fb } catch { return fb } }
  const lsSet = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* noop */ } }
  const [visao, setVisao] = useState<'apontamentos' | 'pendentes' | 'resolvidos' | 'entrantes'>(
    () => (lsGet('frota.manage.visao', 'apontamentos') as 'apontamentos' | 'pendentes' | 'resolvidos' | 'entrantes')
  )
  const [severidade, setSeveridade] = useState<'todos' | 'imperativo' | 'atencao'>(
    () => (lsGet('frota.manage.severidade', 'todos') as 'todos' | 'imperativo' | 'atencao')
  )
  const [vehicleId, setVehicleId] = useState(() => searchParams.get('veiculo') ?? 'todos')
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(() => {
    if (searchParams.get('veiculo')) return true
    try { return localStorage.getItem('frota.filtros.manage') === 'true' }
    catch { return false }
  })
  const [query, setQuery] = useState('')
  const [base, setBase] = useState(() => lsGet('frota.manage.base', 'todos'))
  const [coordenador, setCoordenador] = useState(() => lsGet('frota.manage.coordenador', 'todos'))
  const [responsavel, setResponsavel] = useState(() => lsGet('frota.manage.responsavel', 'todos'))
  const [supervisor, setSupervisor] = useState(() => lsGet('frota.manage.supervisor', 'todos'))
  const [prefixo, setPrefixo] = useState(() => lsGet('frota.manage.prefixo', 'todos'))
  const [data, setData] = useState(() => lsGet('frota.manage.data', 'todos'))
  const [dataCustomDe, setDataCustomDe] = useState(() => lsGet('frota.manage.dataCustomDe', ''))
  const [dataCustomAte, setDataCustomAte] = useState(() => lsGet('frota.manage.dataCustomAte', ''))
  const [pagina, setPagina] = useState(1)
  const [dataOrdem, setDataOrdem] = useState<'asc' | 'desc'>(
    () => (lsGet('frota.manage.dataOrdem', 'asc') as 'asc' | 'desc')
  )
  const [pageSizeStr, setPageSizeStr] = useState(() => lsGet('frota.manage.pageSize', '25'))
  const pageSize = Number(pageSizeStr) || 25
  const [historyGroup, setHistoryGroup] = useState<ApontamentoGroup | null>(null)
  const [detailApontamento, setDetailApontamento] = useState<Apontamento | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const tabelaRef = useRef<HTMLDivElement | null>(null)
  const lastModalCloseRef = useRef<number>(0)
  const syncedVehicleFromUrlRef = useRef<string | null>(null)
  const urlPlaca = searchParams.get('placa')
  const urlPrefixo = searchParams.get('prefixo')
  const urlChecklist = searchParams.get('checklist')

  useEffect(() => {
    try {
      localStorage.setItem('frota.manage.visao', visao)
      localStorage.setItem('frota.manage.severidade', severidade)
      localStorage.setItem('frota.manage.base', base)
      localStorage.setItem('frota.manage.coordenador', coordenador)
      localStorage.setItem('frota.manage.responsavel', responsavel)
      localStorage.setItem('frota.manage.supervisor', supervisor)
      localStorage.setItem('frota.manage.prefixo', prefixo)
      localStorage.setItem('frota.manage.data', data)
      localStorage.setItem('frota.manage.dataOrdem', dataOrdem)
      localStorage.setItem('frota.manage.pageSize', pageSizeStr)
    } catch { /* ignore */ }
  }, [visao, severidade, base, coordenador, responsavel, supervisor, prefixo, data, dataOrdem, pageSizeStr])

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const veiculo = searchParams.get('veiculo')
    const placa = searchParams.get('placa')
    if (!veiculo && !placa) return
    if (veiculo) setVehicleId(veiculo)
    setFiltrosVisiveis(true)
    setPagina(1)
  }, [searchParams])

  /** Alinha o select ao veiculoId real dos apontamentos quando a URL traz placa. */
  useEffect(() => {
    if (!urlPlaca || rows.length === 0) return
    const placaNorm = normalizePlaca(urlPlaca)
    if (syncedVehicleFromUrlRef.current === placaNorm) return
    const match = rows.find(
      (r) => normalizePlaca(r.placa ?? placaFromApontamentoVeiculoId(r.veiculoId)) === placaNorm,
    )
    if (match) {
      setVehicleId(match.veiculoId)
      syncedVehicleFromUrlRef.current = placaNorm
    }
  }, [rows, urlPlaca])

  useEffect(() => {
    if (!urlPlaca) syncedVehicleFromUrlRef.current = null
  }, [urlPlaca])

  const vehicleFilter = useMemo(
    () => ({
      vehicleId,
      placa: urlPlaca,
      prefixo: urlPrefixo,
    }),
    [vehicleId, urlPlaca, urlPrefixo],
  )

  const vehicleOptions = useMemo<SelectOption[]>(() => {
    const map = new Map<string, string>()
    for (const r of rows) {
      if (!map.has(r.veiculoId)) map.set(r.veiculoId, r.veiculoLabel)
    }
    const veiculoUrl = searchParams.get('veiculo')
    const rotuloUrl = searchParams.get('rotulo')
    if (urlPlaca) {
      const placaNorm = normalizePlaca(urlPlaca)
      const match = rows.find(
        (r) => normalizePlaca(r.placa ?? placaFromApontamentoVeiculoId(r.veiculoId)) === placaNorm,
      )
      if (match) {
        map.set(match.veiculoId, match.veiculoLabel)
      } else if (veiculoUrl && veiculoUrl !== 'todos') {
        map.set(veiculoUrl, rotuloUrl?.trim() || veiculoUrl)
      }
    } else if (veiculoUrl && veiculoUrl !== 'todos' && !map.has(veiculoUrl)) {
      map.set(veiculoUrl, rotuloUrl?.trim() || veiculoUrl)
    }
    const opts = Array.from(map.entries()).map(([value, label]) => ({ value, label }))
    opts.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
    return [{ value: 'todos', label: 'Todos os veículos' }, ...opts]
  }, [rows, searchParams, urlPlaca])


  const dataOpts = useMemo<SelectOption[]>(() => {
    const anoAtual = String(new Date().getFullYear())
    const anos = [...new Set(rows.map((r) => r.dataApontamento.slice(0, 4)).filter(Boolean))]
      .filter((a) => a !== anoAtual)
      .sort((a, b) => Number(b) - Number(a))
    return [
      { value: 'todos', label: 'Todos' },
      { value: 'hoje', label: 'Hoje' },
      { value: '7d', label: 'Últimos 7 dias' },
      { value: '30d', label: 'Últimos 30 dias' },
      { value: 'ano', label: `Ano atual (${anoAtual})` },
      { value: 'custom', label: 'Intervalo personalizado' },
      ...anos.map((a) => ({ value: a, label: a })),
    ]
  }, [rows])

  /** Filtros da página (veículo, data, busca, etc.) sem recorte por visão Pendentes/Resolvidos — usado nos KPIs e como base da tabela. */
  const rowsMatchingFiltros = useMemo(() => {
    let list = rows
    if (urlChecklist) list = list.filter((r) => r.checklistId === urlChecklist)
    if (vehicleId !== 'todos') list = list.filter((r) => apontamentoMatchesVehicleFilter(r, vehicleFilter))
    if (base !== 'todos') list = list.filter((r) => matchesBaseFilter(r.base, base))
    if (coordenador !== 'todos') list = list.filter((r) => matchesCoordenadorFilter(r.coordenador, coordenador))
    if (responsavel !== 'todos') list = list.filter((r) => matchesResponsavelFilter(r.responsavel, responsavel))
    if (supervisor !== 'todos') list = list.filter((r) => matchesSupervisorFilter(r.supervisor, supervisor))
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
      } else if (data === 'custom') {
        const de = dataCustomDe.trim()
        const ate = dataCustomAte.trim()
        if (de) list = list.filter((r) => r.dataApontamento >= de)
        if (ate) list = list.filter((r) => r.dataApontamento <= ate)
      } else {
        const dias = data === '7d' ? 7 : 30
        const min = nowMs - dias * 86_400_000
        list = list.filter((r) => new Date(r.dataApontamento + 'T00:00:00').getTime() >= min)
      }
    }
    const q = query.trim().toLowerCase()
    if (q) {
      const qNorm = q.replace(/[-\s]/g, '')
      list = list.filter((r) => {
        const labelNorm = r.veiculoLabel.toLowerCase().replace(/[-\s]/g, '')
        return (
          r.defeito.toLowerCase().includes(q) ||
          r.veiculoLabel.toLowerCase().includes(q) ||
          labelNorm.includes(qNorm) ||
          r.prefixo.toLowerCase().includes(q) ||
          r.base.toLowerCase().includes(q) ||
          r.responsavel.toLowerCase().includes(q)
        )
      })
    }
    const dir = dataOrdem === 'asc' ? 1 : -1
    return [...list].sort(
      (a, b) =>
        dir * (new Date(a.dataApontamento).getTime() - new Date(b.dataApontamento).getTime()),
    )
  }, [rows, vehicleFilter, base, coordenador, responsavel, supervisor, prefixo, data, query, dataOrdem, urlChecklist])

  const sortedFiltered = useMemo(() => {
    let list = rowsMatchingFiltros
    if (visao === 'pendentes') list = list.filter((r) => !r.resolvido)
    if (visao === 'resolvidos') list = list.filter((r) => r.resolvido)
    if (visao === 'entrantes') list = list.filter((r) => isDefeitoEntrante(r, nowMs))
    if (severidade === 'imperativo') list = list.filter((r) => r.imperativo)
    if (severidade === 'atencao') list = list.filter((r) => !r.imperativo)
    return list
  }, [rowsMatchingFiltros, visao, severidade])

  const stats = useMemo(() => {
    const pendentesUnicas = new Set(
      rowsMatchingFiltros
        .filter((r) => !r.resolvido)
        .map((r) => apontamentoGroupKey(r) ?? r.id),
    ).size
    const pendentes = pendentesUnicas
    const resolvidos = rowsMatchingFiltros.filter((r) => r.resolvido).length
    const entrantes = rowsMatchingFiltros.filter((r) => isDefeitoEntrante(r, nowMs)).length
    return { total: rowsMatchingFiltros.length, pendentes, resolvidos, entrantes }
  }, [rowsMatchingFiltros, nowMs])

  const severidadeStats = useMemo(() => {
    // Severidade sempre opera sobre pendentes — mesmo critério do card PENDENTES.
    const pendentes = rowsMatchingFiltros.filter((r) => !r.resolvido)
    const seen = new Set<string>()
    const representantes: typeof pendentes = []
    for (const r of pendentes) {
      const key = apontamentoGroupKey(r) ?? r.id
      if (!seen.has(key)) { seen.add(key); representantes.push(r) }
    }
    return {
      total: representantes.length,
      imperativos: representantes.filter((r) => r.imperativo).length,
      atencao: representantes.filter((r) => !r.imperativo).length,
    }
  }, [rowsMatchingFiltros])

  const tableRowsAll = useMemo(
    () => buildManageTableRows(sortedFiltered, true, dataOrdem),
    [sortedFiltered, dataOrdem],
  )

  const totalFiltrados = tableRowsAll.length
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrados / pageSize))
  const paginaEfetiva = Math.min(Math.max(1, pagina), totalPaginas)

  const paginaRows = useMemo(() => {
    const start = (paginaEfetiva - 1) * pageSize
    return tableRowsAll.slice(start, start + pageSize)
  }, [tableRowsAll, paginaEfetiva, pageSize])

  const irParaPagina = (p: number) => {
    const next = Math.min(Math.max(1, p), totalPaginas)
    setPagina(next)
    tabelaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const irParaPlacaNaTabela = (placa: string) => {
    setAgendaOpen(false)
    setQuery(placa)
    setPagina(1)
    setTimeout(() => tabelaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const filtrosAtivos =
    vehicleId !== 'todos' ||
    base !== 'todos' ||
    coordenador !== 'todos' ||
    responsavel !== 'todos' ||
    supervisor !== 'todos' ||
    prefixo !== 'todos' ||
    data !== 'todos' ||
    query.trim().length > 0

  const filtrosAtivosCount = useMemo(() => {
    let n = 0
    if (vehicleId !== 'todos') n += 1
    if (base !== 'todos') n += 1
    if (coordenador !== 'todos') n += 1
    if (responsavel !== 'todos') n += 1
    if (supervisor !== 'todos') n += 1
    if (data !== 'todos') n += 1
    if (query.trim().length > 0) n += 1
    return n
  }, [vehicleId, base, coordenador, responsavel, supervisor, data, query])

  const filtrosResumo = useMemo(() => {
    const parts: string[] = []
    if (data !== 'todos') {
      const label = dataOpts.find((o) => o.value === data)?.label ?? data
      parts.push(label)
    }
    if (query.trim()) parts.push(`busca "${query.trim()}"`)
    return parts.join(' · ') || undefined
  }, [data, dataOpts, query])

  const limparFiltros = () => {
    setVehicleId('todos')
    setBase('todos')
    setCoordenador('todos')
    setResponsavel('todos')
    setSupervisor('todos')
    setPrefixo('todos')
    setData('todos')
    setDataCustomDe('')
    setDataCustomAte('')
    setQuery('')
    setPagina(1)
    if (searchParams.get('veiculo') || searchParams.get('placa') || searchParams.get('prefixo')) {
      const next = new URLSearchParams(searchParams)
      next.delete('veiculo')
      next.delete('rotulo')
      next.delete('placa')
      next.delete('prefixo')
      setSearchParams(next, { replace: true })
    }
  }

  const prazoPassou = (prazoIso: string | null, resolvido: boolean) => {
    if (resolvido || !prazoIso) return false
    const t = new Date(prazoIso + 'T23:59:59').getTime()
    return nowMs > t
  }

  const [resolveOpen, setResolveOpen] = useState(false)
  const [resolveId, setResolveId] = useState<string | null>(null)
  const [resolveGroupIds, setResolveGroupIds] = useState<string[] | null>(null)
  const [resolveValor, setResolveValor] = useState<string>('')
  const [resolveData, setResolveData] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [resolveDescricao, setResolveDescricao] = useState<string>('')
  const [resolveImgs, setResolveImgs] = useState<string[]>([])
  const [resolveOsFile, setResolveOsFile] = useState<{ name: string; data: string } | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [uploadingImgs, setUploadingImgs] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const osFileRef = useRef<HTMLInputElement | null>(null)

  // ── Modal de Agenda ───────────────────────────────────────────────────────
  const [agendaOpen, setAgendaOpen] = useState(false)
  const [agendaExpandedId, setAgendaExpandedId] = useState<string | null>(null)
  const [capturandoAgendaFoto, setCapturandoAgendaFoto] = useState(false)
  const [capturandoResolvidosFoto, setCapturandoResolvidosFoto] = useState(false)

  const agendados = useMemo(() =>
    rows
      .filter((r) => !r.resolvido && r.agendamentoData)
      .sort((a, b) => (a.agendamentoData! > b.agendamentoData! ? 1 : -1)),
    [rows],
  )

  const exportarAgendaFoto = async () => {
    setCapturandoAgendaFoto(true)
    try {
      const dataUrl = generateAgendaScreenshot({
        items: agendados.map((r) => ({
          id: r.id,
          placa: r.placa,
          prefixo: r.prefixo,
          modelo: r.modelo,
          processo: r.processo,
          base: r.base,
          responsavel: r.responsavel,
          supervisor: r.supervisor,
          coordenador: r.coordenador,
          veiculoLabel: r.veiculoLabel,
          defeito: r.defeito,
          agendamentoData: r.agendamentoData!,
          justificativa: r.justificativa,
          imperativo: r.imperativo,
        })),
      })
      const iso = new Date().toISOString().slice(0, 10)
      downloadAgendaScreenshot(dataUrl, `agenda-correcoes-${iso}.png`)
    } finally {
      setCapturandoAgendaFoto(false)
    }
  }

  const exportarResolvidosFoto = async () => {
    if (capturandoResolvidosFoto) return
    setCapturandoResolvidosFoto(true)
    try {
      // Pega os resolvidos filtrados (mesmos critérios da tabela atual)
      const resolvidos = sortedFiltered.filter((r) => r.resolvido)
      const filtros: { label: string; valor: string }[] = []
      if (base !== 'todos') filtros.push({ label: 'Base', valor: base })
      if (coordenador !== 'todos') filtros.push({ label: 'Gerência', valor: coordenador })
      if (responsavel !== 'todos') filtros.push({ label: 'Responsável', valor: responsavel })
      if (supervisor !== 'todos') filtros.push({ label: 'Supervisor', valor: supervisor })
      if (prefixo !== 'todos') filtros.push({ label: 'Prefixo', valor: prefixo })
      if (data !== 'todos') filtros.push({ label: 'Período', valor: data })

      const periodoLabel = (() => {
        const opt = PERIODO_CARREGADO_OPTIONS.find((o) => o.value === periodoCarregado)
        return opt?.label ?? 'Histórico'
      })()

      const dataUrl = generateResolvidosScreenshot({
        items: resolvidos.map((r) => ({
          veiculoLabel: r.veiculoLabel,
          defeito: r.defeito,
          base: r.base,
          coordenador: r.coordenador,
          responsavel: r.responsavel,
          dataApontamento: r.dataApontamento,
          dataResolvido: r.dataResolvido,
          reparoValor: r.reparoValor,
          reparoDescricao: r.reparoDescricao,
          imperativo: r.imperativo,
        })),
        periodoLabel,
        filtros: filtros.length > 0 ? filtros : undefined,
      })
      const iso = new Date().toISOString().slice(0, 10)
      downloadResolvidosScreenshot(dataUrl, `defeitos-resolvidos-${iso}.png`)
    } finally {
      setCapturandoResolvidosFoto(false)
    }
  }

  // ── Modal de Justificativa ────────────────────────────────────────────────
  const [justOpen, setJustOpen] = useState(false)
  const [justId, setJustId] = useState<string | null>(null)
  const [justData, setJustData] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [justTexto, setJustTexto] = useState<string>('')
  const [justImagem, setJustImagem] = useState<string | null>(null)
  const [justAgendamento, setJustAgendamento] = useState<string>('')
  const [salvandoJust, setSalvandoJust] = useState(false)
  const [uploadingJust, setUploadingJust] = useState(false)
  const justImgRef = useRef<HTMLInputElement | null>(null)

  const openJustModal = (r: Apontamento) => {
    if (!canJustify) return
    setJustId(r.id)
    setJustData(r.justificativaData ?? new Date().toISOString().slice(0, 10))
    setJustTexto(r.justificativa ?? '')
    setJustImagem(null)
    setJustAgendamento(r.agendamentoData ?? '')
    setJustOpen(true)
    // Busca imagem de justificativa sob demanda
    void fetchApontamentoDetalhes(r.id).then((detalhes) => {
      setJustImagem(detalhes.justificativaImagem)
    })
  }

  const closeJustModal = () => {
    lastModalCloseRef.current = Date.now()
    setJustOpen(false)
    setJustId(null)
    setJustData(new Date().toISOString().slice(0, 10))
    setJustTexto('')
    setJustImagem(null)
    setJustAgendamento('')
    if (justImgRef.current) justImgRef.current.value = ''
  }

  const addJustImagem = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]!
    setUploadingJust(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const key = `justificativa/${crypto.randomUUID()}.${ext}`
      const url = await uploadChecklistEvidenceFile(file, key)
      if (url) {
        setJustImagem(url)
      } else {
        // fallback base64 se upload falhar
        const reader = new FileReader()
        reader.onload = () => setJustImagem(String(reader.result ?? ''))
        reader.readAsDataURL(file)
      }
    } finally {
      setUploadingJust(false)
      if (justImgRef.current) justImgRef.current.value = ''
    }
  }

  const confirmJust = async () => {
    if (!canJustify || !justId || !justTexto.trim()) return
    setSalvandoJust(true)
    await marcarJustificado(
      justId,
      { justificativa: justTexto.trim(), data: justData, imagem: justImagem, agendamentoData: justAgendamento || null },
      user?.email ?? 'desconhecido',
    )
    setSalvandoJust(false)
    closeJustModal()
  }

  const currentResolve = useMemo(
    () => (resolveId ? rows.find((r) => r.id === resolveId) ?? null : null),
    [rows, resolveId],
  )

  const openResolveModal = (r: Apontamento, groupIds?: string[]) => {
    if (!canMarkResolved) return
    const ids = groupIds?.length ? groupIds : findRecorrenteSiblingIds(rows, r.id)
    setResolveId(r.id)
    setResolveGroupIds(ids.length > 1 ? ids : null)
    const digits = r.reparoValor != null ? String(Math.round(r.reparoValor * 100)) : ''
    setResolveValor(digits ? formatCurrency(digits) : '')
    setResolveData(r.dataResolvido ?? new Date().toISOString().slice(0, 10))
    setResolveDescricao(r.reparoDescricao ?? '')
    setResolveImgs([])
    setResolveOsFile(null)
    setResolveOpen(true)
    // Busca imagens e OS sob demanda (não ficam na query principal para evitar egress)
    void fetchApontamentoDetalhes(r.id).then((detalhes) => {
      setResolveImgs(detalhes.reparoImagens)
      setResolveOsFile(detalhes.osArquivo ? { name: 'OS Anexada', data: detalhes.osArquivo } : null)
    })
  }

  const closeResolveModal = () => {
    lastModalCloseRef.current = Date.now()
    setResolveOpen(false)
    setResolveId(null)
    setResolveGroupIds(null)
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
    const file = files[0]!
    setUploadingImgs(true)
    try {
      const ext = file.name.split('.').pop() ?? 'pdf'
      const key = `os/${crypto.randomUUID()}.${ext}`
      const url = await uploadChecklistEvidenceFile(file, key)
      if (url) {
        setResolveOsFile({ name: file.name, data: url })
      } else {
        // fallback base64 se upload falhar
        const reader = new FileReader()
        const data = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(String(reader.result ?? ''))
          reader.onerror = () => reject(new Error('Falha ao ler arquivo'))
          reader.readAsDataURL(file)
        })
        setResolveOsFile({ name: file.name, data })
      }
    } finally {
      setUploadingImgs(false)
      if (osFileRef.current) osFileRef.current.value = ''
    }
  }

  const addImages = async (files: FileList | null) => {
    if (!files) return
    const remaining = Math.max(0, 3 - resolveImgs.length)
    const picked = Array.from(files).slice(0, remaining)
    if (picked.length === 0) return
    setUploadingImgs(true)
    try {
      const urls = await Promise.all(
        picked.map(async (file) => {
          const ext = file.name.split('.').pop() ?? 'jpg'
          const key = `reparo/${crypto.randomUUID()}.${ext}`
          const url = await uploadChecklistEvidenceFile(file, key)
          if (url) return url
          // fallback base64 se upload falhar
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result ?? ''))
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
        })
      )
      setResolveImgs((prev) => [...prev, ...urls.filter(Boolean)].slice(0, 3))
    } finally {
      setUploadingImgs(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const confirmResolve = async () => {
    if (!canMarkResolved || !resolveId) return
    setSalvando(true)
    const v = resolveValor.trim()
    const valor = v ? parseCurrency(v) : null
    const desc = resolveDescricao.trim()
    const payload = {
      valor: Number.isFinite(valor ?? NaN) ? valor : null,
      dataResolvido: resolveData || null,
      descricao: desc ? desc : null,
      imagens: resolveImgs,
      osArquivo: resolveOsFile?.data ?? null,
    }
    const ids = resolveGroupIds?.length ? resolveGroupIds : [resolveId]
    for (const id of ids) {
      const isPrimary = id === resolveId
      await marcarResolvido(
        id,
        isPrimary
          ? payload
          : {
              valor: null,
              descricao: null,
              imagens: [],
              osArquivo: null,
              dataResolvido: payload.dataResolvido,
            },
        user?.email ?? undefined,
      )
    }
    setSalvando(false)
    closeResolveModal()
    setHistoryGroup(null)
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

  // Carrega reparoImagens sob demanda quando o modal de detalhe é aberto
  useEffect(() => {
    if (!detailApontamento?.id) return
    const id = detailApontamento.id
    void fetchApontamentoDetalhes(id).then((detalhes) => {
      if (!detalhes.reparoImagens.length) return
      setDetailApontamento((prev) =>
        prev?.id === id ? { ...prev, reparoImagens: detalhes.reparoImagens } : prev,
      )
    })
  }, [detailApontamento?.id, fetchApontamentoDetalhes])

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
          {visao === 'resolvidos' && (
            <button
              type="button"
              onClick={exportarResolvidosFoto}
              disabled={capturandoResolvidosFoto}
              className="group relative inline-flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl border border-emerald-400/60 bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-soft transition-all hover:from-emerald-600 hover:to-teal-700 hover:shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-70 sm:flex-initial"
              title="Capturar foto dos defeitos resolvidos"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" aria-hidden />
              {capturandoResolvidosFoto ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
              {capturandoResolvidosFoto ? 'Gerando…' : 'Capturar foto'}
            </button>
          )}
          <button
            type="button"
            onClick={() => recarregar()}
            disabled={carregando}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-900 shadow-soft hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900 sm:flex-initial"
            title="Atualizar dados"
          >
            <RefreshCw size={18} className={carregando ? 'animate-spin' : ''} />
            Atualizar
          </button>
          <Link
            to="/gerenciar/ranking"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-extrabold text-emerald-800 shadow-soft hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/60 sm:flex-initial"
          >
            <Trophy size={18} />
            Ranking
          </Link>
          <Link
            to="/gerenciar/evolucao"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-900 shadow-soft hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900 sm:flex-initial"
          >
            <TrendingUp size={18} />
            Evolução
          </Link>
          <button
            type="button"
            onClick={() => setAgendaOpen(true)}
            className="relative inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-900 shadow-soft hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900 sm:flex-initial"
          >
            <CalendarClock size={18} />
            Agenda
            {agendados.length > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-extrabold text-white">
                {agendados.length}
              </span>
            )}
          </button>
          <Link
            to="/gerenciar/historico"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-900 shadow-soft hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900 sm:flex-initial"
          >
            <History size={18} />
            Histórico
          </Link>
        </div>
      </div>

      <div data-tour="manage-stats" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          selected={visao === 'entrantes'}
          onClick={() => {
            setVisao('entrantes')
            setDataOrdem('desc')
            setPagina(1)
            tabelaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        />
      </div>

      <FilterPanel
        visible={filtrosVisiveis}
        onVisibleChange={(visible) => {
          setFiltrosVisiveis(visible)
          try { localStorage.setItem('frota.filtros.manage', String(visible)) } catch { /* ignore */ }
        }}
        activeCount={filtrosAtivosCount}
        onClear={limparFiltros}
        summary={filtrosResumo}
        toggleButtonProps={{ id: 'manage-toggle-filtros', 'data-tour': 'manage-filtros-btn', 'aria-controls': 'manage-filtros-panel' }}
        contentProps={{ id: 'manage-filtros-panel', 'data-tour': 'manage-filtros' }}
      >
        <FilterPanelGroup title="Período e busca" columns="lg:grid-cols-[minmax(180px,0.7fr)_minmax(180px,0.7fr)_minmax(0,1fr)]">
          <Select label="Data do apontamento" value={data} options={dataOpts} onChange={(v) => { setData(v); setPagina(1) }} tone="dark" />
          <Select
            label="Período carregado"
            value={periodoCarregado}
            options={PERIODO_CARREGADO_OPTIONS}
            onChange={(v) => {
              setPeriodoCarregado(v as PeriodoCarregado)
              void recarregar()
              setPagina(1)
            }}
            tone="dark"
          />
          <FilterSearchField
            value={query}
            onChange={(v) => { setQuery(v); setPagina(1) }}
            placeholder="Texto do defeito, prefixo ou placa..."
          />
          {data === 'custom' ? (
            <div className="col-span-full grid gap-3 border-t border-slate-100 pt-3 dark:border-slate-800 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">De</label>
                <input
                  type="date"
                  value={dataCustomDe}
                  onChange={(e) => { setDataCustomDe(e.target.value); lsSet('frota.manage.dataCustomDe', e.target.value); setPagina(1) }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Até</label>
                <input
                  type="date"
                  value={dataCustomAte}
                  onChange={(e) => { setDataCustomAte(e.target.value); lsSet('frota.manage.dataCustomAte', e.target.value); setPagina(1) }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                />
              </div>
            </div>
          ) : null}
        </FilterPanelGroup>

        <FilterPanelGroup title="Gestão e veículo" columns="sm:grid-cols-2 lg:grid-cols-5">
          <Select label="Gerência" value={coordenador} options={COORDENADOR_FILTER_SELECT_OPTIONS} onChange={(v) => { setCoordenador(v); setPagina(1) }} tone="dark" />
          <Select label="Responsável" value={responsavel} options={RESPONSAVEL_FILTER_SELECT_OPTIONS} onChange={(v) => { setResponsavel(v); setPagina(1) }} tone="dark" />
          <Select label="Supervisor" value={supervisor} options={SUPERVISOR_FILTER_SELECT_OPTIONS} onChange={(v) => { setSupervisor(v); setPagina(1) }} tone="dark" />
          <Select label="Base" value={base} options={BASE_FILTER_SELECT_OPTIONS} onChange={(v) => { setBase(v); setPagina(1) }} tone="dark" />
          <Select label="Veículo" value={vehicleId} options={vehicleOptions} onChange={(v) => { setVehicleId(v); setPagina(1) }} tone="dark" />
        </FilterPanelGroup>
      </FilterPanel>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-950">
        {carregando && <LoadingApontamentos />}
        {visao === 'entrantes' && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-900/40 dark:bg-sky-950/40">
            <Inbox size={15} className="shrink-0 text-sky-600 dark:text-sky-400" />
            <p className="flex-1 text-sm font-semibold text-sky-900 dark:text-sky-200">
              Exibindo defeitos novos registrados hoje ({new Date(nowMs).toLocaleDateString('pt-BR')}).
            </p>
            <button
              type="button"
              onClick={() => { setVisao('apontamentos'); setPagina(1) }}
              className="inline-flex items-center gap-1 rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-extrabold text-sky-800 hover:bg-sky-50 dark:border-sky-700 dark:bg-slate-900 dark:text-sky-300 dark:hover:bg-slate-800"
            >
              <X size={12} />
              Ver todos
            </button>
          </div>
        )}
        {urlChecklist && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-900/20">
            <ExternalLink size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="flex-1 text-sm font-semibold text-amber-800 dark:text-amber-300">
              Exibindo apenas os defeitos do checklist selecionado.
            </p>
            <Link
              to="/gerenciar"
              className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-extrabold text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:bg-slate-900 dark:text-amber-400 dark:hover:bg-slate-800"
            >
              <X size={12} />
              Limpar filtro
            </Link>
          </div>
        )}
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/50 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-2 text-slate-500 dark:text-slate-400">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-sky-600 shadow-sm dark:bg-slate-950/60 dark:text-sky-300">
              <History size={13} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Agrupamento automático
              </p>
              <p className="truncate text-[11px] font-semibold">
                Mesma placa e item aparecem em uma linha. Clique na linha para ver o histórico.
              </p>
            </div>
          </div>

          <div data-tour="manage-severidade" className="flex flex-wrap items-center gap-2 lg:justify-end">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Severidade
            </span>
            <button
              type="button"
              onClick={() => { setSeveridade('todos'); setPagina(1) }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-extrabold transition ${
                severidade === 'todos'
                  ? 'border-slate-500 bg-slate-800 text-white shadow-sm dark:border-slate-500 dark:bg-slate-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              Todos
              <span className="rounded-full bg-white/20 px-1.5 text-[10px] tabular-nums">{severidadeStats.total}</span>
            </button>
            <button
              type="button"
              onClick={() => { setSeveridade('imperativo'); setPagina(1) }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-extrabold transition ${
                severidade === 'imperativo'
                  ? 'border-rose-500 bg-rose-600 text-white shadow-sm dark:border-rose-500 dark:bg-rose-700'
                  : 'border-rose-200 bg-white text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:bg-slate-950/60 dark:text-rose-300 dark:hover:bg-rose-950/40'
              }`}
            >
              <DefeitoSeveridadeIcon imperativo size={12} />
              Impeditivos
              <span className="rounded-full bg-white/20 px-1.5 text-[10px] tabular-nums">{severidadeStats.imperativos}</span>
            </button>
            <button
              type="button"
              onClick={() => { setSeveridade('atencao'); setPagina(1) }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-extrabold transition ${
                severidade === 'atencao'
                  ? 'border-amber-500 bg-amber-500 text-white shadow-sm dark:border-amber-500 dark:bg-amber-600'
                  : 'border-amber-200 bg-white text-amber-700 hover:bg-amber-50 dark:border-amber-900/60 dark:bg-slate-950/60 dark:text-amber-300 dark:hover:bg-amber-950/40'
              }`}
            >
              <DefeitoSeveridadeIcon imperativo={false} size={12} />
              Atenção
              <span className="rounded-full bg-white/20 px-1.5 text-[10px] tabular-nums">{severidadeStats.atencao}</span>
            </button>
          </div>
        </div>
        <div
          ref={tabelaRef}
          data-tour="manage-table"
          className={`mt-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 ${carregando ? 'hidden' : ''}`}
        >
          <table className="min-w-[980px] w-full border-collapse text-center text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
                <th className="px-3 py-2 text-center">Veículo</th>
                <th className="px-3 py-2 text-center">Processo</th>
                <th className="px-3 py-2 text-center">Base</th>
                <th className="px-3 py-2 text-center">Gerência</th>
                <th className="px-3 py-2 text-center">Defeito</th>
                <th className="px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setDataOrdem((d) => (d === 'asc' ? 'desc' : 'asc'))
                      setPagina(1)
                    }}
                    className="inline-flex items-center justify-center gap-1 hover:text-slate-800 dark:hover:text-slate-200"
                    title={dataOrdem === 'asc' ? 'Mais antigos primeiro — clique para recentes' : 'Mais recentes primeiro — clique para antigos'}
                    aria-label={`Ordenar por data de apontamento: ${dataOrdem === 'asc' ? 'mais antigos primeiro' : 'mais recentes primeiro'}`}
                  >
                    Data de apontamento
                    {dataOrdem === 'desc' ? (
                      <ChevronDown size={12} className="text-blue-500" aria-hidden />
                    ) : (
                      <ChevronUp size={12} className="text-blue-500" aria-hidden />
                    )}
                  </button>
                </th>
                <th className="px-3 py-2 text-center">Prazo</th>
                <th className="px-3 py-2 text-center">Status / ações</th>
              </tr>
            </thead>
            <tbody className="font-semibold text-slate-800 dark:text-slate-200">
              {tableRowsAll.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                    {visao === 'entrantes'
                      ? 'Nenhum defeito novo registrado hoje.'
                      : 'Nenhum registro para os filtros atuais.'}
                  </td>
                </tr>
              ) : (
                paginaRows.map((item) => {
                  const group = item.type === 'group' ? item.group : null
                  const r = group ? group.representative : (item as { type: 'single'; row: Apontamento; sortKey: string }).row
                  const rowKey = group ? group.key : r.id
                  const atrasado = prazoPassou(r.prazo, r.resolvido)
                  const agendado = !r.resolvido && !!r.agendamentoData
                  const stopRowClick = (e: MouseEvent) => e.stopPropagation()
                  return (
                    <tr
                      key={rowKey}
                      onClick={group
                        ? () => { if (Date.now() - lastModalCloseRef.current > 300) setHistoryGroup(group) }
                        : () => { if (Date.now() - lastModalCloseRef.current > 300) setDetailApontamento(r) }
                      }
                      className={[
                        'border-b last:border-0 cursor-pointer',
                        agendado
                          ? 'border-amber-200/70 bg-amber-50/60 hover:bg-amber-50 dark:border-amber-800/30 dark:bg-amber-950/20 dark:hover:bg-amber-950/30'
                          : group
                            ? 'border-sky-200/60 bg-sky-50/40 hover:bg-sky-50/80 dark:border-sky-900/35 dark:bg-sky-950/15 dark:hover:bg-sky-950/25'
                            : 'border-slate-100 hover:bg-slate-50/80 dark:border-slate-800/80 dark:hover:bg-slate-900/40',
                      ].join(' ')}
                    >
                      <td className="align-middle px-3 py-2">
                        <span className="inline-flex min-w-0 items-center justify-center gap-2">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
                            <Truck size={13} />
                          </span>
                          <span className="truncate font-mono text-xs font-black tracking-tight text-slate-800 dark:text-slate-100">{r.veiculoLabel}</span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 align-middle text-center text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex justify-center">
                          {r.checklistId
                            ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"><ClipboardList size={10} />Checklist NC</span>
                            : r.processo}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 align-middle text-xs text-slate-600 dark:text-slate-300">
                        {r.base}
                      </td>
                      <td className="max-w-[150px] px-3 py-2 align-middle text-xs text-slate-600 dark:text-slate-300">
                        <span className="mx-auto block max-w-full truncate">{r.coordenador}</span>
                      </td>
                      <td className="max-w-[320px] px-3 py-2 align-middle text-xs leading-snug sm:text-sm">
                        <div className="flex min-w-0 flex-col items-center gap-1">
                          <span className="inline-flex min-w-0 items-start justify-center gap-1.5 text-center">
                            <DefeitoSeveridadeIcon imperativo={r.imperativo} />
                            <span className="line-clamp-2">{formatDefeitoParaExibicao(r.defeito)}</span>
                          </span>
                          {group ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                              <History size={9} aria-hidden />
                              Recorrente · {group.count}x
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 align-middle text-center text-xs sm:text-sm">
                        {group ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <div>{formatDateBR(r.dataApontamento)}</div>
                            {r.horaApontamento ? (
                              <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">{r.horaApontamento}</div>
                            ) : null}
                          </div>
                        ) : (
                          <>
                            <div>{formatDateBR(r.dataApontamento)}</div>
                            {r.horaApontamento && (
                              <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">{r.horaApontamento}</div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 align-middle text-center text-xs sm:text-sm">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={atrasado ? 'font-black text-rose-600 dark:text-rose-400' : ''}>
                            {r.prazo ? formatDateBR(r.prazo) : '—'}
                          </span>
                          {atrasado ? (
                            <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                              Atrasado
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-middle" onClick={stopRowClick}>
                        <div className="flex items-center justify-center gap-1.5">
                          {group && (
                            <button
                              type="button"
                              onClick={(e) => { stopRowClick(e); setHistoryGroup(group) }}
                              className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-50 px-2 py-1 text-[10px] font-extrabold text-sky-700 transition hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-950/70"
                              title="Ver histórico de ocorrências"
                            >
                              <History size={11} aria-hidden />
                              {group.count}x
                            </button>
                          )}
                          {r.resolvido ? (
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                                title="Resolvido"
                              >
                                <Check size={14} strokeWidth={3} className="text-emerald-600" aria-hidden />
                                Sim
                              </span>
                              {r.resolvidoPor && (
                                <span
                                  className="inline-flex flex-col items-center rounded border-[2.5px] border-double border-emerald-600/70 px-1.5 py-0.5 text-[9px] font-black uppercase leading-tight tracking-wider text-emerald-700 dark:border-emerald-500/60 dark:text-emerald-400"
                                  style={{ transform: 'rotate(-3deg)' }}
                                  title={`Resolvido por ${r.resolvidoPor}`}
                                >
                                  <span>{primeiroNomeDoEmail(r.resolvidoPor)}</span>
                                  {r.dataResolvido && (
                                    <span className="text-[8px] font-bold opacity-80">
                                      {new Date(r.dataResolvido + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}
                                      {r.horaResolvido ? ` · ${r.horaResolvido}` : ''}
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          ) : r.justificado ? (
                            <>
                              <div className="flex flex-col items-center gap-0.5">
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-extrabold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                                  title={r.justificativa ?? 'Justificado'}
                                >
                                  <MessageSquareWarning size={12} className="text-amber-600" aria-hidden />
                                  Justificado
                                </span>
                                {r.agendamentoData && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                    📅 {new Date(r.agendamentoData + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                  </span>
                                )}
                              </div>
                              {canJustify ? (
                                <button
                                  type="button"
                                  onClick={(e) => { stopRowClick(e); openJustModal(r) }}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-400/60 bg-amber-50 text-amber-700 shadow-sm transition hover:bg-amber-100 hover:ring-2 hover:ring-amber-300/40 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/60"
                                  title="Editar justificativa"
                                >
                                  <MessageSquareWarning size={15} aria-hidden />
                                </button>
                              ) : null}
                              {canMarkResolved ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    stopRowClick(e)
                                    openResolveModal(r, group?.ocorrencias.map((o) => o.id))
                                  }}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/60 bg-emerald-50 text-emerald-700 shadow-sm transition hover:bg-emerald-100 hover:ring-2 hover:ring-emerald-400/40 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                                  title="Marcar como resolvido"
                                >
                                  <Check size={17} strokeWidth={3} aria-hidden />
                                </button>
                              ) : null}
                            </>
                          ) : (
                            <>
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-extrabold text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
                                title="Não resolvido"
                              >
                                <X size={13} strokeWidth={2.5} className="text-rose-600" aria-hidden />
                                Não
                              </span>
                              {canJustify ? (
                                <button
                                  type="button"
                                  onClick={(e) => { stopRowClick(e); openJustModal(r) }}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-400/60 bg-amber-50 text-amber-700 shadow-sm transition hover:bg-amber-100 hover:ring-2 hover:ring-amber-300/40 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/60"
                                  title="Adicionar justificativa"
                                  aria-label="Justificar não resolução"
                                >
                                  <MessageSquareWarning size={15} aria-hidden />
                                </button>
                              ) : null}
                              {canMarkResolved ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      stopRowClick(e)
                                      openResolveModal(r, group?.ocorrencias.map((o) => o.id))
                                    }}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/60 bg-emerald-50 text-emerald-700 shadow-sm transition hover:bg-emerald-100 hover:ring-2 hover:ring-emerald-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60 dark:focus-visible:ring-offset-slate-950"
                                    title="Marcar como resolvido"
                                    aria-label={`Marcar defeito ${formatDefeitoParaExibicao(r.defeito).slice(0, 48)} do veículo ${r.prefixo} como resolvido`}
                                  >
                                    <Check size={17} strokeWidth={3} aria-hidden />
                                  </button>
                                </>
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
                {' linha(s). Ordem na coluna '}
                <span className="font-extrabold">&quot;Data de apontamento&quot;</span>
                {': '}
                <span className="font-extrabold">
                  {dataOrdem === 'asc' ? 'mais antigos primeiro' : 'mais recentes primeiro'}
                </span>
                .
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

      {detailApontamento ? (
        <Portal>
          <button
            type="button"
            className="fixed inset-0 z-[9998] bg-black/60"
            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setDetailApontamento(null) }}
            aria-label="Fechar"
          />
          <div className="fixed inset-0 z-[9999] overflow-y-auto overscroll-contain">
            <div className="flex min-h-[100dvh] justify-center p-4 py-6 sm:items-center sm:py-8">
              <div
                className="my-auto flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-950"
                onPointerDown={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Detalhes do defeito"
              >
                {/* Header */}
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 pb-3 pt-4 dark:border-slate-800">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
                        <Truck size={15} />
                      </span>
                      <span className="font-mono text-base font-black tracking-tight text-slate-900 dark:text-slate-100">
                        {detailApontamento.veiculoLabel}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <DefeitoSeveridadeIcon imperativo={detailApontamento.imperativo} size={14} />
                      <span>{formatDefeitoParaExibicao(detailApontamento.defeito)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetailApontamento(null)}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                    aria-label="Fechar"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Body */}
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4">
                  {/* Meta info */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                      <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Operador</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{detailApontamento.responsavel || '—'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                      <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Apontado em</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        {new Date(detailApontamento.dataApontamento + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {detailApontamento.horaApontamento ? <span className="ml-1 text-slate-400">· {detailApontamento.horaApontamento}</span> : null}
                      </p>
                    </div>
                    {detailApontamento.base ? (
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                        <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Base</p>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{detailApontamento.base}</p>
                      </div>
                    ) : null}
                    {detailApontamento.prazo ? (
                      <div className={[
                        'rounded-xl border p-3',
                        prazoPassou(detailApontamento.prazo, detailApontamento.resolvido)
                          ? 'border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/20'
                          : 'border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40',
                      ].join(' ')}>
                        <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Prazo</p>
                        <p className={[
                          'font-bold',
                          prazoPassou(detailApontamento.prazo, detailApontamento.resolvido)
                            ? 'text-rose-700 dark:text-rose-400'
                            : 'text-slate-800 dark:text-slate-200',
                        ].join(' ')}>
                          {new Date(detailApontamento.prazo + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {prazoPassou(detailApontamento.prazo, detailApontamento.resolvido) && (
                            <span className="ml-1.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">Atrasado</span>
                          )}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {/* Problemas adicionais */}
                  {detailApontamento.problemasAdicionais && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-950/20">
                      <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400">Problemas adicionais</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{detailApontamento.problemasAdicionais}</p>
                      {detailApontamento.descricaoProblema && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Local/detalhe: {detailApontamento.descricaoProblema}</p>
                      )}
                    </div>
                  )}

                  {/* Fotos da NC */}
                  {detailApontamento.ncFotos && detailApontamento.ncFotos.length > 0 ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/50 dark:bg-rose-950/20">
                      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-rose-500 dark:text-rose-400">
                        Foto(s) da não conformidade
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {detailApontamento.ncFotos.map((foto, idx) => (
                          <a key={idx} href={foto} target="_blank" rel="noopener noreferrer" className="group relative block overflow-hidden rounded-lg border border-rose-300 dark:border-rose-800">
                            <img
                              src={foto}
                              alt={`Foto ${idx + 1}`}
                              className="h-28 w-28 object-cover transition group-hover:opacity-80 sm:h-36 sm:w-36"
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                              <ZoomIn size={20} className="text-white drop-shadow" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-6 dark:border-slate-800 dark:bg-slate-900/30">
                      <ImageIcon size={28} className="text-slate-300 dark:text-slate-700" />
                      <p className="text-xs font-semibold text-slate-400 dark:text-slate-600">Nenhuma foto registrada</p>
                    </div>
                  )}

                  {/* Justificativa */}
                  {detailApontamento.justificado && detailApontamento.justificativa && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-950/20">
                      <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400">Justificativa</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{detailApontamento.justificativa}</p>
                      {detailApontamento.justificativaData && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {new Date(detailApontamento.justificativaData + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Resolução */}
                  {detailApontamento.resolvido && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                      <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Resolvido em</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        {detailApontamento.dataResolvido
                          ? new Date(detailApontamento.dataResolvido + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </p>
                      {detailApontamento.reparoDescricao && (
                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{detailApontamento.reparoDescricao}</p>
                      )}
                      {detailApontamento.reparoValor != null && detailApontamento.reparoValor > 0 && (
                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Custo: {(detailApontamento.reparoValor / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      )}
                      {detailApontamento.reparoImagens && detailApontamento.reparoImagens.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {detailApontamento.reparoImagens.map((img, idx) => (
                            <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="group relative block overflow-hidden rounded-lg border border-emerald-300 dark:border-emerald-800">
                              <img src={img} alt={`Reparo ${idx + 1}`} className="h-20 w-20 object-cover transition group-hover:opacity-80" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                                <ZoomIn size={18} className="text-white drop-shadow" />
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setDetailApontamento(null)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      ) : null}

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
                    {resolveGroupIds && resolveGroupIds.length > 1
                      ? `Resolver o mesmo defeito (${resolveGroupIds.length} apontamentos)`
                      : 'Marcar como resolvido'}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {currentResolve ? (
                      <>
                        <span className="font-extrabold">{currentResolve.prefixo}</span>
                        {' — '}
                        <span className="inline-flex items-center gap-1.5">
                          <DefeitoSeveridadeIcon imperativo={currentResolve.imperativo} size={13} />
                          {formatDefeitoParaExibicao(currentResolve.defeito)}
                        </span>
                        {resolveGroupIds && resolveGroupIds.length > 1 ? (
                          <span className="mt-1 block text-xs font-semibold text-sky-600 dark:text-sky-400">
                            É o mesmo problema apontado em dias diferentes. Ao confirmar, todas as {resolveGroupIds.length} ocorrências serão marcadas como resolvidas.
                          </span>
                        ) : null}
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
              {/* Problemas adicionais reportados no checklist */}
              {currentResolve?.problemasAdicionais && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-950/20">
                  <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                    Problemas adicionais reportados
                  </p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {currentResolve.problemasAdicionais}
                  </p>
                  {currentResolve.descricaoProblema && (
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Local/detalhe: {currentResolve.descricaoProblema}
                    </p>
                  )}
                </div>
              )}
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
                  disabled={salvando || uploadingImgs}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-soft hover:bg-emerald-700 disabled:opacity-60"
                >
                  {(salvando || uploadingImgs)
                    ? <Loader2 size={18} className="animate-spin" />
                    : <Check size={18} strokeWidth={3} />}
                  {uploadingImgs ? 'Enviando fotos...' : salvando ? 'Salvando...' : 'Confirmar resolvido'}
                </button>
              </div>
            </div>
          </div>
          </div>
        </Portal>
      ) : null}

      {/* ── Painel de Agenda ──────────────────────────────────────────────── */}
      {agendaOpen ? (
        <Portal>
          <button
            type="button"
            className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setAgendaExpandedId(null); setAgendaOpen(false) }}
            aria-label="Fechar agenda"
          />
          <div className="fixed inset-0 z-[9999] overflow-y-auto overscroll-contain">
            <div className="flex min-h-[100dvh] justify-center p-4 py-6 sm:items-center sm:py-8">
              <div
                className="my-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
                onPointerDown={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Agenda de correções"
              >
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-amber-50 px-5 py-4 dark:border-slate-800 dark:bg-amber-950/30">
                  <div className="flex items-center gap-2">
                    <CalendarClock size={18} className="text-amber-600 dark:text-amber-400" />
                    <div>
                      <div className="text-sm font-extrabold text-amber-800 dark:text-amber-200">
                        Agenda de correções
                      </div>
                      <div className="text-xs font-semibold text-amber-700/70 dark:text-amber-400/70">
                        {agendados.length === 0
                          ? 'Nenhum item agendado'
                          : `${agendados.length} item${agendados.length > 1 ? 's' : ''} aguardando correção`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void exportarAgendaFoto()}
                      disabled={capturandoAgendaFoto || agendados.length === 0}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 text-[11px] font-extrabold uppercase tracking-wide text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-slate-800"
                      title="Exportar agenda como imagem"
                    >
                      {capturandoAgendaFoto ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                      Relatório
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAgendaExpandedId(null); setAgendaOpen(false) }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-amber-200 bg-white text-slate-600 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      aria-label="Fechar"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="max-h-[min(70dvh,32rem)] overflow-y-auto">
                  {agendados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400 dark:text-slate-500">
                      <CalendarClock size={36} strokeWidth={1.5} />
                      <p className="text-sm font-semibold">Nenhuma correção agendada no momento.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {agendados.map((r) => {
                        const dataBR = new Date(r.agendamentoData! + 'T12:00:00').toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                        const isVencida = r.agendamentoData! < new Date().toISOString().slice(0, 10)
                        const expanded = agendaExpandedId === r.id
                        const placaFmt = formatPlaca(r.placa) || r.placa || r.veiculoLabel
                        const prefixoLabel = r.prefixo?.trim() || r.processo?.trim() || '—'
                        return (
                          <li key={r.id} className="px-5 py-4">
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                title={`Filtrar ${r.placa} na tabela`}
                                onClick={() => irParaPlacaNaTabela(r.placa)}
                                className={[
                                  'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition-opacity hover:opacity-75 active:scale-95',
                                  isVencida ? 'bg-rose-500' : 'bg-amber-500',
                                ].join(' ')}
                              >
                                <CalendarClock size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setAgendaExpandedId((prev) => (prev === r.id ? null : r.id))}
                                aria-expanded={expanded}
                                className="min-w-0 flex-1 rounded-xl text-left outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-amber-400/50 dark:hover:bg-slate-900/60 -mx-2 px-2 py-1"
                              >
                                <div className="flex items-start gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="font-mono text-xs font-extrabold text-slate-700 dark:text-slate-200">
                                        {prefixoLabel}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-400">·</span>
                                      <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                        {placaFmt}
                                      </span>
                                      <span className={[
                                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold',
                                        isVencida
                                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
                                      ].join(' ')}>
                                        📅 {dataBR}
                                        {isVencida ? ' · vencida' : ''}
                                      </span>
                                    </div>
                                    <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-semibold leading-snug text-slate-600 dark:text-slate-300">
                                      <DefeitoSeveridadeIcon imperativo={r.imperativo} size={13} />
                                      <span className={expanded ? '' : 'line-clamp-2'}>
                                        {formatDefeitoParaExibicao(r.defeito)}
                                      </span>
                                    </p>
                                    {!expanded && r.justificativa ? (
                                      <p className="mt-1 text-[11px] font-semibold italic text-slate-400 dark:text-slate-500 line-clamp-1">
                                        "{r.justificativa}"
                                      </p>
                                    ) : null}
                                    {!expanded ? (
                                      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-600/80 dark:text-amber-400/80">
                                        Toque para ver detalhes
                                      </p>
                                    ) : null}
                                  </div>
                                  <span className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden>
                                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </span>
                                </div>
                              </button>
                              {canMarkResolved && (
                                <button
                                  type="button"
                                  onClick={() => { setAgendaOpen(false); openResolveModal(r) }}
                                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-extrabold text-white shadow-sm hover:bg-emerald-700"
                                  title="Marcar como resolvido"
                                >
                                  <Check size={13} strokeWidth={3} />
                                  Resolver
                                </button>
                              )}
                            </div>

                            {expanded ? (
                              <div className="mt-3 ml-12 rounded-xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                                <dl className="grid gap-3 sm:grid-cols-2">
                                  <AgendaDetalheCampo label="Placa" value={placaFmt} />
                                  <AgendaDetalheCampo label="Modelo" value={r.modelo} />
                                  <AgendaDetalheCampo label="Prefixo / processo" value={prefixoLabel} />
                                  <AgendaDetalheCampo label="Base" value={r.base} />
                                  <AgendaDetalheCampo label="Gerência" value={r.coordenador} />
                                  <AgendaDetalheCampo label="Responsável" value={r.responsavel} />
                                  <AgendaDetalheCampo
                                    label="Apontado em"
                                    value={`${formatDateBR(r.dataApontamento)}${r.horaApontamento ? ` · ${r.horaApontamento}` : ''}`}
                                  />
                                  <AgendaDetalheCampo
                                    label="Prazo"
                                    value={r.prazo ? formatDateBR(r.prazo) : null}
                                  />
                                  <AgendaDetalheCampo
                                    label="Agendado para"
                                    value={`${dataBR}${isVencida ? ' (vencida)' : ''}`}
                                  />
                                  <AgendaDetalheCampo
                                    label="Severidade"
                                    value={r.imperativo ? 'Imperativo — impede condução' : 'Não imperativo'}
                                  />
                                </dl>

                                {r.justificativa ? (
                                  <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                                    <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                      Justificativa
                                    </dt>
                                    <dd className="mt-1 text-xs font-semibold italic leading-relaxed text-slate-600 dark:text-slate-300">
                                      "{r.justificativa}"
                                    </dd>
                                    {r.justificativaData ? (
                                      <dd className="mt-1 text-[10px] font-semibold text-slate-400">
                                        Registrada em {formatDateBR(r.justificativaData)}
                                      </dd>
                                    ) : null}
                                  </div>
                                ) : null}

                                {r.descricaoProblema?.trim() ? (
                                  <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                                    <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                      Descrição adicional
                                    </dt>
                                    <dd className="mt-1 text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
                                      {r.descricaoProblema}
                                    </dd>
                                  </div>
                                ) : null}

                                {r.problemasAdicionais?.trim() ? (
                                  <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                                    <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                      Outros problemas reportados
                                    </dt>
                                    <dd className="mt-1 text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
                                      {r.problemasAdicionais}
                                    </dd>
                                  </div>
                                ) : null}

                                {r.ncFotos.length > 0 ? (
                                  <p className="mt-3 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                    {r.ncFotos.length} foto{r.ncFotos.length > 1 ? 's' : ''} de evidência no checklist
                                  </p>
                                ) : null}
                              </div>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>

                {/* Footer */}
                <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-slate-50/90 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/60">
                  <button
                    type="button"
                    onClick={() => { setAgendaExpandedId(null); setAgendaOpen(false) }}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      ) : null}

      {/* ── Modal de Justificativa ─────────────────────────────────────────── */}
      {justOpen ? (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeJustModal} />
            <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-amber-50 px-5 py-4 dark:border-slate-800 dark:bg-amber-950/30">
                <div className="flex items-center gap-2">
                  <MessageSquareWarning size={18} className="text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-extrabold text-amber-800 dark:text-amber-200">
                    Justificativa de não resolução
                  </span>
                </div>
                <button type="button" onClick={closeJustModal} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-4 p-5">
                {/* Data */}
                <div>
                  <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Data
                  </label>
                  <input
                    type="date"
                    value={justData}
                    onChange={(e) => setJustData(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-amber-400/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>

                {/* Justificativa */}
                <div>
                  <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Justificativa <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={justTexto}
                    onChange={(e) => setJustTexto(e.target.value)}
                    rows={4}
                    placeholder="Descreva o motivo pelo qual o serviço não foi realizado..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm outline-none placeholder:font-normal placeholder:text-slate-400 focus:ring-2 focus:ring-amber-400/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-600"
                  />
                </div>

                {/* Agendamento */}
                <div>
                  <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Agendar correção <span className="text-slate-400 font-normal normal-case">(opcional)</span>
                  </label>
                  <input
                    type="date"
                    value={justAgendamento}
                    onChange={(e) => setJustAgendamento(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-amber-400/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                  {justAgendamento && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      <AlertTriangle size={11} />
                      Correção agendada para {new Date(justAgendamento + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>

                {/* Imagem opcional */}
                <div>
                  <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Imagem <span className="text-slate-400 font-normal normal-case">(opcional)</span>
                  </label>
                  {justImagem ? (
                    <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                      <img src={justImagem} alt="Evidência" className="max-h-48 w-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setJustImagem(null)}
                        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => justImgRef.current?.click()}
                      className="flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400 dark:hover:bg-slate-800/60"
                    >
                      <ImageIcon size={16} />
                      Adicionar imagem
                    </button>
                  )}
                  <input
                    ref={justImgRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => addJustImagem(e.target.files)}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeJustModal}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void confirmJust()}
                  disabled={salvandoJust || uploadingJust || !justTexto.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-soft hover:bg-amber-600 disabled:opacity-60"
                >
                  {(salvandoJust || uploadingJust)
                    ? <Loader2 size={18} className="animate-spin" />
                    : <MessageSquareWarning size={18} />}
                  {uploadingJust ? 'Enviando foto...' : salvandoJust ? 'Salvando...' : 'Salvar justificativa'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      ) : null}

      {historyGroup ? (
        <Portal>
          <button
            type="button"
            className="fixed inset-0 z-[9998] bg-black/45"
            onClick={() => setHistoryGroup(null)}
            aria-label="Fechar histórico"
          />
          <aside
            className="fixed inset-y-0 right-0 z-[9999] flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
            role="dialog"
            aria-modal="true"
            aria-label="Histórico do defeito recorrente"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                  <History size={18} aria-hidden />
                  <span className="text-[11px] font-black uppercase tracking-wider">Histórico recorrente</span>
                </div>
                <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                  {historyGroup.representative.veiculoLabel}
                </h2>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <DefeitoSeveridadeIcon imperativo={historyGroup.representative.imperativo} size={15} />
                  {formatDefeitoParaExibicao(historyGroup.representative.defeito)}
                </p>
                <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                  {historyGroup.count} apontamento(s)
                  {historyGroup.diasConsecutivos > 1
                    ? ` · ${historyGroup.diasConsecutivos} dias consecutivos`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryGroup(null)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <ol className="space-y-3">
                {historyGroup.ocorrencias.map((o, idx) => (
                  <li
                    key={o.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white">
                          {formatDateBR(o.dataApontamento)}
                          {o.horaApontamento ? (
                            <span className="ml-2 text-xs font-bold text-slate-500 dark:text-slate-400">{o.horaApontamento}</span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Ocorrência {historyGroup.count - idx} de {historyGroup.count}
                        </p>
                      </div>
                      {idx === 0 ? (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-black uppercase text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                          Mais recente
                        </span>
                      ) : null}
                    </div>
                    {o.checklistId ? (
                      <Link
                        to={`/gerenciar?checklist=${encodeURIComponent(o.checklistId)}`}
                        onClick={() => setHistoryGroup(null)}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-blue-600 hover:underline dark:text-blue-400"
                      >
                        <ExternalLink size={12} aria-hidden />
                        Ver checklist deste dia
                      </Link>
                    ) : null}
                    {o.ncFotos.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {o.ncFotos.slice(0, 3).map((src, i) => (
                          <a
                            key={src}
                            href={src}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-14 w-14 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
                          >
                            <img src={src} alt={`Foto NC ${i + 1}`} className="h-full w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>

            {canMarkResolved && !historyGroup.representative.resolvido ? (
              <div className="flex shrink-0 gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    openResolveModal(
                      historyGroup.representative,
                      historyGroup.ocorrencias.map((o) => o.id),
                    )
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-700"
                >
                  <Check size={16} strokeWidth={3} aria-hidden />
                  Resolver mesmo defeito ({historyGroup.count} dias)
                </button>
              </div>
            ) : null}
          </aside>
        </Portal>
      ) : null}
    </div>
  )
}
