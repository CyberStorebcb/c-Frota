import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  Database,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useFleet } from '../frota/FleetContext'

// ── module-level session cache — carrega UMA vez por sessão ────────────────
// Evita egress repetido toda vez que o usuário visita a página.
// "Recarregar" é o único caminho que vai ao banco novamente.

let _sessionCache: VehicleRow[] | null = null
let _sessionCacheIncludesDeleted = false

// ── types ──────────────────────────────────────────────────────────────────

type VehicleRow = {
  id: string
  placa: string
  ano: string
  modelo: string
  tipo: string
  proprietario: string
  prefixo: string
  responsavel: string
  supervisor: string
  coordenador: string
  base: string
  setor: string
  processo: string
  status: string
  deleted_at: string | null
}

type ColDef = {
  key: keyof VehicleRow
  label: string
  width: number
  editable: boolean
  options?: string[]
}

// ── column definitions ─────────────────────────────────────────────────────

const COLS: ColDef[] = [
  { key: 'placa',        label: 'PLACA',        width: 106, editable: false },
  { key: 'ano',          label: 'ANO',           width: 64,  editable: true },
  { key: 'modelo',       label: 'MODELO',        width: 148, editable: true },
  { key: 'tipo',         label: 'TIPO',          width: 130, editable: true, options: ['MOTO','CARRO','CAMINHÃO','VAN','ÔNIBUS','MICRO-ÔNIBUS','CAMINHONETE','UTILITÁRIO'] },
  { key: 'proprietario', label: 'PROPRIETÁRIO',  width: 126, editable: true, options: ['PRÓPRIO','LOCADO','TERCEIRIZADO'] },
  { key: 'prefixo',      label: 'PREFIXO',       width: 138, editable: true },
  { key: 'responsavel',  label: 'RESPONSÁVEL',   width: 178, editable: true },
  { key: 'supervisor',   label: 'SUPERVISOR',    width: 154, editable: true },
  { key: 'coordenador',  label: 'GERÊNCIA',      width: 120, editable: true },
  { key: 'base',         label: 'BASE',          width: 72,  editable: true },
  { key: 'setor',        label: 'SETOR',         width: 128, editable: true },
  { key: 'processo',     label: 'PROCESSO',      width: 104, editable: true },
  { key: 'status',       label: 'STATUS',        width: 136, editable: true, options: ['ATIVO','INATIVO','DESMOBILIZADO','TRANSPORTE'] },
]

const EDITABLE_KEYS = COLS.filter((c) => c.editable).map((c) => c.key)

// ── helpers ────────────────────────────────────────────────────────────────

const NEW_PREFIX = '__new__'

function makeNewId() {
  return `${NEW_PREFIX}${crypto.randomUUID()}`
}

function isNewRow(placa: string) {
  return placa.startsWith(NEW_PREFIX)
}

function emptyRow(): VehicleRow {
  return {
    id: crypto.randomUUID(),
    placa: makeNewId(),
    ano: String(new Date().getFullYear()),
    modelo: '',
    tipo: 'MOTO',
    proprietario: 'PRÓPRIO',
    prefixo: '',
    responsavel: '',
    supervisor: '',
    coordenador: '',
    base: '',
    setor: '',
    processo: '',
    status: 'ATIVO',
    deleted_at: null,
  }
}

const STATUS_PILL: Record<string, string> = {
  ATIVO:         'bg-emerald-500/15 text-emerald-300 ring-emerald-500/20',
  INATIVO:       'bg-rose-500/15 text-rose-300 ring-rose-500/20',
  DESMOBILIZADO: 'bg-slate-500/15 text-slate-400 ring-slate-500/20',
  TRANSPORTE:    'bg-blue-500/15 text-blue-300 ring-blue-500/20',
}

// ── component ──────────────────────────────────────────────────────────────

