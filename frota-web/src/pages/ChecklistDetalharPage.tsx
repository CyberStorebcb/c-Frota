import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardX,
  FileDown,
  FileSpreadsheet,
  Camera,
  LayoutGrid,
  List,
  Maximize2,
  MessageSquareWarning,
  Minimize2,
  RefreshCw,
  Trophy,
  Truck,
  X,
} from 'lucide-react'

import {
  generateChecklistDetalharPdf,
  type ChecklistDetalharPdfScope,
} from '../checklists/generateChecklistDetalharPdf'
import { generateChecklistDetalharExcel } from '../checklists/generateChecklistDetalharExcel'
import { generateChecklistDetalharImage, downloadChecklistImage } from '../checklists/generateChecklistDetalharImage'

import { getBasesByGerenciaAndResponsavel, getResponsaveisByGerencia } from '../data/gerenciaMap'
import { TOTAL_VEHICLE_ROWS } from '../data/totalVehiclesFleet.gen'
import { FilterPanel, FilterPanelGroup, FilterSearchField } from '../components/ui/FilterPanel'
import { Select } from '../components/ui/Select'
import { BASE_FILTER_SELECT_OPTIONS } from '../data/baseFilterOptions'
import { COORDENADOR_FILTER_SELECT_OPTIONS } from '../data/coordenadorFilterOptions'
import { SUPERVISOR_FILTER_SELECT_OPTIONS } from '../data/supervisorFilterOptions'
import { RESPONSAVEL_FILTER_SELECT_OPTIONS } from '../data/responsavelFilterOptions'
import { PREFIXO_FILTER_SELECT_OPTIONS } from '../data/prefixoFilterOptions'
import { TIPO_FILTER_SELECT_OPTIONS } from '../data/tipoFilterOptions'
import { ChecklistTop10Section, CHECKLIST_TOP10_GROUP_OPTIONS, buildChecklistAdherenceRanking, type ChecklistTop10GroupBy } from '../components/checklist/ChecklistTop10Section'
import { listDaysInPeriod } from '../checklists/checklistTop10Ranking'
import { buildActiveFleetMap, passesChecklistFleetFilters } from '../checklists/checklistFleetScope'
import { fetchCompletedChecklistsInPeriod } from '../checklists/fetchChecklistCompletions'
import { downloadDataUrl, generateRankingScreenshot } from '../checklists/generateRankingScreenshot'
import { useFleet } from '../frota/FleetContext'
import { useAuth } from '../auth/AuthContext'
import { ChecklistAusenciaJustificar } from '../components/checklist/ChecklistAusenciaJustificar'
import {
  loadChecklistAusenciaJustificativas,
  removeChecklistAusenciaJustificativa,
  saveChecklistAusenciaJustificativa,
  type ChecklistAusenciaJustificativaEntry,
  type ChecklistAusenciaMotivo,
} from '../checklists/checklistAusenciaJustificativa'
import { formatPlaca, normalizePlaca } from '../frota/vehicleRegistry'
import { supabase } from '../lib/supabase'

// ─── helpers ───────────────────────────────────────────────────────────────

function normNome(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
}

function hojeLocalIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dateToLocalIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatIsoDateBR(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
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

const FILTROS_STORAGE_KEY_OP = 'frota.filtros.checklist-detalhar.v1'
const FILTROS_STORAGE_KEY_ADM = 'frota.filtros.checklist-detalhar.adm.v1'
const FILTROS_VISIBLE_LEGACY_KEY = 'frota.filtros.checklist-detalhar'

type ViewMode = 'cards' | 'list' | 'ranking' | 'justificados'
type DisplayMode = 'cards' | 'list'
type SectionView = 'resultados' | 'ranking' | 'justificados'
type SetorVeiculoPagina = 'operacional' | 'adm'

function parseSavedSectionView(saved?: ViewMode, isAdmin?: boolean): SectionView {
  if (saved === 'ranking' && isAdmin) return 'ranking'
  if (saved === 'justificados') return 'justificados'
  return 'resultados'
}

function parseSavedDisplayMode(saved?: ViewMode): DisplayMode {
  if (saved === 'cards') return 'cards'
  return 'list'
}

function toSavedViewMode(display: DisplayMode, section: SectionView): ViewMode {
  if (section === 'ranking') return 'ranking'
  if (section === 'justificados') return 'justificados'
  return display
}

type ChecklistDetalharFiltersState = {
  periodo: string
  customDesde: string
  customAte: string
  base: string
  gerencia: string
  responsavel: string
  supervisor: string
  tipo: string
  prefixo: string
  busca: string
  filtrosVisiveis: boolean
  viewMode: ViewMode
}

function filtersStorageKey(setorVeiculo: SetorVeiculoPagina) {
  return setorVeiculo === 'adm' ? FILTROS_STORAGE_KEY_ADM : FILTROS_STORAGE_KEY_OP
}

function loadChecklistDetalharFilters(setorVeiculo: SetorVeiculoPagina): Partial<ChecklistDetalharFiltersState> | null {
  try {
    const raw = localStorage.getItem(filtersStorageKey(setorVeiculo))
    if (raw) return JSON.parse(raw) as Partial<ChecklistDetalharFiltersState>
    if (setorVeiculo === 'operacional') {
      const legacyVisible = localStorage.getItem(FILTROS_VISIBLE_LEGACY_KEY)
      if (legacyVisible != null) return { filtrosVisiveis: legacyVisible === 'true' }
    }
  } catch {
    /* ignore */
  }
  return null
}

function saveChecklistDetalharFilters(setorVeiculo: SetorVeiculoPagina, state: ChecklistDetalharFiltersState) {
  try {
    localStorage.setItem(filtersStorageKey(setorVeiculo), JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

function pickFilter(
  urlValue: string | null,
  saved: Partial<ChecklistDetalharFiltersState> | null | undefined,
  savedKey: keyof Omit<ChecklistDetalharFiltersState, 'filtrosVisiveis' | 'busca'>,
  fallback: string,
) {
  if (urlValue != null && urlValue !== '') return urlValue
  const savedValue = saved?.[savedKey]
  return typeof savedValue === 'string' ? savedValue : fallback
}

// ─── tipos ─────────────────────────────────────────────────────────────────

type VeiculoRow = {
  placa: string
  modelo: string
  base: string
  supervisor: string
  coordenador: string
  responsavel: string
  processo: string
  tipo: string
  prefixo: string
  diasRealizados?: number
  diasNoPeriodo?: number
}

type ChecklistRow = {
  placa: string
  modelo: string
  base: string
  supervisor: string
  coordenador: string
  responsavel: string
  processo: string
  tipo: string
  prefixo: string
  data: string
  dataFormatada: string
  hora: string
  temNc: boolean
  diasRealizados: number
  diasNoPeriodo: number
}

function buildVeiculoRowSearchBlob(v: VeiculoRow): string {
  return [
    v.placa,
    v.base,
    v.modelo,
    v.prefixo,
    v.supervisor,
    v.coordenador,
    v.responsavel,
    v.processo,
    v.tipo,
    v.diasRealizados != null ? String(v.diasRealizados) : '',
    v.diasNoPeriodo != null ? String(v.diasNoPeriodo) : '',
    v.diasNoPeriodo != null ? `${v.diasRealizados ?? 0}/${v.diasNoPeriodo}` : '',
  ]
    .join(' ')
    .toUpperCase()
}

function buildChecklistRowSearchBlob(v: ChecklistRow): string {
  return [
    v.placa,
    v.base,
    v.modelo,
    v.prefixo,
    v.data,
    v.dataFormatada,
    v.hora,
    v.supervisor,
    v.coordenador,
    v.responsavel,
    v.processo,
    v.tipo,
    v.temNc ? 'NC NÃO CONFORMIDADE' : 'OK',
    String(v.diasRealizados),
    String(v.diasNoPeriodo),
    `${v.diasRealizados}/${v.diasNoPeriodo}`,
  ]
    .join(' ')
    .toUpperCase()
}

function matchesDetalharBusca(blob: string, query: string): boolean {
  if (!query) return true
  return blob.includes(query)
}

type JustificadoRow = VeiculoRow & { motivo: ChecklistAusenciaMotivo; placaReserva?: string }

function JustificadoMotivoBadge({ motivo, placaReserva }: { motivo: ChecklistAusenciaMotivo; placaReserva?: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
      {motivo}
      {motivo === 'RESERVA' && placaReserva ? (
        <span className="font-bold normal-case tracking-normal text-amber-900/90 dark:text-amber-100">
          · {formatPlaca(placaReserva)}
        </span>
      ) : null}
    </span>
  )
}

function ListaJustificados({
  items,
  isAdmin,
  savingPlaca,
  onAlterarMotivo,
  onRemover,
}: {
  items: JustificadoRow[]
  isAdmin?: boolean
  savingPlaca?: string | null
  onAlterarMotivo?: (placa: string, motivo: ChecklistAusenciaMotivo, placaReserva?: string) => void
  onRemover?: (placa: string) => void
}) {
  return (
    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
      <table className="w-full min-w-[680px] border-collapse text-left">
        <thead className="sticky top-0 z-[1] bg-amber-50/95 text-[9px] font-black uppercase tracking-wider text-amber-800 backdrop-blur dark:bg-amber-950/90 dark:text-amber-200">
          <tr className="border-b border-amber-100 dark:border-amber-950/50">
            <th className="px-3 py-2.5">Placa</th>
            <th className="px-3 py-2.5">Motivo</th>
            <th className="px-3 py-2.5">Reserva</th>
            <th className="px-3 py-2.5">Base</th>
            <th className="px-3 py-2.5">Modelo</th>
            <th className="px-3 py-2.5">Prefixo</th>
            <th className="px-3 py-2.5">Supervisor</th>
            <th className="px-3 py-2.5">Gerência</th>
            {isAdmin ? <th className="px-3 py-2.5 text-right">Ações</th> : null}
          </tr>
        </thead>
        <tbody>
          {items.map((v) => (
            <tr
              key={v.placa}
              className="border-b border-slate-100 transition hover:bg-amber-50/40 dark:border-slate-800 dark:hover:bg-amber-950/10"
            >
              <td className="px-3 py-2 text-xs font-black tracking-wide text-slate-950 dark:text-white">{v.placa}</td>
              <td className="px-3 py-2">
                <JustificadoMotivoBadge motivo={v.motivo} placaReserva={v.placaReserva} />
              </td>
              <td className="px-3 py-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                {v.motivo === 'RESERVA' && v.placaReserva ? formatPlaca(v.placaReserva) : '—'}
              </td>
              <td className="px-3 py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">{v.base || '—'}</td>
              <td className="max-w-[140px] truncate px-3 py-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">{v.modelo}</td>
              <td className="max-w-[140px] truncate px-3 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{v.prefixo || '—'}</td>
              <td className="max-w-[120px] truncate px-3 py-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">{v.supervisor || '—'}</td>
              <td className="max-w-[120px] truncate px-3 py-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">{v.coordenador || '—'}</td>
              {isAdmin ? (
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-2">
                    <ChecklistAusenciaJustificar
                      placa={v.placa}
                      motivoAtual={v.motivo}
                      placaReservaAtual={v.placaReserva}
                      saving={savingPlaca === v.placa}
                      onSelect={(motivo, placaReserva) => onAlterarMotivo?.(v.placa, motivo, placaReserva)}
                    />
                    <button
                      type="button"
                      disabled={savingPlaca === v.placa}
                      onClick={() => onRemover?.(v.placa)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-rose-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                      title="Remover justificativa e voltar para Não realizaram"
                    >
                      Remover
                    </button>
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function JustificadosPanel({
  items,
  countLabel,
  subtitle,
  displayMode,
  isAdmin,
  isFullscreen,
  savingPlaca,
  onAlterarMotivo,
  onRemover,
  emptyMessage,
  expanded,
}: {
  items: JustificadoRow[]
  countLabel: number
  subtitle: string
  displayMode: DisplayMode
  isAdmin?: boolean
  isFullscreen?: boolean
  savingPlaca?: string | null
  onAlterarMotivo?: (placa: string, motivo: ChecklistAusenciaMotivo, placaReserva?: string) => void
  onRemover?: (placa: string) => void
  emptyMessage: string
  expanded?: boolean
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      id="justificados-section"
      className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-amber-200/80 bg-white shadow-soft dark:border-amber-950/60 dark:bg-slate-900 ${
        collapsed
          ? ''
          : expanded
            ? isFullscreen
              ? 'min-h-0 flex-1'
              : 'min-h-[320px] flex-1 xl:min-h-0'
            : isFullscreen
              ? 'max-h-[40vh]'
              : 'min-h-[200px]'
      }`}
    >
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-amber-100 bg-amber-50/85 px-4 py-3 backdrop-blur dark:border-amber-950/50 dark:bg-amber-950/25">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-amber-600 shadow-sm dark:bg-slate-950">
          <MessageSquareWarning size={15} />
        </span>
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-200">Justificados</span>
          <p className="text-[10px] font-semibold text-amber-700/70 dark:text-amber-300/60">{subtitle}</p>
        </div>
        <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          {countLabel}
        </span>
        {!expanded && (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Mostrar justificados' : 'Ocultar justificados'}
            className="ml-1 grid h-7 w-7 place-items-center rounded-lg text-amber-500 transition hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-950/60 dark:hover:text-amber-300"
          >
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
            />
          </button>
        )}
      </div>

      {!collapsed && (
      <>
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-14 text-slate-400">
          <MessageSquareWarning size={28} className="text-amber-400/80" />
          <p className="text-xs font-semibold">{emptyMessage}</p>
        </div>
      ) : displayMode === 'list' ? (
        <ListaJustificados
          items={items}
          isAdmin={isAdmin}
          savingPlaca={savingPlaca}
          onAlterarMotivo={onAlterarMotivo}
          onRemover={onRemover}
        />
      ) : (
        <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {items.map((v) => (
            <div
              key={v.placa}
              className="relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/40 p-3.5 shadow-sm dark:border-amber-950/40 dark:from-slate-950 dark:to-amber-950/10"
            >
              <div className="absolute inset-y-0 left-0 w-1 bg-amber-400/80 dark:bg-amber-500/70" />
              <div className="flex items-start gap-3 pl-1">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black tracking-wide text-slate-950 dark:text-white">{v.placa}</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                      {v.motivo}
                    </span>
                    {v.motivo === 'RESERVA' && v.placaReserva ? (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-black text-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
                        Reserva {formatPlaca(v.placaReserva)}
                      </span>
                    ) : null}
                    {v.base ? (
                      <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {v.base}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{v.modelo}</p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {v.supervisor || '—'} · {v.coordenador || '—'}
                  </p>
                </div>
                {isAdmin ? (
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <ChecklistAusenciaJustificar
                      placa={v.placa}
                      motivoAtual={v.motivo}
                      placaReservaAtual={v.placaReserva}
                      saving={savingPlaca === v.placa}
                      onSelect={(motivo, placaReserva) => onAlterarMotivo?.(v.placa, motivo, placaReserva)}
                    />
                    <button
                      type="button"
                      disabled={savingPlaca === v.placa}
                      onClick={() => onRemover?.(v.placa)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                      Remover
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
      </>
      )}
    </div>
  )
}

function ListaNaoRealizaram({
  items,
  multiDia,
  showJustificar,
  justificativas,
  savingPlaca,
  onJustificar,
}: {
  items: VeiculoRow[]
  multiDia: boolean
  showJustificar?: boolean
  justificativas?: Map<string, ChecklistAusenciaJustificativaEntry>
  savingPlaca?: string | null
  onJustificar?: (placa: string, motivo: ChecklistAusenciaMotivo, placaReserva?: string) => void
}) {
  return (
    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
      <table className="w-full min-w-[620px] border-collapse text-left">
        <thead className="sticky top-0 z-[1] bg-rose-50/95 text-[9px] font-black uppercase tracking-wider text-rose-700 backdrop-blur dark:bg-rose-950/90 dark:text-rose-300">
          <tr className="border-b border-rose-100 dark:border-rose-950/50">
            <th className="px-3 py-2.5">Placa</th>
            <th className="px-3 py-2.5">Base</th>
            <th className="px-3 py-2.5">Modelo</th>
            <th className="px-3 py-2.5">Prefixo</th>
            {multiDia && <th className="px-3 py-2.5">Dias</th>}
            <th className="px-3 py-2.5">Supervisor</th>
            <th className="px-3 py-2.5">Gerência</th>
            {showJustificar ? <th className="px-3 py-2.5 text-right">Justificativa</th> : null}
          </tr>
        </thead>
        <tbody>
          {items.map((v) => (
            <tr
              key={v.placa}
              className="border-b border-slate-100 transition hover:bg-rose-50/50 dark:border-slate-800 dark:hover:bg-rose-950/15"
            >
              <td className="px-3 py-2 text-xs font-black tracking-wide text-slate-950 dark:text-white">{v.placa}</td>
              <td className="px-3 py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">{v.base || '—'}</td>
              <td className="max-w-[140px] truncate px-3 py-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">{v.modelo}</td>
              <td className="max-w-[140px] truncate px-3 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{v.prefixo || '—'}</td>
              {multiDia && (
                <td className="px-3 py-2 text-[11px] font-black text-rose-600 dark:text-rose-300">
                  0/{v.diasNoPeriodo ?? '—'}
                </td>
              )}
              <td className="max-w-[120px] truncate px-3 py-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">{v.supervisor || '—'}</td>
              <td className="max-w-[120px] truncate px-3 py-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">{v.coordenador || '—'}</td>
              {showJustificar ? (
                <td className="px-3 py-2 text-right">
                  <ChecklistAusenciaJustificar
                    placa={v.placa}
                    motivoAtual={justificativas?.get(v.placa)?.motivo ?? null}
                    placaReservaAtual={justificativas?.get(v.placa)?.placaReserva}
                    saving={savingPlaca === v.placa}
                    onSelect={(motivo, placaReserva) => onJustificar?.(v.placa, motivo, placaReserva)}
                  />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ListaRealizaram({ items, multiDia }: { items: ChecklistRow[]; multiDia: boolean }) {
  return (
    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead className="sticky top-0 z-[1] bg-emerald-50/95 text-[9px] font-black uppercase tracking-wider text-emerald-700 backdrop-blur dark:bg-emerald-950/90 dark:text-emerald-300">
          <tr className="border-b border-emerald-100 dark:border-emerald-950/50">
            <th className="px-3 py-2.5">Placa</th>
            <th className="px-3 py-2.5">Base</th>
            <th className="px-3 py-2.5">Modelo</th>
            <th className="px-3 py-2.5">Prefixo</th>
            <th className="px-3 py-2.5">Data</th>
            <th className="px-3 py-2.5">Hora</th>
            {multiDia && <th className="px-3 py-2.5">Dias</th>}
            <th className="px-3 py-2.5">NC</th>
            <th className="px-3 py-2.5">Supervisor</th>
            <th className="px-3 py-2.5">Gerência</th>
          </tr>
        </thead>
        <tbody>
          {items.map((v) => (
            <tr
              key={v.placa}
              className="border-b border-slate-100 transition hover:bg-emerald-50/50 dark:border-slate-800 dark:hover:bg-emerald-950/15"
            >
              <td className="px-3 py-2 text-xs font-black tracking-wide text-slate-950 dark:text-white">{v.placa}</td>
              <td className="px-3 py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">{v.base || '—'}</td>
              <td className="max-w-[140px] truncate px-3 py-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">{v.modelo}</td>
              <td className="max-w-[140px] truncate px-3 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{v.prefixo || '—'}</td>
              <td className="px-3 py-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">{v.dataFormatada}</td>
              <td className="px-3 py-2 text-[11px] font-black text-emerald-700 dark:text-emerald-300">{v.hora}</td>
              {multiDia && (
                <td className="px-3 py-2 text-[11px] font-black text-emerald-700 dark:text-emerald-300">
                  {v.diasRealizados}/{v.diasNoPeriodo}
                </td>
              )}
              <td className="px-3 py-2">
                {v.temNc ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">NC</span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400">—</span>
                )}
              </td>
              <td className="max-w-[120px] truncate px-3 py-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">{v.supervisor || '—'}</td>
              <td className="max-w-[120px] truncate px-3 py-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">{v.coordenador || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── componente ────────────────────────────────────────────────────────────

export function ChecklistDetalharPage({ setorVeiculo }: { setorVeiculo: SetorVeiculoPagina }) {
  const [searchParams] = useSearchParams()
  const savedFilters = useMemo(() => loadChecklistDetalharFilters(setorVeiculo), [setorVeiculo])
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const isAdmPage = setorVeiculo === 'adm'
  const outraPaginaPath = isAdmPage
    ? `/checklists/detalhar?${searchParams.toString()}`
    : `/checklists/detalhar/adm?${searchParams.toString()}`
  const outraPaginaLabel = isAdmPage ? 'Operacionais' : 'Administrativos'

  // URL do dashboard tem prioridade; senão restaura o último estado salvo pelo usuário
  const [periodo, setPeriodo] = useState(() => pickFilter(searchParams.get('periodo'), savedFilters, 'periodo', 'hoje'))
  const [customDesde, setCustomDesde] = useState(() =>
    pickFilter(searchParams.get('desde'), savedFilters, 'customDesde', defaultDesde()),
  )
  const [customAte, setCustomAte] = useState(() =>
    pickFilter(searchParams.get('ate'), savedFilters, 'customAte', hojeLocalIso()),
  )
  const [filtroBase, setFiltroBase] = useState(() => pickFilter(searchParams.get('base'), savedFilters, 'base', 'todos'))
  const [filtroCoordenador, setFiltroCoordenador] = useState(() =>
    pickFilter(searchParams.get('gerencia'), savedFilters, 'gerencia', 'todos'),
  )
  const [filtroResponsavel, setFiltroResponsavel] = useState(() =>
    pickFilter(searchParams.get('responsavel'), savedFilters, 'responsavel', 'todos'),
  )
  const [filtroSupervisor, setFiltroSupervisor] = useState(() =>
    pickFilter(searchParams.get('supervisor'), savedFilters, 'supervisor', 'todos'),
  )
  const [filtroTipo, setFiltroTipo] = useState(() =>
    pickFilter(searchParams.get('tipo'), savedFilters, 'tipo', 'todos'),
  )
  const [filtroPrefixo, setFiltroPrefixo] = useState(() => {
    const v = pickFilter(searchParams.get('prefixo'), savedFilters, 'prefixo', 'todos')
    return v === '' ? 'todos' : v
  })
  const [busca, setBusca] = useState(() => savedFilters?.busca ?? '')
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(() => savedFilters?.filtrosVisiveis ?? false)
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => parseSavedDisplayMode(savedFilters?.viewMode))
  const [sectionView, setSectionView] = useState<SectionView>(() => parseSavedSectionView(savedFilters?.viewMode, isAdmin))
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [focusedSide, setFocusedSide] = useState<null | 'nao' | 'sim'>(null)
  const [justificativas, setJustificativas] = useState<Map<string, ChecklistAusenciaJustificativaEntry>>(() => new Map())
  const [justificativaSavingPlaca, setJustificativaSavingPlaca] = useState<string | null>(null)
  const [pdfModalOpen, setPdfModalOpen] = useState(false)
  const [excelModalOpen, setExcelModalOpen] = useState(false)
  const [fotoModalOpen, setFotoModalOpen] = useState(false)
  const [pdfGerando, setPdfGerando] = useState(false)
  const [excelGerando, setExcelGerando] = useState(false)
  const [fotoGerando, setFotoGerando] = useState(false)
  const [capturandoFoto, setCapturandoFoto] = useState(false)
  const [rankingGroupBy, setRankingGroupBy] = useState<ChecklistTop10GroupBy>('responsavel')
  const columnsRef = useRef<HTMLDivElement>(null)

  const { vehicles: allVehicles } = useFleet()

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const el = columnsRef.current
    if (!el) return
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await el.requestFullscreen()
    } catch {
      /* navegador bloqueou */
    }
  }, [])

  useEffect(() => {
    saveChecklistDetalharFilters(setorVeiculo, {
      periodo,
      customDesde,
      customAte,
      base: filtroBase,
      gerencia: filtroCoordenador,
      responsavel: filtroResponsavel,
      supervisor: filtroSupervisor,
      tipo: filtroTipo,
      prefixo: filtroPrefixo,
      busca,
      filtrosVisiveis,
      viewMode: toSavedViewMode(displayMode, sectionView),
    })
  }, [
    setorVeiculo,
    periodo,
    customDesde,
    customAte,
    filtroBase,
    filtroCoordenador,
    filtroResponsavel,
    filtroSupervisor,
    filtroTipo,
    filtroPrefixo,
    busca,
    filtrosVisiveis,
    displayMode,
    sectionView,
  ])

  const limites = useMemo(
    () => computeLimites(periodo, customDesde, customAte),
    [periodo, customDesde, customAte],
  )

  const showJustificarNaoRealizaram = isAdmin && focusedSide === 'nao'

  useEffect(() => {
    let cancelled = false
    void loadChecklistAusenciaJustificativas({
      periodoInicio: limites.ini,
      periodoFim: limites.fim,
      setor: setorVeiculo,
    }).then((map) => {
      if (!cancelled) setJustificativas(map)
    })
    return () => {
      cancelled = true
    }
  }, [limites.ini, limites.fim, setorVeiculo])

  const salvarJustificativa = useCallback(
    async (placa: string, motivo: ChecklistAusenciaMotivo, placaReserva?: string) => {
      setJustificativaSavingPlaca(placa)

      if (motivo === 'DESMOBILIZADO') {
        const placaNorm = normalizePlaca(placa)
        const { error: desmobError } = await supabase
          .from('vehicles')
          .update({ deleted_at: new Date().toISOString() })
          .eq('placa', placaNorm)
          .is('deleted_at', null)
        if (desmobError) {
          setJustificativaSavingPlaca(null)
          window.alert(`Erro ao desmobilizar veículo: ${desmobError.message}`)
          return
        }
      }

      const res = await saveChecklistAusenciaJustificativa({
        placa,
        motivo,
        placaReserva,
        periodoInicio: limites.ini,
        periodoFim: limites.fim,
        setor: setorVeiculo,
      })
      setJustificativaSavingPlaca(null)
      if (!res.ok) {
        window.alert(res.message)
        return
      }
      setJustificativas((prev) => {
        const next = new Map(prev)
        next.set(placa, { motivo, placaReserva: motivo === 'RESERVA' ? placaReserva : undefined })
        return next
      })
    },
    [limites.ini, limites.fim, setorVeiculo],
  )

  const removerJustificativa = useCallback(
    async (placa: string) => {
      setJustificativaSavingPlaca(placa)
      const res = await removeChecklistAusenciaJustificativa({
        placa,
        periodoInicio: limites.ini,
        periodoFim: limites.fim,
        setor: setorVeiculo,
      })
      setJustificativaSavingPlaca(null)
      if (!res.ok) {
        window.alert(res.message)
        return
      }
      setJustificativas((prev) => {
        const next = new Map(prev)
        next.delete(placa)
        return next
      })
    },
    [limites.ini, limites.fim, setorVeiculo],
  )

  // ── frota ATIVA — mesmo critério do Dashboard (ATIVOS + TRANSPORTE) ──
  const frotaMap = useMemo(() => {
    const activeMap = buildActiveFleetMap(allVehicles)
    const m = new Map<string, VeiculoRow>()
    for (const v of allVehicles) {
      const placa = normPlaca(v.placa)
      const active = activeMap.get(placa)
      if (!active) continue
      m.set(placa, {
        placa,
        modelo: v.modelo ?? '—',
        base: active.base,
        supervisor: active.supervisor,
        coordenador: active.coordenador,
        responsavel: active.responsavel,
        processo: v.prefixo ?? '',
        tipo: active.tipo,
        prefixo: active.prefixo,
      })
    }
    return m
  }, [allVehicles])

  const operacionalPlacasSet = useMemo(() => {
    const op = new Set<string>()
    for (const row of TOTAL_VEHICLE_ROWS) {
      if (row.setor?.trim().toUpperCase() === 'OPERACIONAL') {
        const p = normPlaca(row.placa)
        if (p) op.add(p)
      }
    }
    return op
  }, [])

  const admPlacasSet = useMemo(() => {
    const adm = new Set<string>()
    for (const row of TOTAL_VEHICLE_ROWS) {
      if (row.setor?.trim().toUpperCase() === 'ADM') {
        const p = normPlaca(row.placa)
        if (p) adm.add(p)
      }
    }
    return adm
  }, [])

  const setorPlacasSet = useMemo(
    () => (setorVeiculo === 'adm' ? admPlacasSet : operacionalPlacasSet),
    [setorVeiculo, admPlacasSet, operacionalPlacasSet],
  )

  const setorVeiculoLabel = isAdmPage ? 'administrativos' : 'operacionais'

  // ── checklists do período ─────────────────────────────────────────────────
  const [rawChecklists, setRawChecklists] = useState<ChecklistRow[]>([])
  const [checklistCompletionsByDay, setChecklistCompletionsByDay] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(true)

  const periodDays = useMemo(() => listDaysInPeriod(limites.ini, limites.fim), [limites])
  const diasNoPeriodo = periodDays.length

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    void fetchCompletedChecklistsInPeriod(limites.ini, limites.fim)
      .then((data) => {
        if (cancelled) return
        if (!data.length) {
          setRawChecklists([])
          setChecklistCompletionsByDay(new Set())
          setLoading(false)
          return
        }

        const completions = new Set<string>()
        const seen = new Map<string, ChecklistRow>()
        const sortedRows = [...data].sort((a, b) => {
          const ta = a.created_at ? new Date(String(a.created_at)).getTime() : 0
          const tb = b.created_at ? new Date(String(b.created_at)).getTime() : 0
          return tb - ta
        })
        for (const row of sortedRows) {
          const dv = row.dados_veiculo && typeof row.dados_veiculo === 'object'
            ? (row.dados_veiculo as Record<string, unknown>)
            : {}
          const placa = normPlaca(String(dv.placa ?? ''))
          if (!placa) continue
          const frotaInfo = frotaMap.get(placa)
          if (!frotaInfo) continue
          const dataInspecao = (row.data_inspecao as string).slice(0, 10)
          if (dataInspecao) completions.add(`${placa}|${dataInspecao}`)
          if (seen.has(placa)) continue
          seen.set(placa, {
            placa,
            modelo: String(dv.modelo ?? dv.veiculo ?? frotaInfo?.modelo ?? '—'),
            base: frotaInfo?.base ?? String(dv.base ?? ''),
            supervisor: frotaInfo?.supervisor ?? '',
            coordenador: frotaInfo?.coordenador ?? '',
            responsavel: frotaInfo?.responsavel ?? '',
            processo: frotaInfo?.processo ?? '',
            tipo: frotaInfo?.tipo ?? '',
            prefixo: frotaInfo?.prefixo ?? '',
            data: dataInspecao,
            dataFormatada: formatIsoDateBR(dataInspecao),
            hora: row.created_at
              ? new Date(row.created_at as string).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              : '—',
            temNc: (row.nc_count as number) > 0,
            diasRealizados: 1,
            diasNoPeriodo: 1,
          })
        }
        setChecklistCompletionsByDay(completions)
        setRawChecklists(Array.from(seen.values()))
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setRawChecklists([])
        setChecklistCompletionsByDay(new Set())
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [limites, frotaMap])

  // ── aplicar filtros ───────────────────────────────────────────────────────
  const passaFiltros = useCallback(
    (r: { placa?: string; base: string; supervisor: string; coordenador: string; responsavel: string; tipo?: string; prefixo?: string }) =>
      passesChecklistFleetFilters({ tipo: '', prefixo: '', placa: r.placa ?? '', ...r }, {
        base: filtroBase,
        supervisor: filtroSupervisor,
        coordenador: filtroCoordenador,
        responsavel: filtroResponsavel,
        tipo: filtroTipo,
        prefixo: filtroPrefixo,
      }),
    [filtroBase, filtroResponsavel, filtroSupervisor, filtroCoordenador, filtroTipo, filtroPrefixo],
  )

  const diasRealizadosPorPlaca = useMemo(() => {
    const map = new Map<string, number>()
    for (const key of checklistCompletionsByDay) {
      const pipeIdx = key.lastIndexOf('|')
      const placa = key.slice(0, pipeIdx)
      const v = frotaMap.get(placa)
      if (!v || !passaFiltros(v)) continue
      map.set(placa, (map.get(placa) ?? 0) + 1)
    }
    return map
  }, [checklistCompletionsByDay, frotaMap, passaFiltros])

  const placasRealizaram = useMemo(
    () => rawChecklists
      .filter(passaFiltros)
      .map((r) => ({
        ...r,
        dataFormatada: formatIsoDateBR(r.data),
        diasRealizados: diasRealizadosPorPlaca.get(r.placa) ?? 1,
        diasNoPeriodo: diasNoPeriodo,
      })),
    [rawChecklists, passaFiltros, diasRealizadosPorPlaca, diasNoPeriodo],
  )

  const placasRealizaramSet = useMemo(
    () => new Set(placasRealizaram.map((r) => r.placa)),
    [placasRealizaram],
  )

  const placasRealizaramLista = useMemo(
    () => placasRealizaram.filter((r) => setorPlacasSet.has(r.placa)),
    [placasRealizaram, setorPlacasSet],
  )

  const placasNaoRealizaramLista = useMemo(
    () => Array.from(frotaMap.values())
      .filter(
        (v) =>
          !placasRealizaramSet.has(v.placa) &&
          !justificativas.has(v.placa) &&
          passaFiltros(v) &&
          setorPlacasSet.has(v.placa),
      )
      .map((v) => ({
        ...v,
        diasRealizados: 0,
        diasNoPeriodo: diasNoPeriodo,
      })),
    [frotaMap, placasRealizaramSet, justificativas, passaFiltros, diasNoPeriodo, setorPlacasSet],
  )

  const frotaFiltrada = useMemo(
    () => Array.from(frotaMap.values()).filter(passaFiltros),
    [frotaMap, passaFiltros],
  )

  const frotaFiltradaSetor = useMemo(
    () => frotaFiltrada.filter((v) => setorPlacasSet.has(v.placa)),
    [frotaFiltrada, setorPlacasSet],
  )

  // ── busca ─────────────────────────────────────────────────────────────────
  const q = busca.trim().toUpperCase()

  const realizaramFiltrados = useMemo(() => {
    if (!q) return placasRealizaramLista
    return placasRealizaramLista.filter((r) => matchesDetalharBusca(buildChecklistRowSearchBlob(r), q))
  }, [placasRealizaramLista, q])

  const naoRealizaramFiltrados = useMemo(() => {
    if (!q) return placasNaoRealizaramLista
    return placasNaoRealizaramLista.filter((r) => matchesDetalharBusca(buildVeiculoRowSearchBlob(r), q))
  }, [placasNaoRealizaramLista, q])

  const placasJustificadasLista = useMemo(
    () =>
      Array.from(frotaMap.values())
        .filter(
          (v) =>
            !placasRealizaramSet.has(v.placa) &&
            justificativas.has(v.placa) &&
            passaFiltros(v) &&
            setorPlacasSet.has(v.placa),
        )
        .map((v) => {
          const entry = justificativas.get(v.placa)!
          return {
            ...v,
            motivo: entry.motivo,
            placaReserva: entry.placaReserva,
            diasRealizados: 0,
            diasNoPeriodo: diasNoPeriodo,
          }
        }),
    [frotaMap, placasRealizaramSet, justificativas, passaFiltros, diasNoPeriodo, setorPlacasSet],
  )

  const justificadosFiltrados = useMemo(() => {
    if (!q) return placasJustificadasLista
    return placasJustificadasLista.filter(
      (r) =>
        matchesDetalharBusca(buildVeiculoRowSearchBlob(r), q) ||
        r.motivo.toUpperCase().includes(q) ||
        (r.placaReserva ? formatPlaca(r.placaReserva).toUpperCase().includes(q) : false),
    )
  }, [placasJustificadasLista, q])

  const operacionaisAtivos = useMemo(
    () => frotaFiltrada.filter((v) => operacionalPlacasSet.has(v.placa)).length,
    [frotaFiltrada, operacionalPlacasSet],
  )

  const admAtivos = useMemo(
    () => frotaFiltrada.filter((v) => admPlacasSet.has(v.placa)).length,
    [frotaFiltrada, admPlacasSet],
  )

  const ativosSetor = isAdmPage ? admAtivos : operacionaisAtivos

  const realizaramSetorCount = useMemo(
    () => placasRealizaram.filter((r) => setorPlacasSet.has(r.placa)).length,
    [placasRealizaram, setorPlacasSet],
  )

  const naoRealizaramCardCount = placasNaoRealizaramLista.length

  const justificadosSetorCount = useMemo(() => {
    let n = 0
    for (const placa of justificativas.keys()) {
      if (setorPlacasSet.has(placa)) n += 1
    }
    return n
  }, [justificativas, setorPlacasSet])

  const total = ativosSetor

  const aderenciaStats = useMemo(() => {
    let realizados = 0
    for (const [placa, count] of diasRealizadosPorPlaca) {
      if (!setorPlacasSet.has(placa)) continue
      realizados += count
    }
    const veiculosContabilizados = Math.max(0, ativosSetor - justificadosSetorCount)
    const esperados = veiculosContabilizados * periodDays.length
    const pct = esperados > 0 ? Math.min(100, Math.round((realizados / esperados) * 100)) : 0
    return { realizados, esperados, pct }
  }, [diasRealizadosPorPlaca, ativosSetor, justificadosSetorCount, periodDays, setorPlacasSet])

  const pct = aderenciaStats.pct
  const periodoLabel = PERIODO_OPTIONS.find((o) => o.value === periodo)?.label ?? 'Período'
  const periodoResumo = limites.ini === limites.fim
    ? formatIsoDateBR(limites.ini)
    : `${formatIsoDateBR(limites.ini)} a ${formatIsoDateBR(limites.fim)}`
  const multiDia = diasNoPeriodo > 1
  const subtitleNao = multiDia
    ? `Sem checklist entre ${periodoResumo} · 0/${diasNoPeriodo} dias`
    : `Sem checklist em ${periodoResumo}`
  const subtitleSim = multiDia
    ? `Último envio entre ${periodoResumo} · dias realizados no período`
    : `Checklist em ${periodoResumo}`
  const subtitleJustificados = `Ausência justificada · ${periodoResumo}`
  // ── opções em cascata ────────────────────────────────────────────────────
  const responsaveisDaGerencia = useMemo(
    () => getResponsaveisByGerencia(filtroCoordenador),
    [filtroCoordenador],
  )

  const basesDaCascata = useMemo(
    () => getBasesByGerenciaAndResponsavel(filtroCoordenador, filtroResponsavel),
    [filtroCoordenador, filtroResponsavel],
  )

  const responsavelOptions = useMemo(() => {
    if (!responsaveisDaGerencia) return RESPONSAVEL_FILTER_SELECT_OPTIONS
    const allowed = new Set(responsaveisDaGerencia.map((r) => normNome(r)))
    return RESPONSAVEL_FILTER_SELECT_OPTIONS.filter(
      (o) => o.value === 'todos' || allowed.has(normNome(o.value)),
    )
  }, [responsaveisDaGerencia])

  const baseOptions = useMemo(() => {
    if (!basesDaCascata) return BASE_FILTER_SELECT_OPTIONS
    const allowed = new Set(basesDaCascata.map((b) => b.toLowerCase()))
    return BASE_FILTER_SELECT_OPTIONS.filter((o) => o.value === 'todos' || allowed.has(o.value.toLowerCase()))
  }, [basesDaCascata])

  // reset de filtros dependentes quando a gerência muda
  useEffect(() => {
    if (responsaveisDaGerencia && filtroResponsavel !== 'todos') {
      if (!responsaveisDaGerencia.some((r) => normNome(r) === normNome(filtroResponsavel))) setFiltroResponsavel('todos')
    }
  }, [filtroCoordenador, responsaveisDaGerencia, filtroResponsavel])

  useEffect(() => {
    if (basesDaCascata && filtroBase !== 'todos') {
      const allowed = basesDaCascata.map((b) => b.toLowerCase())
      if (!allowed.includes(filtroBase.toLowerCase())) setFiltroBase('todos')
    }
  }, [filtroCoordenador, filtroResponsavel, basesDaCascata, filtroBase])

  const prefixoOptions = PREFIXO_FILTER_SELECT_OPTIONS

  useEffect(() => {
    if (filtroPrefixo !== 'todos' && !prefixoOptions.some((o) => o.value === filtroPrefixo)) {
      setFiltroPrefixo('todos')
    }
  }, [filtroPrefixo, prefixoOptions])

  const filtrosAtivosCount = useMemo(() => {
    let n = 0
    if (periodo !== 'hoje') n += 1
    if (filtroCoordenador !== 'todos') n += 1
    if (filtroResponsavel !== 'todos') n += 1
    if (filtroSupervisor !== 'todos') n += 1
    if (filtroBase !== 'todos') n += 1
    if (filtroTipo !== 'todos') n += 1
    if (filtroPrefixo !== 'todos') n += 1
    if (busca.trim().length > 0) n += 1
    return n
  }, [periodo, filtroBase, filtroCoordenador, filtroResponsavel, filtroSupervisor, filtroTipo, filtroPrefixo, busca])

  const limparFiltros = useCallback(() => {
    setPeriodo('hoje')
    setCustomDesde(defaultDesde())
    setCustomAte(hojeLocalIso())
    setFiltroBase('todos')
    setFiltroCoordenador('todos')
    setFiltroResponsavel('todos')
    setFiltroSupervisor('todos')
    setFiltroTipo('todos')
    setFiltroPrefixo('todos')
    setBusca('')
  }, [])

  const exportMeta = useMemo(
    () => ({
      periodoLabel,
      periodoResumo,
      busca: q || undefined,
      setorLabel: setorVeiculoLabel,
    }),
    [periodoLabel, periodoResumo, q, setorVeiculoLabel],
  )

  const exportarPdf = useCallback(
    async (scope: ChecklistDetalharPdfScope) => {
      setPdfGerando(true)
      try {
        await generateChecklistDetalharPdf(
          scope,
          exportMeta,
          naoRealizaramFiltrados,
          realizaramFiltrados,
        )
        setPdfModalOpen(false)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Não foi possível gerar o PDF.'
        window.alert(msg)
      } finally {
        setPdfGerando(false)
      }
    },
    [exportMeta, naoRealizaramFiltrados, realizaramFiltrados],
  )

  const exportarExcel = useCallback(
    (scope: ChecklistDetalharPdfScope) => {
      setExcelGerando(true)
      try {
        generateChecklistDetalharExcel(
          scope,
          exportMeta,
          naoRealizaramFiltrados,
          realizaramFiltrados,
        )
        setExcelModalOpen(false)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Não foi possível gerar o Excel.'
        window.alert(msg)
      } finally {
        setExcelGerando(false)
      }
    },
    [exportMeta, naoRealizaramFiltrados, realizaramFiltrados],
  )

  const exportarFoto = useCallback(
    (scope: ChecklistDetalharPdfScope) => {
      setFotoGerando(true)
      try {
        const dataUrl = generateChecklistDetalharImage(
          scope,
          exportMeta,
          naoRealizaramFiltrados,
          realizaramFiltrados,
        )
        downloadChecklistImage(scope, dataUrl)
        setFotoModalOpen(false)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Não foi possível gerar a imagem.'
        window.alert(msg)
      } finally {
        setFotoGerando(false)
      }
    },
    [exportMeta, naoRealizaramFiltrados, realizaramFiltrados],
  )

  const capturarRanking = useCallback(async () => {
    setCapturandoFoto(true)
    try {
      const groupLabel =
        CHECKLIST_TOP10_GROUP_OPTIONS.find((o) => o.value === rankingGroupBy)?.label ?? 'Responsável'
      const dataUrl = generateRankingScreenshot({
        periodoLabel,
        periodoResumo,
        diasNoPeriodo,
        groupLabel,
        pior: buildChecklistAdherenceRanking(
          frotaFiltradaSetor,
          checklistCompletionsByDay,
          periodDays,
          rankingGroupBy,
          'worst',
        ),
        melhor: buildChecklistAdherenceRanking(
          frotaFiltradaSetor,
          checklistCompletionsByDay,
          periodDays,
          rankingGroupBy,
          'best',
        ),
      })
      downloadDataUrl(dataUrl, `ranking-checklist-${limites.ini}-${limites.fim}.png`)
    } catch {
      window.alert('Não foi possível capturar a imagem do ranking.')
    } finally {
      setCapturandoFoto(false)
    }
  }, [
    periodoLabel,
    periodoResumo,
    diasNoPeriodo,
    rankingGroupBy,
    frotaFiltradaSetor,
    checklistCompletionsByDay,
    periodDays,
    limites.ini,
    limites.fim,
  ])

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="-mx-3 -my-3 flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:-mx-4 sm:-my-4 lg:-mx-8 lg:-my-6">

      {/* Cabeçalho */}
      <section className="shrink-0 overflow-hidden border-b border-slate-200/80 bg-white dark:border-slate-800/60 dark:bg-slate-900">
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(181,22,73,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_34%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(181,22,73,0.32),transparent_32%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.20),transparent_34%)]" />
          <div className="relative grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] xl:items-stretch">
            <div className="flex flex-col justify-between gap-5">
              <div>
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <Link
                    to="/"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-xs font-extrabold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 dark:border-slate-700 dark:bg-slate-950/75 dark:text-slate-200 dark:hover:bg-slate-950 dark:hover:text-white"
                  >
                    <ArrowLeft size={14} />
                    Voltar ao dashboard
                  </Link>
                  <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-950 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-sm dark:border-slate-700 dark:bg-slate-950/80">
                    <Calendar size={12} />
                    {periodoLabel} · {periodoResumo}
                  </div>
                </div>

                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  {isAdmPage ? 'Checklist administrativo' : 'Checklist operacional'}
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                  Detalhar checklists
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {isAdmPage
                    ? 'Acompanhe a aderência dos veículos administrativos e identifique quem ainda precisa realizar o checklist.'
                    : 'Acompanhe a aderência da frota operacional e identifique rapidamente quem ainda precisa realizar o checklist.'}
                </p>
                <div className="mt-4 inline-flex rounded-xl border border-slate-200 bg-white/85 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-950/75">
                  <Link
                    to={`/checklists/detalhar?${searchParams.toString()}`}
                    className={`rounded-lg px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide transition ${
                      !isAdmPage
                        ? 'bg-purple-600 text-white shadow-sm dark:bg-purple-500'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'
                    }`}
                  >
                    Operacionais
                  </Link>
                  <Link
                    to={`/checklists/detalhar/adm?${searchParams.toString()}`}
                    className={`rounded-lg px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide transition ${
                      isAdmPage
                        ? 'bg-indigo-600 text-white shadow-sm dark:bg-indigo-500'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'
                    }`}
                  >
                    Administrativos
                  </Link>
                </div>
              </div>

              {!loading && total > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/45">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {diasNoPeriodo === 1 ? 'Aderência hoje' : 'Aderência no período'}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {diasNoPeriodo === 1
                          ? `${aderenciaStats.realizados} de ${ativosSetor} checklists realizados (${setorVeiculoLabel}).`
                          : `${aderenciaStats.realizados} de ${aderenciaStats.esperados} checklists esperados (${ativosSetor} veículos ${setorVeiculoLabel} × ${diasNoPeriodo} dias).`
                        }
                      </p>
                    </div>
                    <span className={`rounded-2xl px-3 py-1.5 text-xl font-black ${pct >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : pct >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/70 dark:bg-slate-800 dark:ring-slate-700/70">
                    <div
                      className={`h-full rounded-full shadow-[0_0_22px_currentColor] ${pct >= 80 ? 'bg-emerald-500 text-emerald-500' : pct >= 50 ? 'bg-amber-500 text-amber-500' : 'bg-rose-500 text-rose-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <Link
                to={outraPaginaPath}
                className={`group relative block overflow-hidden rounded-2xl border p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md ${
                  isAdmPage
                    ? 'border-indigo-200 bg-indigo-50/80 dark:border-indigo-900/50 dark:bg-indigo-950/20'
                    : 'border-purple-200 bg-purple-50/80 dark:border-purple-900/50 dark:bg-purple-950/20'
                }`}
              >
                <div className={`absolute inset-y-0 left-0 w-1 ${isAdmPage ? 'bg-indigo-400' : 'bg-purple-400'}`} />
                <div className={`absolute right-3 top-3 flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold shadow-sm transition-transform group-hover:scale-105 ${
                  isAdmPage
                    ? 'bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300'
                    : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300'
                }`}>
                  <RefreshCw size={9} className="transition-transform duration-500 group-hover:rotate-180" />
                  {outraPaginaLabel}
                </div>
                <div className="flex items-start gap-3">
                  <div className={`rounded-xl p-2 transition-transform group-hover:scale-110 ${
                    isAdmPage
                      ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300'
                      : 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300'
                  }`}>
                    {isAdmPage ? <Briefcase size={18} aria-hidden /> : <Truck size={18} aria-hidden />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[10px] font-black uppercase tracking-wider ${
                      isAdmPage
                        ? 'text-indigo-600/80 dark:text-indigo-400/80'
                        : 'text-purple-600/80 dark:text-purple-400/80'
                    }`}>
                      {isAdmPage ? 'Veículos ADM ativos' : 'Veículos OP ativos'}
                    </p>
                    <p className={`mt-1 text-3xl font-black ${
                      isAdmPage
                        ? 'text-indigo-700 dark:text-indigo-300'
                        : 'text-purple-700 dark:text-purple-300'
                    }`}>
                      {ativosSetor}
                    </p>
                    <p className={`mt-0.5 text-[10px] font-semibold ${
                      isAdmPage
                        ? 'text-indigo-600/60 dark:text-indigo-400/60'
                        : 'text-purple-600/60 dark:text-purple-400/60'
                    }`}>
                      {setorVeiculoLabel}
                    </p>
                  </div>
                </div>
              </Link>
              <div className="group relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm backdrop-blur dark:border-emerald-900/60 dark:bg-emerald-950/25">
                <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700/70 dark:text-emerald-300/80">Realizaram</p>
                <p className="mt-2 text-3xl font-black text-emerald-700 dark:text-emerald-300">{realizaramSetorCount}</p>
                <p className="mt-1 text-[11px] font-semibold text-emerald-700/60 dark:text-emerald-300/60">checklists concluídos</p>
              </div>
              <div className="group relative overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/80 p-4 shadow-sm backdrop-blur dark:border-rose-900/60 dark:bg-rose-950/25">
                <div className="absolute inset-y-0 left-0 w-1 bg-rose-500" />
                <p className="text-[10px] font-black uppercase tracking-wider text-rose-700/70 dark:text-rose-300/80">Não realizaram</p>
                <p className="mt-2 text-3xl font-black text-rose-700 dark:text-rose-300">{naoRealizaramCardCount}</p>
                <p className="mt-1 text-[11px] font-semibold text-rose-700/60 dark:text-rose-300/60">pendentes no período</p>
              </div>
              <div className="group relative overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm backdrop-blur dark:border-amber-900/60 dark:bg-amber-950/25">
                <div className="absolute inset-y-0 left-0 w-1 bg-amber-500" />
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-800/70 dark:text-amber-200/80">Justificados</p>
                <p className="mt-2 text-3xl font-black text-amber-800 dark:text-amber-200">{justificadosSetorCount}</p>
                <p className="mt-1 text-[11px] font-semibold text-amber-800/60 dark:text-amber-200/60">RESERVA ou NÃO RODOU</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FilterPanel
        variant="section"
        visible={filtrosVisiveis}
        onVisibleChange={setFiltrosVisiveis}
        activeCount={filtrosAtivosCount}
        onClear={limparFiltros}
        summary={`${periodoLabel} · ${periodoResumo}${busca.trim() ? ` · busca "${busca.trim()}"` : ''}`}
      >
        <FilterPanelGroup title="Período e busca" columns="lg:grid-cols-[minmax(200px,0.85fr)_minmax(0,1.15fr)]">
          <div className="relative">
            <Calendar size={14} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400" />
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm font-extrabold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              {PERIODO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <FilterSearchField
            value={busca}
            onChange={setBusca}
            placeholder="Buscar em todas as colunas da tabela…"
          />
          {periodo === 'custom' ? (
            <div className="col-span-full mt-1 flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-800 sm:flex-row sm:items-center">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Intervalo</label>
              <input
                type="date"
                value={customDesde}
                onChange={(e) => setCustomDesde(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              />
              <span className="hidden text-xs font-bold text-slate-400 sm:inline">até</span>
              <input
                type="date"
                value={customAte}
                onChange={(e) => setCustomAte(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              />
            </div>
          ) : null}
        </FilterPanelGroup>

        <div className="grid gap-4 lg:grid-cols-2">
          <FilterPanelGroup title="Gestão" columns="sm:grid-cols-2 lg:grid-cols-4">
            <Select label="Gerência" value={filtroCoordenador} onChange={setFiltroCoordenador} options={COORDENADOR_FILTER_SELECT_OPTIONS} tone="dark" />
            <Select label="Responsável" value={filtroResponsavel} onChange={setFiltroResponsavel} options={responsavelOptions} tone="dark" />
            <Select label="Supervisor" value={filtroSupervisor} onChange={setFiltroSupervisor} options={SUPERVISOR_FILTER_SELECT_OPTIONS} tone="dark" />
            <Select label="Base" value={filtroBase} onChange={setFiltroBase} options={baseOptions} tone="dark" />
          </FilterPanelGroup>
          <FilterPanelGroup title="Veículo" columns="sm:grid-cols-2">
            <Select label="Tipo" value={filtroTipo} onChange={setFiltroTipo} options={TIPO_FILTER_SELECT_OPTIONS} tone="dark" />
            <Select label="Prefixo" value={filtroPrefixo} onChange={setFiltroPrefixo} options={prefixoOptions} tone="dark" />
          </FilterPanelGroup>
        </div>
      </FilterPanel>

      {/* Abas + listas */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <span className="size-7 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600 dark:border-slate-600 dark:border-t-blue-400" />
        </div>
      ) : (
        <div
          ref={columnsRef}
          className={`flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-3 py-3 sm:px-4 sm:py-3 lg:px-5 ${isFullscreen ? 'bg-slate-50 dark:bg-slate-950' : ''}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {sectionView === 'ranking'
                ? `Rankings do período · ${setorVeiculoLabel}`
                : sectionView === 'justificados'
                  ? `Justificados · ${setorVeiculoLabel}`
                : `Resultados por veículo · ${setorVeiculoLabel}`}
            </p>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => {
                    setDisplayMode('cards')
                    setSectionView('resultados')
                  }}
                  title="Visão em cards"
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition ${
                    sectionView === 'resultados' && displayMode === 'cards'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <LayoutGrid size={13} />
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDisplayMode('list')
                    setSectionView('resultados')
                  }}
                  title="Visão em lista"
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition ${
                    sectionView === 'resultados' && displayMode === 'list'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <List size={13} />
                  Lista
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setSectionView('ranking')}
                    title="Visão em ranking"
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition ${
                      sectionView === 'ranking'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Trophy size={13} />
                    Ranking
                  </button>
                )}
              </div>
              {(justificadosSetorCount > 0 || isAdmin) && (
                <button
                  type="button"
                  onClick={() =>
                    setSectionView((current) => (current === 'justificados' ? 'resultados' : 'justificados'))
                  }
                  title={
                    sectionView === 'justificados'
                      ? 'Voltar aos resultados por veículo'
                      : 'Ver veículos com ausência justificada'
                  }
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[10px] font-bold uppercase tracking-wide shadow-sm transition ${
                    sectionView === 'justificados'
                      ? 'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-100'
                      : 'border-amber-200/80 bg-white text-amber-800 hover:bg-amber-50 dark:border-amber-900/60 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-amber-950/30'
                  }`}
                >
                  <MessageSquareWarning size={14} />
                  Justificados
                  {justificadosSetorCount > 0 ? (
                    <span className="rounded-full bg-amber-200/80 px-1.5 py-0.5 text-[9px] font-black leading-none text-amber-900 dark:bg-amber-900/70 dark:text-amber-100">
                      {justificadosSetorCount}
                    </span>
                  ) : null}
                </button>
              )}
              {sectionView === 'ranking' ? (
                <button
                  type="button"
                  onClick={() => void capturarRanking()}
                  disabled={capturandoFoto}
                  title="Capturar imagem do ranking"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Camera size={14} className={capturandoFoto ? 'animate-pulse' : ''} />
                  {capturandoFoto ? 'Gerando…' : 'Foto'}
                </button>
              ) : sectionView === 'resultados' ? (
                <>
                <button
                  type="button"
                  onClick={() => setExcelModalOpen(true)}
                  title="Exportar Excel"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <FileSpreadsheet size={14} />
                  Excel
                </button>
                <button
                  type="button"
                  onClick={() => setPdfModalOpen(true)}
                  title="Exportar PDF"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <FileDown size={14} />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => setFotoModalOpen(true)}
                  title="Exportar como imagem PNG"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Camera size={14} />
                  Foto
                </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                {isFullscreen ? 'Sair' : 'Tela cheia'}
              </button>
            </div>
          </div>

        {sectionView === 'ranking' && isAdmin ? (
          <ChecklistTop10Section
            frota={frotaFiltradaSetor}
            completions={checklistCompletionsByDay}
            diasNoPeriodo={diasNoPeriodo}
            periodDays={periodDays}
            periodoLabel={periodoLabel}
            periodoResumo={periodoResumo}
            groupBy={rankingGroupBy}
            onGroupByChange={setRankingGroupBy}
            fullscreen={isFullscreen}
          />
        ) : sectionView === 'justificados' ? (
          <JustificadosPanel
            items={justificadosFiltrados}
            countLabel={justificadosFiltrados.length}
            subtitle={subtitleJustificados}
            displayMode={displayMode}
            isAdmin={isAdmin}
            isFullscreen={isFullscreen}
            savingPlaca={justificativaSavingPlaca}
            onAlterarMotivo={(placa, motivo, placaReserva) => void salvarJustificativa(placa, motivo, placaReserva)}
            onRemover={(placa) => void removerJustificativa(placa)}
            emptyMessage={q ? 'Nenhum justificado corresponde à busca.' : 'Nenhum veículo justificado neste período.'}
            expanded
          />
        ) : (
        <>
        <div className={`grid min-h-0 flex-1 gap-3 xl:items-stretch transition-all duration-300 ${
          focusedSide === 'nao' ? 'xl:grid-cols-[3fr_1fr]' :
          focusedSide === 'sim' ? 'xl:grid-cols-[1fr_3fr]' :
          'xl:grid-cols-2'
        } ${isFullscreen ? 'min-h-0' : ''}`}>

          {/* Coluna: Não realizaram */}
          <div className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-rose-200/80 bg-white shadow-soft dark:border-rose-950/60 dark:bg-slate-900 ${isFullscreen ? 'flex-1' : 'min-h-[320px] xl:min-h-0'}`}>
            <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-rose-100 bg-rose-50/85 px-4 py-3 backdrop-blur dark:border-rose-950/50 dark:bg-rose-950/25">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-rose-500 shadow-sm dark:bg-slate-950">
                <ClipboardX size={15} />
              </span>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">Não realizaram</span>
                <p className="text-[10px] font-semibold text-rose-500/70 dark:text-rose-300/60">{subtitleNao}</p>
                {showJustificarNaoRealizaram ? (
                  <p className="mt-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                    Modo justificativa — escolha RESERVA ou NÃO RODOU em cada veículo
                  </p>
                ) : null}
              </div>
              <span className="ml-auto rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                {naoRealizaramFiltrados.length}
              </span>
              <button
                onClick={() => setFocusedSide(focusedSide === 'nao' ? null : 'nao')}
                title={focusedSide === 'nao' ? 'Restaurar visualização' : 'Expandir Não realizaram'}
                className="ml-1 grid h-7 w-7 place-items-center rounded-lg text-rose-400 transition hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-300"
              >
                {focusedSide === 'nao' ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
              </button>
            </div>

            {naoRealizaramFiltrados.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-slate-400">
                <CheckCircle2 size={28} className="text-emerald-400" />
                <p className="text-xs font-semibold">
                  {q
                    ? 'Sem resultados.'
                    : justificadosSetorCount > 0
                      ? 'Nenhum pendente — veja a seção Justificados abaixo.'
                      : 'Todos realizaram o checklist!'}
                </p>
              </div>
            ) : displayMode === 'list' ? (
              <ListaNaoRealizaram
                items={naoRealizaramFiltrados}
                multiDia={multiDia}
                showJustificar={showJustificarNaoRealizaram}
                justificativas={justificativas}
                savingPlaca={justificativaSavingPlaca}
                onJustificar={(placa, motivo, placaReserva) => void salvarJustificativa(placa, motivo, placaReserva)}
              />
            ) : (
              <div className={`custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-3`}>
                {naoRealizaramFiltrados.map((v) => (
                  <div
                    key={v.placa}
                    className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-rose-50/35 p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-lg dark:border-slate-800 dark:from-slate-950 dark:to-rose-950/10 dark:hover:border-rose-900/70"
                  >
                    <div className="absolute inset-y-0 left-0 w-1 bg-rose-400/70 dark:bg-rose-500/70" />
                    <div className="flex items-start gap-3 pl-1">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-rose-100 text-xs font-black text-rose-700 shadow-sm ring-1 ring-rose-200/80 dark:bg-rose-950/45 dark:text-rose-300 dark:ring-rose-900/60">
                        {v.placa.slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-black tracking-wide text-slate-950 dark:text-white">{v.placa}</span>
                          {v.base && (
                            <span className="shrink-0 rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-black text-slate-600 ring-1 ring-slate-300/50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                              {v.base}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{v.modelo}</p>
                        {multiDia && (
                          <p className="mt-1 text-[10px] font-bold text-rose-600 dark:text-rose-300">
                            0/{v.diasNoPeriodo} dias no período
                          </p>
                        )}
                      </div>
                      {showJustificarNaoRealizaram ? (
                        <ChecklistAusenciaJustificar
                          placa={v.placa}
                          motivoAtual={justificativas.get(v.placa)?.motivo ?? null}
                          placaReservaAtual={justificativas.get(v.placa)?.placaReserva}
                          saving={justificativaSavingPlaca === v.placa}
                          onSelect={(motivo, placaReserva) => void salvarJustificativa(v.placa, motivo, placaReserva)}
                        />
                      ) : null}
                    </div>
                    {(v.supervisor || v.coordenador) && (
                      <div className="mt-3 grid gap-2 pl-1 sm:grid-cols-2">
                        {v.supervisor && (
                          <div className="rounded-xl bg-white/70 px-3 py-2 ring-1 ring-slate-100 dark:bg-slate-900/60 dark:ring-slate-800">
                            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Supervisor</p>
                            <p className="mt-0.5 truncate text-[11px] font-bold text-slate-600 dark:text-slate-300">{v.supervisor}</p>
                          </div>
                        )}
                        {v.coordenador && (
                          <div className="rounded-xl bg-white/70 px-3 py-2 ring-1 ring-slate-100 dark:bg-slate-900/60 dark:ring-slate-800">
                            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Gerência</p>
                            <p className="mt-0.5 truncate text-[11px] font-bold text-slate-600 dark:text-slate-300">{v.coordenador}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coluna: Realizaram */}
          <div className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-emerald-200/80 bg-white shadow-soft dark:border-emerald-950/60 dark:bg-slate-900 ${isFullscreen ? 'flex-1' : 'min-h-[320px] xl:min-h-0'}`}>
            <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-emerald-100 bg-emerald-50/85 px-4 py-3 backdrop-blur dark:border-emerald-950/50 dark:bg-emerald-950/25">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-emerald-500 shadow-sm dark:bg-slate-950">
                <ClipboardCheck size={15} />
              </span>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Realizaram</span>
                <p className="text-[10px] font-semibold text-emerald-500/70 dark:text-emerald-300/60">{subtitleSim}</p>
              </div>
              <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                {realizaramFiltrados.length}
              </span>
              <button
                onClick={() => setFocusedSide(focusedSide === 'sim' ? null : 'sim')}
                title={focusedSide === 'sim' ? 'Restaurar visualização' : 'Expandir Realizaram'}
                className="ml-1 grid h-7 w-7 place-items-center rounded-lg text-emerald-400 transition hover:bg-emerald-100 hover:text-emerald-600 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-300"
              >
                {focusedSide === 'sim' ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
              </button>
            </div>

            {realizaramFiltrados.length === 0 ? (
              <div className="py-14 text-center text-xs font-semibold text-slate-400">
                {q ? 'Sem resultados.' : 'Nenhum checklist realizado no período.'}
              </div>
            ) : displayMode === 'list' ? (
              <ListaRealizaram items={realizaramFiltrados} multiDia={multiDia} />
            ) : (
              <div className={`custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-3`}>
                {realizaramFiltrados.map((v) => (
                  <div
                    key={v.placa}
                    className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-emerald-50/35 p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg dark:border-slate-800 dark:from-slate-950 dark:to-emerald-950/10 dark:hover:border-emerald-900/70"
                  >
                    <div className="absolute inset-y-0 left-0 w-1 bg-emerald-400/70 dark:bg-emerald-500/70" />
                    <div className="flex items-start gap-3 pl-1">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-xs font-black text-emerald-700 shadow-sm ring-1 ring-emerald-200/80 dark:bg-emerald-950/45 dark:text-emerald-300 dark:ring-emerald-900/60">
                        {v.placa.slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-black tracking-wide text-slate-950 dark:text-white">{v.placa}</span>
                          {v.base && (
                            <span className="shrink-0 rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-black text-slate-600 ring-1 ring-slate-300/50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                              {v.base}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{v.modelo}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                          {v.dataFormatada} · {v.hora}
                        </span>
                        {multiDia && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600 ring-1 ring-slate-200/70 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
                            {v.diasRealizados}/{v.diasNoPeriodo} dias
                          </span>
                        )}
                        {v.temNc && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-700 ring-1 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                            NC
                          </span>
                        )}
                      </div>
                    </div>
                    {(v.supervisor || v.coordenador) && (
                      <div className="mt-3 grid gap-2 pl-1 sm:grid-cols-2">
                        {v.supervisor && (
                          <div className="rounded-xl bg-white/70 px-3 py-2 ring-1 ring-slate-100 dark:bg-slate-900/60 dark:ring-slate-800">
                            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Supervisor</p>
                            <p className="mt-0.5 truncate text-[11px] font-bold text-slate-600 dark:text-slate-300">{v.supervisor}</p>
                          </div>
                        )}
                        {v.coordenador && (
                          <div className="rounded-xl bg-white/70 px-3 py-2 ring-1 ring-slate-100 dark:bg-slate-900/60 dark:ring-slate-800">
                            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Gerência</p>
                            <p className="mt-0.5 truncate text-[11px] font-bold text-slate-600 dark:text-slate-300">{v.coordenador}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {justificadosSetorCount > 0 ? (
          <div className="mt-3">
            <JustificadosPanel
            items={justificadosFiltrados}
            countLabel={justificadosFiltrados.length}
            subtitle={subtitleJustificados}
            displayMode={displayMode}
            isAdmin={isAdmin}
            isFullscreen={isFullscreen}
            savingPlaca={justificativaSavingPlaca}
            onAlterarMotivo={(placa, motivo, placaReserva) => void salvarJustificativa(placa, motivo, placaReserva)}
            onRemover={(placa) => void removerJustificativa(placa)}
            emptyMessage={q ? 'Nenhum justificado corresponde à busca.' : 'Nenhum veículo justificado.'}
          />
          </div>
        ) : null}
        </>
        )}

        {excelModalOpen &&
          createPortal(
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-black text-slate-900 dark:text-slate-100">Exportar Excel</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Escolha quais listas incluir na planilha (.xlsx).
                </p>
              </div>
              <button
                type="button"
                onClick={() => !excelGerando && setExcelModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={excelGerando || naoRealizaramFiltrados.length === 0}
                onClick={() => exportarExcel('nao')}
                className="flex w-full items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-950/60 dark:bg-rose-950/20 dark:hover:bg-rose-950/30"
              >
                <ClipboardX size={18} className="shrink-0 text-rose-600 dark:text-rose-400" />
                <div>
                  <p className="text-sm font-extrabold text-rose-800 dark:text-rose-200">Somente não realizados</p>
                  <p className="text-[11px] font-semibold text-rose-600/80 dark:text-rose-300/70">
                    {naoRealizaramFiltrados.length} veículo(s)
                  </p>
                </div>
              </button>

              <button
                type="button"
                disabled={excelGerando || realizaramFiltrados.length === 0}
                onClick={() => exportarExcel('sim')}
                className="flex w-full items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-950/60 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30"
              >
                <ClipboardCheck size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-sm font-extrabold text-emerald-800 dark:text-emerald-200">Somente realizados</p>
                  <p className="text-[11px] font-semibold text-emerald-600/80 dark:text-emerald-300/70">
                    {realizaramFiltrados.length} veículo(s)
                  </p>
                </div>
              </button>

              <button
                type="button"
                disabled={excelGerando || (naoRealizaramFiltrados.length === 0 && realizaramFiltrados.length === 0)}
                onClick={() => exportarExcel('ambos')}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-800"
              >
                <FileSpreadsheet size={18} className="shrink-0 text-slate-600 dark:text-slate-300" />
                <div>
                  <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Ambos</p>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {naoRealizaramFiltrados.length} não realizados · {realizaramFiltrados.length} realizados
                  </p>
                </div>
              </button>
            </div>

            <button
              type="button"
              disabled={excelGerando}
              onClick={() => setExcelModalOpen(false)}
              className="mt-5 w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-extrabold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {excelGerando ? 'Gerando Excel…' : 'Cancelar'}
            </button>
          </div>
            </div>,
            (document.fullscreenElement as HTMLElement | null) ?? document.body,
          )}

        {pdfModalOpen &&
          createPortal(
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-black text-slate-900 dark:text-slate-100">Exportar PDF</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Escolha quais checklists incluir no relatório.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !pdfGerando && setPdfModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={pdfGerando || naoRealizaramFiltrados.length === 0}
                onClick={() => void exportarPdf('nao')}
                className="flex w-full items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-950/60 dark:bg-rose-950/20 dark:hover:bg-rose-950/30"
              >
                <ClipboardX size={18} className="shrink-0 text-rose-600 dark:text-rose-400" />
                <div>
                  <p className="text-sm font-extrabold text-rose-800 dark:text-rose-200">Somente não realizados</p>
                  <p className="text-[11px] font-semibold text-rose-600/80 dark:text-rose-300/70">
                    {naoRealizaramFiltrados.length} veículo(s)
                  </p>
                </div>
              </button>

              <button
                type="button"
                disabled={pdfGerando || realizaramFiltrados.length === 0}
                onClick={() => void exportarPdf('sim')}
                className="flex w-full items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-950/60 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30"
              >
                <ClipboardCheck size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-sm font-extrabold text-emerald-800 dark:text-emerald-200">Somente realizados</p>
                  <p className="text-[11px] font-semibold text-emerald-600/80 dark:text-emerald-300/70">
                    {realizaramFiltrados.length} veículo(s)
                  </p>
                </div>
              </button>

              <button
                type="button"
                disabled={pdfGerando || (naoRealizaramFiltrados.length === 0 && realizaramFiltrados.length === 0)}
                onClick={() => void exportarPdf('ambos')}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-800"
              >
                <FileDown size={18} className="shrink-0 text-slate-600 dark:text-slate-300" />
                <div>
                  <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Ambos</p>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {naoRealizaramFiltrados.length} não realizados · {realizaramFiltrados.length} realizados
                  </p>
                </div>
              </button>
            </div>

            <button
              type="button"
              disabled={pdfGerando}
              onClick={() => setPdfModalOpen(false)}
              className="mt-5 w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-extrabold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {pdfGerando ? 'Gerando PDF…' : 'Cancelar'}
            </button>
          </div>
            </div>,
            (document.fullscreenElement as HTMLElement | null) ?? document.body,
          )}

        {fotoModalOpen &&
          createPortal(
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-black text-slate-900 dark:text-slate-100">Exportar Imagem</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Escolha quais checklists incluir na imagem (.png).
                </p>
              </div>
              <button
                type="button"
                onClick={() => !fotoGerando && setFotoModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={fotoGerando || naoRealizaramFiltrados.length === 0}
                onClick={() => exportarFoto('nao')}
                className="flex w-full items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-950/60 dark:bg-rose-950/20 dark:hover:bg-rose-950/30"
              >
                <ClipboardX size={18} className="shrink-0 text-rose-600 dark:text-rose-400" />
                <div>
                  <p className="text-sm font-extrabold text-rose-800 dark:text-rose-200">Somente não realizados</p>
                  <p className="text-[11px] font-semibold text-rose-600/80 dark:text-rose-300/70">
                    {naoRealizaramFiltrados.length} veículo(s)
                  </p>
                </div>
              </button>

              <button
                type="button"
                disabled={fotoGerando || realizaramFiltrados.length === 0}
                onClick={() => exportarFoto('sim')}
                className="flex w-full items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-950/60 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30"
              >
                <ClipboardCheck size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-sm font-extrabold text-emerald-800 dark:text-emerald-200">Somente realizados</p>
                  <p className="text-[11px] font-semibold text-emerald-600/80 dark:text-emerald-300/70">
                    {realizaramFiltrados.length} veículo(s)
                  </p>
                </div>
              </button>

              <button
                type="button"
                disabled={fotoGerando || (naoRealizaramFiltrados.length === 0 && realizaramFiltrados.length === 0)}
                onClick={() => exportarFoto('ambos')}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-800"
              >
                <Camera size={18} className="shrink-0 text-slate-600 dark:text-slate-300" />
                <div>
                  <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Ambos</p>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {naoRealizaramFiltrados.length} não realizados · {realizaramFiltrados.length} realizados
                  </p>
                </div>
              </button>
            </div>

            <button
              type="button"
              disabled={fotoGerando}
              onClick={() => setFotoModalOpen(false)}
              className="mt-5 w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-extrabold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {fotoGerando ? 'Gerando imagem…' : 'Cancelar'}
            </button>
          </div>
            </div>,
            (document.fullscreenElement as HTMLElement | null) ?? document.body,
          )}
        </div>
      )}

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
      `}</style>
    </div>
  )
}
