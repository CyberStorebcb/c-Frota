import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SelectCustom } from '../components/ui/SelectCustom'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpDown,
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { supabase, type ChecklistRow } from '../lib/supabase'
import { SCHEMA_MAP } from '../data/checklistSchemas'
import { useApontamentos } from '../apontamentos/ApontamentosContext'
import { Send } from 'lucide-react'

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

// Badge colorido por tipo
const TIPO_BADGE: Record<string, { label: string; cls: string }> = {
  sky:           { label: 'SKY',          cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' },
  munck:         { label: 'Munck',        cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  'picape-leve': { label: 'Picape Leve',  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  'picape-4x4':  { label: 'Picape 4x4',  cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  motocicleta:   { label: 'Moto',         cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
  'veiculo-leve':{ label: 'Veíc. Leve',  cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
}

// Exportação CSV
function exportarCSV(rows: ChecklistRow[]) {
  const cols = ['Data', 'Tipo', 'Operador', 'Matrícula', 'Placa', 'KM', 'Prefixo', 'Processo', 'Localidade', 'C', 'NC', 'Problemas', 'Supervisor']
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const linhas = rows.map((r) => {
    const dv = r.dados_veiculo ?? {}
    const c  = Object.values(r.respostas).filter((v) => v === 'c').length
    return [
      r.data_inspecao,
      TIPO_BADGE[r.tipo]?.label ?? r.tipo,
      r.nome_operador,
      r.matricula,
      dv.placa ?? '',
      dv.km_atual ?? '',
      dv.prefixo ?? '',
      dv.processo ?? '',
      dv.localidade ?? '',
      c,
      r.nc_count,
      r.problemas ?? '',
      r.nome_supervisor ?? '',
    ].map(String).map(escape).join(',')
  })
  const csv = [cols.map(escape).join(','), ...linhas].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `checklists_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// Sparkline SVG — tendência semanal de NC
function Sparkline({ semanas }: { semanas: { label: string; nc: number; total: number }[] }) {
  if (semanas.length < 2) return null
  const maxNc = Math.max(...semanas.map((s) => s.nc), 1)
  const W = 220, H = 48, pad = 4
  const xs = semanas.map((_, i) => pad + (i / (semanas.length - 1)) * (W - pad * 2))
  const ys = semanas.map((s) => pad + (1 - s.nc / maxNc) * (H - pad * 2))
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i]!.toFixed(1)}`).join(' ')
  const area = `${path} L${xs[xs.length-1]!.toFixed(1)},${H} L${xs[0]!.toFixed(1)},${H} Z`

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Tendência NC — últimas {semanas.length} semanas
        </span>
        <span className="text-xs font-extrabold text-rose-500">
          {semanas[semanas.length - 1]?.nc ?? 0} NC esta semana
        </span>
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(239,68,68)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="rgb(239,68,68)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#sparkGrad)" />
        <path d={path} fill="none" stroke="rgb(239,68,68)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r="3" fill="rgb(239,68,68)" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between">
        {semanas.map((s, i) => (
          <span key={i} className="text-[9px] font-semibold text-slate-400 dark:text-slate-600">{s.label}</span>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helper: extrai texto e URLs de fotos de uma observação
// ---------------------------------------------------------------------------
function parseObs(raw: string): { texto: string; fotos: string[] } {
  const marker = '__fotos__:'
  const idx = raw.indexOf(marker)
  if (idx === -1) return { texto: raw, fotos: [] }
  const texto = raw.slice(0, idx).replace(/\n$/, '').trim()
  const fotos = raw.slice(idx + marker.length).split('|').filter(Boolean)
  return { texto, fotos }
}

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
  const { addApontamento, hasByChecklist } = useApontamentos()

  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [lightboxUrls, setLightboxUrls] = useState<string[]>([])
  const [enviados, setEnviados] = useState<Set<string>>(new Set())

  const enviarParaGerenciar = (itemId: string, itemLabel: string, fotos: string[]) => {
    if (hasByChecklist(row.id, itemId)) return
    const hoje = new Date()
    const prazo = new Date(hoje)
    prazo.setDate(prazo.getDate() + 7)
    const toISO = (d: Date) => d.toISOString().slice(0, 10)

    addApontamento({
      veiculoId:      `placa-${(placa || 'desconhecido').toLowerCase()}`,
      veiculoLabel:   placa ? `${row.dados_veiculo?.prefixo ?? ''} · ${placa}`.trim().replace(/^·\s*/, '') : row.nome_operador,
      prefixo:        row.dados_veiculo?.prefixo ?? '',
      defeito:        `[Checklist NC] ${itemLabel}`,
      dataApontamento: toISO(hoje),
      prazo:          toISO(prazo),
      processo:       'Checklist',
      base:           row.dados_veiculo?.localidade ?? '',
      coordenador:    row.nome_supervisor ?? '',
      responsavel:    row.nome_operador,
      checklistId:    row.id,
      ncItemId:       itemId,
      ncFotos:        fotos,
    })
    setEnviados((prev) => new Set(prev).add(itemId))
  }

  const openLightbox = (urls: string[], idx: number) => {
    setLightboxUrls(urls)
    setLightboxIdx(idx)
  }

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
                    onClick={() => openLightbox(fotos, i)}
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
        {lightboxIdx !== null && lightboxUrls.length > 0 && (
          <Lightbox
            urls={lightboxUrls}
            index={lightboxIdx}
            onClose={() => { setLightboxIdx(null); setLightboxUrls([]) }}
            onPrev={() => setLightboxIdx((i) => (i! - 1 + lightboxUrls.length) % lightboxUrls.length)}
            onNext={() => setLightboxIdx((i) => (i! + 1) % lightboxUrls.length)}
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
                  const obsRaw = row.observacoes[item.id] ?? ''
                  const { texto: obsTexto, fotos: obsFotos } = parseObs(obsRaw)
                  const isLast = idx === grupo.itens.length - 1
                  return (
                    <div
                      key={item.id}
                      className={`px-4 py-3 ${!isLast ? 'border-b border-slate-100 dark:border-slate-800' : ''} ${resp === 'nc' ? 'bg-rose-50/50 dark:bg-rose-900/10' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {item.imperativo && <span className="mr-1">🚫</span>}
                            {item.label}
                          </p>
                          {obsTexto && (
                            <p className="mt-0.5 text-xs font-semibold text-rose-500">{obsTexto}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {resp === 'nc' && (() => {
                            const jaEnviado = enviados.has(item.id) || hasByChecklist(row.id, item.id)
                            return (
                              <button
                                type="button"
                                onClick={() => enviarParaGerenciar(item.id, item.label, obsFotos)}
                                disabled={jaEnviado}
                                title={jaEnviado ? 'Já enviado para Gerenciar' : 'Enviar NC para planilha de Gerenciar'}
                                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-extrabold transition ${
                                  jaEnviado
                                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-default'
                                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800'
                                }`}
                              >
                                {jaEnviado ? <CheckCircle2 size={11} /> : <Send size={11} />}
                                {jaEnviado ? 'Enviado' : 'Gerenciar'}
                              </button>
                            )
                          })()}
                          <span className={`rounded-lg px-2 py-0.5 text-xs font-extrabold ${
                            resp === 'c'  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            resp === 'nc' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                            resp === 'na' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' :
                            'bg-slate-100 text-slate-400'
                          }`}>
                            {resp === 'c' ? 'C' : resp === 'nc' ? 'NC' : resp === 'na' ? 'N/A' : '—'}
                          </span>
                        </div>
                      </div>
                      {/* Fotos do item NC inline */}
                      {obsFotos.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {obsFotos.map((url, fi) => (
                            <button
                              key={url}
                              type="button"
                              onClick={() => openLightbox(obsFotos, fi)}
                              className="group relative h-16 w-16 overflow-hidden rounded-lg border-2 border-rose-200 bg-slate-100 shadow-sm transition hover:border-rose-400 dark:border-rose-900/50 dark:bg-slate-800"
                            >
                              <img
                                src={url}
                                alt={`Foto NC ${fi + 1}`}
                                className="h-full w-full object-cover transition group-hover:scale-105"
                              />
                            </button>
                          ))}
                        </div>
                      )}
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
          {(() => {
            const b = TIPO_BADGE[row.tipo]
            return b
              ? <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-extrabold ${b.cls}`}>{b.label}</span>
              : <span className="text-sm font-semibold text-slate-500">{row.tipo}</span>
          })()}
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

const PAGE_SIZE = 100

type OrdemCol = 'data_inspecao' | 'created_at' | 'nc_count' | 'nome_operador'
type OrdemDir = 'asc' | 'desc'

// Agrupa rows por semana ISO e retorna até N semanas mais recentes
function calcSemanas(rows: ChecklistRow[], n = 8) {
  const map = new Map<string, { nc: number; total: number }>()
  for (const r of rows) {
    const d = new Date(r.data_inspecao)
    const day = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((day + 6) % 7))
    const key = monday.toISOString().slice(0, 10)
    const cur = map.get(key) ?? { nc: 0, total: 0 }
    cur.total++
    if (r.nc_count > 0) cur.nc++
    map.set(key, cur)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-n)
    .map(([key, val]) => ({
      label: key.slice(5).replace('-', '/'),
      ...val,
    }))
}

export function ChecklistResultadosPage() {
  const [rows, setRows]               = useState<ChecklistRow[]>([])
  const [carregando, setCarregando]   = useState(true)
  const [exportando, setExportando]   = useState(false)
  const [erro, setErro]               = useState('')
  const [totalRegistros, setTotal]    = useState(0)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [query, setQuery]             = useState('')
  const [queryInput, setQueryInput]   = useState('')
  const [tipoFiltro, setTipoFiltro]   = useState('')
  const [somenteNc, setSomenteNc]     = useState(false)
  const [dataInicio, setDataInicio]   = useState('')
  const [dataFim, setDataFim]         = useState('')
  const [ordemCol, setOrdemCol]       = useState<OrdemCol>('created_at')
  const [ordemDir, setOrdemDir]       = useState<OrdemDir>('desc')
  const [detalhe, setDetalhe]         = useState<ChecklistRow | null>(null)
  const [sparkRows, setSparkRows]     = useState<ChecklistRow[]>([])

  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / PAGE_SIZE))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyFilters = (q: any): any => {
    if (tipoFiltro) q = q.eq('tipo', tipoFiltro)
    if (somenteNc)  q = q.gt('nc_count', 0)
    if (dataInicio) q = q.gte('data_inspecao', dataInicio)
    if (dataFim)    q = q.lte('data_inspecao', dataFim)
    if (query)      q = q.or(`nome_operador.ilike.%${query}%,matricula.ilike.%${query}%`)
    return q
  }

  const buildQuery = (pagina: number) => {
    const from = (pagina - 1) * PAGE_SIZE
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const base: any = supabase
      .from('checklists')
      .select('*', { count: 'exact' })
      .order(ordemCol, { ascending: ordemDir === 'asc' })
      .range(from, from + PAGE_SIZE - 1)
    return applyFilters(base) as ReturnType<typeof supabase.from> & { then: unknown }
  }

  const carregar = async (pagina: number) => {
    setCarregando(true)
    setErro('')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error, count } = await (buildQuery(pagina) as any)
    if (error) {
      setErro('Erro ao carregar dados do Supabase.')
    } else {
      setRows((data as ChecklistRow[]) ?? [])
      setTotal(count ?? 0)
    }
    setCarregando(false)
  }

  // Carrega dados para o sparkline (sem paginação, só últimas 8 semanas)
  const carregarSpark = async () => {
    const oitoSemanas = new Date()
    oitoSemanas.setDate(oitoSemanas.getDate() - 56)
    const { data } = await supabase
      .from('checklists')
      .select('data_inspecao,nc_count')
      .gte('data_inspecao', oitoSemanas.toISOString().slice(0, 10))
      .order('data_inspecao', { ascending: true })
    if (data) setSparkRows(data as ChecklistRow[])
  }

  // Debounce na busca por texto
  useEffect(() => {
    const t = setTimeout(() => setQuery(queryInput), 400)
    return () => clearTimeout(t)
  }, [queryInput])

  // Recarrega página 1 quando filtros/ordem mudam
  useEffect(() => {
    setPaginaAtual(1)
    void carregar(1)
  }, [tipoFiltro, somenteNc, dataInicio, dataFim, query, ordemCol, ordemDir]) // eslint-disable-line react-hooks/exhaustive-deps

  // Carrega nova página quando paginaAtual muda
  useEffect(() => {
    void carregar(paginaAtual)
  }, [paginaAtual]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void carregarSpark() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const irParaPagina = (p: number) => {
    if (p < 1 || p > totalPaginas || p === paginaAtual) return
    setPaginaAtual(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleOrdem = (col: OrdemCol) => {
    if (ordemCol === col) {
      setOrdemDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setOrdemCol(col)
      setOrdemDir('desc')
    }
  }

  const handleExportar = async () => {
    setExportando(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const base: any = supabase
      .from('checklists')
      .select('*')
      .order(ordemCol, { ascending: ordemDir === 'asc' })
      .limit(50000)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (applyFilters(base) as any)
    if (data) exportarCSV(data as ChecklistRow[])
    setExportando(false)
  }

  const filtrados = rows  // filtro de texto já vai pro servidor
  const totalNc = filtrados.reduce((acc, r) => acc + r.nc_count, 0)
  const semanas = useMemo(() => calcSemanas(sparkRows), [sparkRows])

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleExportar()}
            disabled={exportando || carregando}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-900 shadow-soft hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
          >
            <Download size={16} className={exportando ? 'animate-bounce' : ''} />
            {exportando ? 'Exportando...' : 'Exportar CSV'}
          </button>
          <button
            type="button"
            onClick={() => void carregar(paginaAtual)}
            disabled={carregando}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-900 shadow-soft hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
          >
            <RefreshCw size={16} className={carregando ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
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

      {/* Sparkline de tendência NC */}
      <Sparkline semanas={semanas} />

      {/* Filtros */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-3">
          {/* linha 1: busca + tipo + toggle NC */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
              <Search size={15} className="shrink-0 text-slate-400" />
              <input
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Operador, matrícula..."
                className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
              />
            </div>

            <SelectCustom
              value={tipoFiltro}
              onChange={setTipoFiltro}
              options={TIPOS.map((t) => ({ value: t.id, label: t.label }))}
              placeholder="Todos"
            />

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
            {(dataInicio || dataFim || tipoFiltro || somenteNc || queryInput) && (
              <button
                type="button"
                onClick={() => { setDataInicio(''); setDataFim(''); setTipoFiltro(''); setSomenteNc(false); setQueryInput(''); setQuery('') }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400"
              >
                <X size={12} />
                Limpar filtros
              </button>
            )}
            <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <CalendarCheck2 size={14} />
              {totalRegistros.toLocaleString('pt-BR')} resultado{totalRegistros !== 1 ? 's' : ''}
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
              onClick={() => void carregar(paginaAtual)}
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
                  {(
                    [
                      { label: 'Operador', col: 'nome_operador' as OrdemCol },
                      { label: 'Tipo',     col: null },
                      { label: 'Placa',    col: null },
                      { label: 'Data',     col: 'data_inspecao' as OrdemCol },
                      { label: 'Resultado',col: 'nc_count' as OrdemCol },
                    ] as { label: string; col: OrdemCol | null }[]
                  ).map(({ label, col }) => (
                    <th key={label} className="px-4 py-3">
                      {col ? (
                        <button
                          type="button"
                          onClick={() => toggleOrdem(col)}
                          className="inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200"
                        >
                          {label}
                          {ordemCol === col
                            ? (ordemDir === 'desc'
                              ? <ChevronDown size={12} className="text-blue-500" />
                              : <ChevronUp size={12} className="text-blue-500" />)
                            : <ArrowUpDown size={11} className="opacity-40" />}
                        </button>
                      ) : label}
                    </th>
                  ))}
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

      {/* Paginação */}
      {totalPaginas > 1 && !carregando && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => irParaPagina(paginaAtual - 1)}
            disabled={paginaAtual === 1}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-extrabold text-slate-700 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            aria-label="Página anterior"
          >
            <ChevronLeft size={16} />
          </button>

          {(() => {
            const pages: (number | '...')[] = []
            if (totalPaginas <= 7) {
              for (let i = 1; i <= totalPaginas; i++) pages.push(i)
            } else {
              pages.push(1)
              if (paginaAtual > 3) pages.push('...')
              for (let i = Math.max(2, paginaAtual - 1); i <= Math.min(totalPaginas - 1, paginaAtual + 1); i++) pages.push(i)
              if (paginaAtual < totalPaginas - 2) pages.push('...')
              pages.push(totalPaginas)
            }
            return pages.map((p, i) =>
              p === '...'
                ? <span key={`e${i}`} className="flex h-9 w-9 items-center justify-center text-sm text-slate-400 dark:text-slate-600">…</span>
                : <button
                    key={p}
                    type="button"
                    onClick={() => irParaPagina(p as number)}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-extrabold transition ${
                      p === paginaAtual
                        ? 'border-blue-500 bg-blue-500 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900'
                    }`}
                  >
                    {p}
                  </button>
            )
          })()}

          <button
            type="button"
            onClick={() => irParaPagina(paginaAtual + 1)}
            disabled={paginaAtual === totalPaginas}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-extrabold text-slate-700 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            aria-label="Próxima página"
          >
            <ChevronRight size={16} />
          </button>

          <span className="ml-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
            Pág. {paginaAtual} de {totalPaginas.toLocaleString('pt-BR')}
          </span>
        </div>
      )}

      {detalhe && <ModalDetalhe row={detalhe} onClose={() => setDetalhe(null)} />}
    </div>
  )
}
