import { useCallback, useEffect, useMemo, useState } from 'react'
import { Archive, Check, CloudUpload, RefreshCw, RotateCcw, Search, Trash2 } from 'lucide-react'
import {
  FLEET_CATALOG_TRASH_CHANGED_EVENT,
  hydrateRestoredPlacasFromSupabase,
  restoreCatalogVehicleFromTrash,
  syncCatalogTrashWithSupabase,
} from '../../services/catalogTrashService'
import { supabaseConfigured } from '../../lib/supabase'
import { useFleet } from '../../frota/FleetContext'
import {
  FLEET_TRASH_REMOVED_AT,
  formatTrashPlaca,
  getTrashedFleetVehicles,
} from '../../frota/fleetTrash'

function formatDateBR(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function VehicleTrashSection() {
  const { reload: reloadFleet } = useFleet()
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(true)
  const [tick, setTick] = useState(0)
  const [restoringPlaca, setRestoringPlaca] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [hydrating, setHydrating] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const showMsg = useCallback((text: string, ok = true) => {
    setMsg({ text, ok })
    window.setTimeout(() => setMsg(null), 5000)
  }, [])

  const refresh = useCallback(() => {
    setTick((t) => t + 1)
    reloadFleet()
  }, [reloadFleet])

  useEffect(() => {
    const onChange = () => setTick((t) => t + 1)
    window.addEventListener(FLEET_CATALOG_TRASH_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(FLEET_CATALOG_TRASH_CHANGED_EVENT, onChange)
  }, [])

  useEffect(() => {
    if (!supabaseConfigured) return
    setHydrating(true)
    void hydrateRestoredPlacasFromSupabase()
      .then(() => setTick((t) => t + 1))
      .finally(() => setHydrating(false))
  }, [])

  const vehicles = useMemo(() => getTrashedFleetVehicles(), [tick])

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return vehicles
    return vehicles.filter((v) => {
      const blob = [
        v.placa,
        v.modelo,
        v.tipo,
        v.setor,
        v.responsavel,
        v.coordenador,
        v.base,
        v.prefixo,
      ]
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }, [vehicles, search])

  const restaurar = async (placa: string) => {
    setRestoringPlaca(placa)
    const res = await restoreCatalogVehicleFromTrash(placa)
    setRestoringPlaca(null)
    if (!res.ok) {
      showMsg(res.message, false)
      return
    }
    showMsg(`${formatTrashPlaca(placa)} restaurado ao catálogo ativo.`)
    refresh()
  }

  const sincronizar = async () => {
    setSyncing(true)
    const res = await syncCatalogTrashWithSupabase()
    setSyncing(false)
    if (!res.ok) {
      showMsg(res.message, false)
      return
    }
    const { activeUpserted, trashMarked, errors } = res.stats
    showMsg(
      `Sincronizado: ${activeUpserted} ativos, ${trashMarked} na lixeira${errors ? `, ${errors} erros` : ''}.`,
      errors === 0,
    )
    refresh()
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-rose-200/80 bg-white shadow-soft dark:border-rose-900/40 dark:bg-slate-950">
      {msg ? (
        <div
          className={`flex items-center gap-2 border-b px-4 py-3 text-xs font-bold sm:px-5 ${
            msg.ok
              ? 'border-emerald-100 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
              : 'border-rose-100 bg-rose-50 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'
          }`}
          role="status"
        >
          {msg.ok ? <Check size={14} aria-hidden /> : null}
          {msg.text}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-3 border-b border-rose-100 bg-rose-50/80 px-4 py-4 text-left transition hover:bg-rose-50 dark:border-rose-900/30 dark:bg-rose-950/20 dark:hover:bg-rose-950/30 sm:px-5"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-rose-200 bg-white text-rose-600 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            <Trash2 size={18} aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
              Lixeira de veículos
            </h2>
            <p className="mt-0.5 max-w-2xl text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
              Placas removidas do catálogo ativo. Restaure individualmente ou sincronize com o Supabase
              (marca <code className="font-mono text-[10px]">deleted_at</code> na lixeira).
            </p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
              {vehicles.length} veículo{vehicles.length !== 1 ? 's' : ''} · removidos em{' '}
              {formatDateBR(FLEET_TRASH_REMOVED_AT)}
              {hydrating ? ' · a carregar estado…' : ''}
            </p>
          </div>
        </div>
        <span className="mt-1 text-xs font-black uppercase tracking-wide text-rose-600 dark:text-rose-400">
          {expanded ? 'Ocultar' : 'Mostrar'}
        </span>
      </button>

      {expanded ? (
        <>
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:flex-row sm:items-end sm:px-5">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Buscar na lixeira
              </span>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                <Search size={14} className="shrink-0 text-slate-400" aria-hidden />
                <input
                  type="search"
                  placeholder="Placa, modelo, responsável…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none dark:text-slate-100"
                />
              </div>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void sincronizar()}
                disabled={syncing || !supabaseConfigured}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1E3A8A] px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-blue-900/15 transition hover:bg-blue-700 disabled:opacity-50 dark:shadow-blue-950/30"
              >
                <CloudUpload size={14} className={syncing ? 'animate-pulse' : ''} aria-hidden />
                {syncing ? 'A sincronizar…' : 'Sincronizar Supabase'}
              </button>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                <Archive size={14} aria-hidden />
                fleetTrash.gen.ts
              </div>
            </div>
          </div>

          {!supabaseConfigured ? (
            <div className="border-b border-amber-100 bg-amber-50/80 px-4 py-3 text-xs font-semibold text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200 sm:px-5">
              Configure o Supabase para restaurar veículos e sincronizar a lixeira.
            </div>
          ) : null}

          {filtrados.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm font-semibold text-slate-400">
              <RefreshCw size={16} aria-hidden />
              {vehicles.length === 0
                ? 'A lixeira está vazia — todos os veículos foram restaurados.'
                : 'Nenhum veículo corresponde à busca.'}
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                      <th className="px-5 py-3">Placa</th>
                      <th className="px-5 py-3">Modelo / Tipo</th>
                      <th className="px-5 py-3">Setor</th>
                      <th className="px-5 py-3">Responsável</th>
                      <th className="px-5 py-3">Gerência</th>
                      <th className="px-5 py-3">Base</th>
                      <th className="px-5 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filtrados.map((v) => (
                      <tr
                        key={v.id}
                        className="transition-colors hover:bg-rose-50/40 dark:hover:bg-rose-950/10"
                      >
                        <td className="px-5 py-3 font-mono text-xs font-black text-slate-900 dark:text-slate-100">
                          {formatTrashPlaca(v.placa)}
                        </td>
                        <td className="px-5 py-3">
                          <div className="font-extrabold text-slate-900 dark:text-slate-100">{v.modelo}</div>
                          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{v.tipo}</div>
                        </td>
                        <td className="px-5 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {v.setor || '—'}
                        </td>
                        <td className="px-5 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {v.responsavel || '—'}
                        </td>
                        <td className="px-5 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {v.coordenador || '—'}
                        </td>
                        <td className="px-5 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {v.base || '—'}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => void restaurar(v.placa)}
                            disabled={!supabaseConfigured || restoringPlaca === v.placa}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-extrabold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                          >
                            <RotateCcw
                              size={12}
                              className={restoringPlaca === v.placa ? 'animate-spin' : ''}
                              aria-hidden
                            />
                            {restoringPlaca === v.placa ? 'A restaurar…' : 'Restaurar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
                {filtrados.map((v) => (
                  <div key={v.id} className="space-y-3 px-4 py-4">
                    <div className="font-mono text-sm font-black text-slate-900 dark:text-slate-100">
                      {formatTrashPlaca(v.placa)}
                    </div>
                    <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                      {v.modelo} · {v.tipo}
                    </div>
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {v.setor || '—'} · {v.responsavel || '—'} · {v.coordenador || '—'}
                    </div>
                    <button
                      type="button"
                      onClick={() => void restaurar(v.placa)}
                      disabled={!supabaseConfigured || restoringPlaca === v.placa}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                    >
                      <RotateCcw size={12} aria-hidden />
                      {restoringPlaca === v.placa ? 'A restaurar…' : 'Restaurar ao catálogo'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:px-5">
            <span>
              A mostrar {filtrados.length} de {vehicles.length} veículo
              {vehicles.length !== 1 ? 's' : ''} na lixeira
            </span>
            <span>Somente superadmin</span>
          </div>
        </>
      ) : null}
    </section>
  )
}