export function FrotaEditorPage() {
  const fleet = useFleet()

  const [rows, setRows]               = useState<VehicleRow[]>([])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState<Set<string>>(new Set())
  const [errors, setErrors]           = useState<Record<string, string>>({})
  const [saved, setSaved]             = useState<Set<string>>(new Set())
  const [q, setQ]                     = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  const [, setNewPlacas]              = useState<Set<string>>(new Set())

  // original snapshot — used to detect dirty rows
  const originalRef = useRef<Map<string, VehicleRow>>(new Map())

  // ── load — usa cache de sessão para evitar egress ────────────────────────

  const applyRows = useCallback((loaded: VehicleRow[]) => {
    setRows(loaded)
    originalRef.current.clear()
    loaded.forEach((r) => originalRef.current.set(r.placa, { ...r }))
    setLoading(false)
    setErrors({})
  }, [])

  const load = useCallback(async (forceRefresh = false) => {
    // Se o cache da sessão já tem os dados corretos, usa direto — zero egress
    if (!forceRefresh && _sessionCache !== null && _sessionCacheIncludesDeleted === showDeleted) {
      applyRows(_sessionCache)
      return
    }

    setLoading(true)
    let q2 = supabase
      .from('vehicles')
      .select('id,placa,ano,modelo,tipo,proprietario,prefixo,responsavel,supervisor,coordenador,base,setor,processo,status,deleted_at')
      .order('placa')
    if (!showDeleted) q2 = q2.is('deleted_at', null)

    const { data, error } = await q2
    if (error) {
      setErrors({ _load: error.message })
      setLoading(false)
    } else {
      const loaded = (data ?? []) as VehicleRow[]
      _sessionCache = loaded
      _sessionCacheIncludesDeleted = showDeleted
      applyRows(loaded)
    }
  }, [showDeleted, applyRows])

  // Bootstrap: na primeira abertura, usa FleetContext (já em memória) se ainda
  // não há cache — depois, qualquer visita subsequente usa o cache de módulo.
  useEffect(() => {
    if (_sessionCache !== null && _sessionCacheIncludesDeleted === showDeleted) {
      applyRows(_sessionCache)
      return
    }
    // FleetContext já carregou os veículos ativos: usa como ponto de partida
    // imediato (evita query + egress) quando ainda não há cache de editor.
    if (!showDeleted && !fleet.loading && fleet.vehicles.length > 0 && _sessionCache === null) {
      const fromFleet: VehicleRow[] = fleet.vehicles
        .filter((v) => v.source !== 'total') // só veículos do Supabase, não catálogo local
        .map((v) => ({
          id:           v.id,
          placa:        v.placa,
          ano:          v.ano,
          modelo:       v.modelo,
          tipo:         v.tipo,
          proprietario: v.proprietario,
          prefixo:      v.prefixo === 'N/A' ? '' : v.prefixo,
          responsavel:  v.responsavel === 'NÃO ATRIBUÍDO' ? '' : v.responsavel,
          supervisor:   v.supervisor === 'NÃO ATRIBUÍDO' ? '' : v.supervisor,
          coordenador:  v.coordenador === 'NÃO ATRIBUÍDO' ? '' : v.coordenador,
          base:         v.base === 'N/A' ? '' : v.base,
          setor:        v.setor,
          processo:     v.processo,
          status:       v.status,
          deleted_at:   null,
        }))
      _sessionCache = fromFleet
      _sessionCacheIncludesDeleted = false
      applyRows(fromFleet)
      return
    }
    void load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDeleted, fleet.loading])   // fleet.vehicles é estável após o load inicial

  // ── dirty detection ──────────────────────────────────────────────────────

  const isDirty = useCallback((row: VehicleRow): boolean => {
    if (isNewRow(row.placa)) return true
    const orig = originalRef.current.get(row.placa)
    if (!orig) return true
    return EDITABLE_KEYS.some((k) => row[k] !== orig[k])
  }, [])

  const dirtyCount = useMemo(() => rows.filter(isDirty).length, [rows, isDirty])

  // ── cell update ──────────────────────────────────────────────────────────

  const updateCell = useCallback((placa: string, key: keyof VehicleRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.placa === placa ? { ...r, [key]: value } : r)),
    )
    // clear saved flash when user edits again
    setSaved((prev) => { const s = new Set(prev); s.delete(placa); return s })
    setErrors((prev) => { const e = { ...prev }; delete e[placa]; return e })
  }, [])

  // ── save row ─────────────────────────────────────────────────────────────

  const saveRow = useCallback(async (row: VehicleRow) => {
    const isNew = isNewRow(row.placa)

    // validate placa for new rows
    if (isNew && !row.placa.replace(NEW_PREFIX, '').trim() && true) {
      // placa is still the temp id — user hasn't typed the real plate yet
      setErrors((prev) => ({ ...prev, [row.placa]: 'Informe a placa antes de salvar.' }))
      return
    }

    setSaving((prev) => new Set(prev).add(row.placa))
    setErrors((prev) => { const e = { ...prev }; delete e[row.placa]; return e })

    // build upsert payload — strip id if new (let DB generate) and fix placa
    const payload: Omit<VehicleRow, 'id'> & { updated_at: string } = {
      placa:        row.placa,
      ano:          row.ano,
      modelo:       row.modelo,
      tipo:         row.tipo,
      proprietario: row.proprietario,
      prefixo:      row.prefixo,
      responsavel:  row.responsavel,
      supervisor:   row.supervisor,
      coordenador:  row.coordenador,
      base:         row.base,
      setor:        row.setor,
      processo:     row.processo,
      status:       row.status,
      deleted_at:   row.deleted_at,
      updated_at:   new Date().toISOString(),
    }

    const { error } = await supabase
      .from('vehicles')
      .upsert(payload, { onConflict: 'placa' })

    setSaving((prev) => { const s = new Set(prev); s.delete(row.placa); return s })

    if (error) {
      setErrors((prev) => ({ ...prev, [row.placa]: error.message }))
    } else {
      originalRef.current.set(row.placa, { ...row })
      // atualiza cache de sessão com o valor salvo
      if (_sessionCache) {
        const idx = _sessionCache.findIndex((r) => r.placa === row.placa)
        if (idx >= 0) _sessionCache[idx] = { ...row }
        else _sessionCache = [{ ...row }, ..._sessionCache]
      }
      fleet.reload()  // atualiza o FleetContext para outras páginas refletirem a mudança
      setSaved((prev) => new Set(prev).add(row.placa))
      if (isNew) {
        setNewPlacas((prev) => { const s = new Set(prev); s.delete(row.placa); return s })
      }
      setTimeout(() => setSaved((prev) => { const s = new Set(prev); s.delete(row.placa); return s }), 2500)
    }
  }, [fleet])

  // ── save all dirty ───────────────────────────────────────────────────────

  const saveAll = useCallback(async () => {
    const dirty = rows.filter(isDirty)
    await Promise.all(dirty.map(saveRow))
  }, [rows, isDirty, saveRow])

  // ── add new row ──────────────────────────────────────────────────────────

  const addRow = useCallback(() => {
    const blank = emptyRow()
    setRows((prev) => [blank, ...prev])
    setNewPlacas((prev) => new Set(prev).add(blank.placa))
  }, [])

  // ── update placa of new row ──────────────────────────────────────────────

  const updateNewPlaca = useCallback((tempPlaca: string, realPlaca: string) => {
    const upper = realPlaca.toUpperCase().trim()
    setRows((prev) =>
      prev.map((r) =>
        r.placa === tempPlaca ? { ...r, placa: upper || tempPlaca } : r,
      ),
    )
  }, [])

  // ── delete row (soft) ────────────────────────────────────────────────────

  const deleteRow = useCallback(async (row: VehicleRow) => {
    if (isNewRow(row.placa)) {
      setRows((prev) => prev.filter((r) => r.placa !== row.placa))
      setNewPlacas((prev) => { const s = new Set(prev); s.delete(row.placa); return s })
      return
    }
    if (!confirm(`Remover veículo ${row.placa}? O registro será desmobilizado (pode ser restaurado).`)) return
    setSaving((prev) => new Set(prev).add(row.placa))
    const { error } = await supabase
      .from('vehicles')
      .update({ deleted_at: new Date().toISOString(), status: 'DESMOBILIZADO' })
      .eq('placa', row.placa)
    setSaving((prev) => { const s = new Set(prev); s.delete(row.placa); return s })
    if (error) {
      setErrors((prev) => ({ ...prev, [row.placa]: error.message }))
    } else {
      setRows((prev) => prev.filter((r) => r.placa !== row.placa))
      if (_sessionCache) _sessionCache = _sessionCache.filter((r) => r.placa !== row.placa)
      fleet.reload()
    }
  }, [fleet])

  // ── discard row changes ──────────────────────────────────────────────────

  const discardRow = useCallback((row: VehicleRow) => {
    if (isNewRow(row.placa)) {
      setRows((prev) => prev.filter((r) => r.placa !== row.placa))
      setNewPlacas((prev) => { const s = new Set(prev); s.delete(row.placa); return s })
      return
    }
    const orig = originalRef.current.get(row.placa)
    if (!orig) return
    setRows((prev) => prev.map((r) => (r.placa === row.placa ? { ...orig } : r)))
    setErrors((prev) => { const e = { ...prev }; delete e[row.placa]; return e })
  }, [])

  // ── filtered rows ────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!q.trim()) return rows
    const lq = q.toLowerCase()
    return rows.filter((r) =>
      Object.values(r).some((v) => typeof v === 'string' && v.toLowerCase().includes(lq)),
    )
  }, [rows, q])

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-0 flex-col">

      {/* ── header ── */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600/10 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <Database size={18} />
            </span>
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-slate-100">Editor de Frota</p>
              <p className="text-[10px] font-semibold text-slate-400">
                {loading ? 'Carregando…' : `${rows.length} veículos`}
                {dirtyCount > 0 ? (
                  <span className="ml-1.5 font-black text-amber-400">{dirtyCount} pendente{dirtyCount > 1 ? 's' : ''}</span>
                ) : null}
              </p>
            </div>
          </div>

          {/* search */}
          <div className="relative flex-1" style={{ minWidth: 180, maxWidth: 320 }}>
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar placa, responsável, base…"
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-brand-500"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
              className="rounded border-slate-300 accent-brand-600"
            />
            Ver desmobilizados
          </label>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => void load(true)}
              disabled={loading}
              title="Busca dados frescos do banco (consome egress)"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Recarregar
            </button>

            <button
              onClick={addRow}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Plus size={13} />
              Novo veículo
            </button>

            {dirtyCount > 0 ? (
              <button
                onClick={() => void saveAll()}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-xs font-black text-white shadow transition hover:bg-brand-700 active:scale-95"
              >
                <Save size={13} />
                Salvar tudo ({dirtyCount})
              </button>
            ) : null}
          </div>
        </div>

        {errors._load ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-500">
            <AlertTriangle size={12} />
            {errors._load}
          </p>
        ) : null}
      </div>

      {/* ── table ── */}
      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? (
          <div className="flex h-40 items-center justify-center gap-2 text-sm font-semibold text-slate-400">
            <Loader2 size={18} className="animate-spin" />
            Carregando veículos…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm font-semibold text-slate-400">
            {q ? 'Nenhum veículo corresponde à busca.' : 'Nenhum veículo encontrado.'}
          </div>
        ) : (
          <table className="w-max min-w-full border-collapse text-xs">
            {/* sticky header */}
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 dark:bg-slate-900">
                {COLS.map((col) => (
                  <th
                    key={col.key}
                    style={{ width: col.width, minWidth: col.width }}
                    className="border-b border-r border-slate-200 px-2 py-2 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 first:sticky first:left-0 first:z-20 first:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:first:bg-slate-900"
                  >
                    {col.label}
                  </th>
                ))}
                {/* actions column */}
                <th className="sticky right-0 z-20 border-b border-l border-slate-200 bg-slate-100 px-2 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  AÇÕES
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <TableRow
                  key={row.placa}
                  row={row}
                  dirty={isDirty(row)}
                  saving={saving.has(row.placa)}
                  savedFlash={saved.has(row.placa)}
                  error={errors[row.placa]}
                  isNew={isNewRow(row.placa)}
                  onUpdate={updateCell}
                  onUpdatePlaca={updateNewPlaca}
                  onSave={saveRow}
                  onDiscard={discardRow}
                  onDelete={deleteRow}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── TableRow ───────────────────────────────────────────────────────────────

type RowProps = {
  row: VehicleRow
  dirty: boolean
  saving: boolean
  savedFlash: boolean
  error?: string
  isNew: boolean
  onUpdate: (placa: string, key: keyof VehicleRow, value: string) => void
  onUpdatePlaca: (tempPlaca: string, realPlaca: string) => void
  onSave: (row: VehicleRow) => void
  onDiscard: (row: VehicleRow) => void
  onDelete: (row: VehicleRow) => void
}

function TableRow({ row, dirty, saving, savedFlash, error, isNew, onUpdate, onUpdatePlaca, onSave, onDiscard, onDelete }: RowProps) {
  const rowBg = savedFlash
    ? 'bg-emerald-500/5 dark:bg-emerald-500/5'
    : dirty
      ? 'bg-amber-500/5 dark:bg-amber-500/5'
      : 'bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/60'

  const dirtyBorder = dirty
    ? 'border-l-2 border-l-amber-400'
    : savedFlash
      ? 'border-l-2 border-l-emerald-400'
      : 'border-l-2 border-l-transparent'

  return (
    <>
      <tr className={`group transition-colors ${rowBg} ${dirtyBorder}`}>
        {COLS.map((col) => (
          <td
            key={col.key}
            style={{ width: col.width, minWidth: col.width }}
            className={`border-b border-r border-slate-100 px-1.5 py-1 dark:border-slate-800 ${
              col.key === 'placa' ? 'sticky left-0 z-[5] bg-inherit' : ''
            }`}
          >
            <Cell
              col={col}
              value={row[col.key] as string ?? ''}
              isNew={isNew && col.key === 'placa'}
              onChange={(val) => {
                if (col.key === 'placa' && isNew) {
                  onUpdatePlaca(row.placa, val)
                } else {
                  onUpdate(row.placa, col.key, val)
                }
              }}
            />
          </td>
        ))}

        {/* actions */}
        <td className="sticky right-0 z-[5] border-b border-l border-slate-100 bg-inherit px-2 py-1 dark:border-slate-800">
          <div className="flex items-center gap-1">
            {saving ? (
              <Loader2 size={14} className="animate-spin text-brand-400" />
            ) : dirty ? (
              <>
                <button
                  onClick={() => onSave(row)}
                  title="Salvar linha"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-brand-600/10 text-brand-600 transition hover:bg-brand-600 hover:text-white dark:bg-brand-500/10 dark:text-brand-400"
                >
                  <Check size={12} />
                </button>
                <button
                  onClick={() => onDiscard(row)}
                  title="Descartar alterações"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  <Undo2 size={12} />
                </button>
              </>
            ) : savedFlash ? (
              <Check size={14} className="text-emerald-400" />
            ) : null}

            {!saving ? (
              <button
                onClick={() => onDelete(row)}
                title={isNew ? 'Cancelar' : 'Desmobilizar veículo'}
                className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-slate-300 opacity-0 transition hover:bg-rose-500/10 hover:text-rose-500 group-hover:opacity-100 dark:text-slate-600 dark:hover:text-rose-400"
              >
                {isNew ? <X size={12} /> : <Trash2 size={12} />}
              </button>
            ) : null}
          </div>
        </td>
      </tr>

      {error ? (
        <tr>
          <td
            colSpan={COLS.length + 1}
            className="border-b border-rose-500/20 bg-rose-500/5 px-3 py-1 text-[10px] font-semibold text-rose-400"
          >
            <AlertTriangle size={10} className="mr-1 inline" />
            {error}
          </td>
        </tr>
      ) : null}
    </>
  )
}

// ── Cell ───────────────────────────────────────────────────────────────────

type CellProps = {
  col: ColDef
  value: string
  isNew: boolean
  onChange: (val: string) => void
}

const CELL_BASE =
  'w-full rounded px-1.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none transition bg-transparent'
const CELL_FOCUS =
  'focus:bg-brand-50 focus:ring-1 focus:ring-brand-400 dark:focus:bg-brand-950/30 dark:focus:ring-brand-500'
const CELL_READONLY =
  'cursor-default select-all font-black text-slate-900 dark:text-white'

function Cell({ col, value, isNew, onChange }: CellProps) {
  // placa: readonly for existing rows, editable text for new rows
  if (col.key === 'placa') {
    if (isNew) {
      return (
        <input
          autoFocus
          value={value.startsWith('__new__') ? '' : value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="Ex: ABC1D23"
          maxLength={8}
          className={`${CELL_BASE} ${CELL_FOCUS} font-black uppercase placeholder-slate-400`}
          spellCheck={false}
        />
      )
    }
    return (
      <span className={`block px-1.5 py-1 ${CELL_READONLY} font-mono text-[11px]`}>
        {value}
      </span>
    )
  }

  // status: show pill (and select on focus)
  if (col.key === 'status' && col.options) {
    const pill = STATUS_PILL[value] ?? 'bg-slate-500/15 text-slate-400 ring-slate-500/20'
    return (
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full cursor-pointer appearance-none rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ring-1 outline-none transition ${pill} focus:ring-2`}
        >
          {col.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>
    )
  }

  // select columns
  if (col.options) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${CELL_BASE} ${CELL_FOCUS} cursor-pointer`}
      >
        {col.options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    )
  }

  // default text input
  return (
    <input
      value={value}
      onChange={(e) => onChange(
        col.key === 'placa' ? e.target.value.toUpperCase() : e.target.value.toUpperCase(),
      )}
      className={`${CELL_BASE} ${CELL_FOCUS}`}
      spellCheck={false}
    />
  )
}
