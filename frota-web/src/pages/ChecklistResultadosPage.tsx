import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  ExternalLink,
  FileText,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { supabase, type ChecklistRow } from '../lib/supabase'
import { SCHEMA_MAP } from '../data/checklistSchemas'

function formatDateBR(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function formatDateTimeBR(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const TIPOS = [
  { id: '', label: 'Todos' },
  { id: 'sky', label: 'SKY' },
  { id: 'munck', label: 'Munck' },
  { id: 'picape-leve', label: 'Picape Leve' },
  { id: 'picape-4x4', label: 'Picape 4x4' },
  { id: 'motocicleta', label: 'Motocicleta' },
  { id: 'veiculo-leve', label: 'Veículo Leve' },
]

// ---------------------------------------------------------------------------
// Lightbox de imagens
// ---------------------------------------------------------------------------
function Lightbox({ urls, index, onClose, onPrev, onNext }: {
  urls: string[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const url = urls[index]!
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X size={20} />
      </button>
      {urls.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onPrev() }}
            className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onNext() }}
            className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}
      <img
        src={url}
        alt={`Evidência ${index + 1}`}
        className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-extrabold text-white">
        {index + 1} / {urls.length}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modal de detalhe
// ---------------------------------------------------------------------------

function ModalDetalhe({ row, onClose }: { row: ChecklistRow; onClose: () => void }) {
  const schema = SCHEMA_MAP[row.tipo]
  const placa = row.dados_veiculo?.placa ?? ''
  const km = row.dados_veiculo?.km_atual ?? ''

  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const fotos = (row.evidencia_urls ?? []).filter((u) => /\.(jpe?g|png|gif|webp|heic)(\?|$)/i.test(u))
  const pdfs  = (row.evidencia_urls ?? []).filter((u) => /\.pdf(\?|$)/i.test(u))
  const outros = (row.evidencia_urls ?? []).filter((u) => !fotos.includes(u) && !pdfs.includes(u))

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-8">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
          <div>
            <div className="text-lg font-black text-slate-900 dark:text-slate-100">
              {schema?.nome ?? row.tipo}
            </div>
            <div className="mt-0.5 text-sm font-semibold text-slate-500 dark:text-slate-400">
              {row.nome_operador} · Mat. {row.matricula}
              {placa ? ` · ${placa}` : ''}
              {km ? ` · ${km} km` : ''}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span>{formatDateBR(row.data_inspecao)}</span>
              <span>·</span>
              <span>Enviado em {formatDateTimeBR(row.created_at)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <X size={16} />
          </button>
        </div>

        {/* resumo */}
        <div className="flex flex-wrap gap-4 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={15} />
            {Object.values(row.respostas).filter((v) => v === 'c').length} C
          </div>
          <div className={`flex items-center gap-1.5 text-sm font-extrabold ${row.nc_count > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
            <AlertTriangle size={15} />
            {row.nc_count} NC
          </div>
          {row.nc_imperativos > 0 && (
            <div className="flex items-center gap-1.5 text-sm font-extrabold text-rose-600">
              🚫 {row.nc_imperativos} imperativos com NC
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm font-extrabold text-slate-400">
            {Object.values(row.respostas).filter((v) => v === 'na').length} N/A
          </div>
        </div>

        {/* dados extras do veículo */}
        {Object.keys(row.dados_veiculo ?? {}).length > 0 && (
          <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-800">
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Dados do Veículo
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              {Object.entries(row.dados_veiculo).map(([k, v]) => (
                <div key={k} className="text-xs">
                  <span className="font-extrabold uppercase text-slate-500">{k.replace(/_/g, ' ')}</span>
                  {': '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* problemas */}
        {(row.problemas || row.descricao_problema) && (
          <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-800">
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-rose-500">
              Problemas Verificados
            </p>
            {row.problemas && (
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{row.problemas}</p>
            )}
            {row.descricao_problema && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{row.descricao_problema}</p>
            )}
            {row.nome_supervisor && (
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Supervisor: {row.nome_supervisor}
              </p>
            )}
          </div>
        )}

        {/* evidências */}
        {row.evidencia_urls?.length > 0 && (
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Evidências ({row.evidencia_urls.length})
            </p>

            {/* Galeria de fotos */}
            {fotos.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {fotos.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setLightboxIdx(i)}
                    className="group relative h-20 w-20 overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-100 shadow-sm transition hover:border-brand-500 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                  >
                    <img
                      src={url}
                      alt={`Foto ${i + 1}`}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                      <ExternalLink size={16} className="text-white opacity-0 drop-shadow transition group-hover:opacity-100" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* PDFs */}
            {pdfs.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {pdfs.map((url, i) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-extrabold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <FileText size={13} className="text-rose-400" />
                    PDF {i + 1}
                  </a>
                ))}
              </div>
            )}

            {/* Outros arquivos */}
            {outros.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {outros.map((url, i) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-extrabold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <ExternalLink size={11} />
                    Arquivo {i + 1}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lightbox */}
        {lightboxIdx !== null && (
          <Lightbox
            urls={fotos}
            index={lightboxIdx}
            onClose={() => setLightboxIdx(null)}
            onPrev={() => setLightboxIdx((i) => (i! - 1 + fotos.length) % fotos.length)}
            onNext={() => setLightboxIdx((i) => (i! + 1) % fotos.length)}
          />
        )}

        {/* itens por grupo */}
        <div className="max-h-[50vh] overflow-y-auto p-5 space-y-4">
          {schema?.grupos.map((grupo) => (
            <div key={grupo.id}>
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {grupo.titulo}
              </p>
              <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
                {grupo.itens.map((item, idx) => {
                  const resp = row.respostas[item.id]
                  const obs = row.observacoes[item.id]
                  const isLast = idx === grupo.itens.length - 1
                  return (
                    <div
                      key={item.id}
                      className={`flex items-start justify-between gap-3 px-4 py-3 ${!isLast ? 'border-b border-slate-100 dark:border-slate-800' : ''} ${resp === 'nc' ? 'bg-rose-50/50 dark:bg-rose-900/10' : ''}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {item.imperativo && <span className="mr-1">🚫</span>}
                          {item.label}
                        </p>
                        {obs && (
                          <p className="mt-0.5 text-xs font-semibold text-rose-500">{obs}</p>
                        )}
                      </div>
                      <span className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-extrabold ${
                        resp === 'c'  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        resp === 'nc' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                        resp === 'na' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' :
                        'bg-slate-100 text-slate-400'
                      }`}>
                        {resp === 'c' ? 'C' : resp === 'nc' ? 'NC' : resp === 'na' ? 'N/A' : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Linha da tabela expansível (mobile)
// ---------------------------------------------------------------------------

function LinhaChecklist({ row, onVerDetalhe }: { row: ChecklistRow; onVerDetalhe: () => void }) {
  const [expandido, setExpandido] = useState(false)
  const schema = SCHEMA_MAP[row.tipo]
  const placa = row.dados_veiculo?.placa ?? ''
  const km = row.dados_veiculo?.km_atual ?? ''

  return (
    <>
      <tr
        className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50/80 dark:border-slate-800/80 dark:hover:bg-slate-900/40"
        onClick={onVerDetalhe}
      >
        <td className="px-4 py-3">
          <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
            {row.nome_operador}
          </div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Mat. {row.matricula}
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {schema?.nome ?? row.tipo}
          </span>
        </td>
        <td className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
          {placa || <span className="text-slate-400">—</span>}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
          {formatDateBR(row.data_inspecao)}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
              {Object.values(row.respostas).filter((v) => v === 'c').length} C
            </span>
            {row.nc_count > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${
                row.nc_imperativos > 0
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
              }`}>
                {row.nc_count} NC{row.nc_imperativos > 0 ? ' 🚫' : ''}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpandido((v) => !v) }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 md:hidden"
            aria-label="Expandir"
          >
            {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </td>
      </tr>
      {/* linha expandida no mobile */}
      {expandido && (
        <tr className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40 md:hidden">
          <td colSpan={6} className="px-4 py-3">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Enviado em {formatDateTimeBR(row.created_at)}
              {km ? ` · ${km} km` : ''}
            </div>
            {row.nc_count > 0 && (
              <div className="mt-2 space-y-1">
                {Object.entries(row.observacoes).filter(([, v]) => v).map(([id, obs]) => {
                  const item = schema?.grupos.flatMap((g) => g.itens).find((i) => i.id === id)
                  return (
                    <div key={id} className="rounded-lg bg-rose-50 px-3 py-2 dark:bg-rose-900/20">
                      <p className="text-xs font-extrabold text-rose-600 dark:text-rose-400">
                        {item?.label ?? id}
                      </p>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{obs}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export function ChecklistResultadosPage() {
  const [rows, setRows] = useState<ChecklistRow[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [query, setQuery] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [somenteNc, setSomenteNc] = useState(false)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [detalhe, setDetalhe] = useState<ChecklistRow | null>(null)

  const carregar = async () => {
    setCarregando(true)
    setErro('')
    const { data, error } = await supabase
      .from('checklists')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) {
      setErro('Erro ao carregar dados do Supabase.')
    } else {
      setRows((data as ChecklistRow[]) ?? [])
    }
    setCarregando(false)
  }

  useEffect(() => { void carregar() }, [])

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (tipoFiltro && r.tipo !== tipoFiltro) return false
      if (somenteNc && r.nc_count === 0) return false
      if (dataInicio && r.data_inspecao < dataInicio) return false
      if (dataFim && r.data_inspecao > dataFim) return false
      if (q) {
        const placa = r.dados_veiculo?.placa ?? ''
        const haystack = `${r.nome_operador} ${r.matricula} ${placa} ${r.tipo}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [rows, query, tipoFiltro, somenteNc, dataInicio, dataFim])

  const totalNc = filtrados.reduce((acc, r) => acc + r.nc_count, 0)

  return (
    <div className="space-y-5">

      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            to="/gerenciar/checklists"
            className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-900 text-white shadow-soft dark:bg-slate-100 dark:text-slate-900">
              <ClipboardList size={18} />
            </div>
            <div>
              <div className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                Resultados dos Checklists
              </div>
              <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Checklists enviados pelos operadores
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void carregar()}
          disabled={carregando}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-900 shadow-soft hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
        >
          <RefreshCw size={16} className={carregando ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total enviados', value: filtrados.length, color: 'text-slate-900 dark:text-slate-100' },
          { label: 'Com NC', value: filtrados.filter((r) => r.nc_count > 0).length, color: 'text-rose-500' },
          { label: 'Itens NC', value: totalNc, color: 'text-rose-500' },
          { label: 'Todos C', value: filtrados.filter((r) => r.nc_count === 0).length, color: 'text-emerald-600 dark:text-emerald-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-950">
            <div className={`text-2xl font-black ${color}`}>{value}</div>
            <div className="mt-0.5 text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-3">
          {/* linha 1: busca + tipo + toggle NC */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
              <Search size={15} className="shrink-0 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Operador, matrícula, placa..."
                className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
              />
            </div>

            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-100"
            >
              {TIPOS.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setSomenteNc((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-extrabold transition ${
                somenteNc
                  ? 'border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400'
                  : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400'
              }`}
            >
              <AlertTriangle size={14} />
              Somente NC
            </button>
          </div>

          {/* linha 2: datas */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">De</span>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-900 outline-none dark:text-slate-100 dark::[color-scheme:dark]"
              />
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Até</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-900 outline-none dark:text-slate-100 dark::[color-scheme:dark]"
              />
            </div>
            {(dataInicio || dataFim || tipoFiltro || somenteNc || query) && (
              <button
                type="button"
                onClick={() => { setDataInicio(''); setDataFim(''); setTipoFiltro(''); setSomenteNc(false); setQuery('') }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400"
              >
                <X size={12} />
                Limpar filtros
              </button>
            )}
            <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <CalendarCheck2 size={14} />
              {filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-950">
        {erro ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertTriangle size={32} className="text-rose-400" />
            <p className="text-sm font-extrabold text-rose-500">{erro}</p>
            <button
              type="button"
              onClick={() => void carregar()}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
            >
              Tentar novamente
            </button>
          </div>
        ) : carregando ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <RefreshCw size={16} className="animate-spin" />
            Carregando...
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
                  <th className="px-4 py-3">Operador</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Placa</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Resultado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="text-slate-800 dark:text-slate-200">
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-sm font-semibold text-slate-400">
                      Nenhum checklist encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((row) => (
                    <LinhaChecklist
                      key={row.id}
                      row={row}
                      onVerDetalhe={() => setDetalhe(row)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detalhe && <ModalDetalhe row={detalhe} onClose={() => setDetalhe(null)} />}
    </div>
  )
}
