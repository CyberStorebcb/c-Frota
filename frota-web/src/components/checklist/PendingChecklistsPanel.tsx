import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, RefreshCw } from 'lucide-react'
import {
  listStuckChecklists,
  retryAllStuck,
  subscribeOfflineQueue,
  type StuckChecklistInfo,
} from '../../checklists/offlineQueue'
import { syncOfflineChecklists } from '../../checklists/syncOfflineChecklists'
import { formatPlaca } from '../../frota/vehicleRegistry'

function formatData(iso: string): string {
  // dataInspecao vem como YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  return iso
}

/**
 * Painel das pendências de envio DESTE aparelho (fila local IndexedDB).
 * Mostra checklists que ainda não chegaram ao servidor e permite reenviar.
 */
export function PendingChecklistsPanel() {
  const [items, setItems] = useState<StuckChecklistInfo[]>([])
  const [expanded, setExpanded] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [online, setOnline] = useState(() => navigator.onLine)

  const refresh = useCallback(() => {
    void listStuckChecklists().then(setItems)
  }, [])

  useEffect(() => {
    refresh()
    const unsub = subscribeOfflineQueue(refresh)
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      unsub()
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [refresh])

  const handleRetryAll = useCallback(async () => {
    if (retrying) return
    setRetrying(true)
    try {
      await retryAllStuck()
      await syncOfflineChecklists()
      refresh()
    } finally {
      setRetrying(false)
    }
  }, [retrying, refresh])

  if (items.length === 0) return null

  return (
    <div className="w-full rounded-2xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800/60 dark:bg-amber-950/30">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
          <AlertTriangle size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-amber-800 dark:text-amber-200">
            {items.length} checklist(s) aguardando envio neste aparelho
          </p>
          <p className="text-[10px] font-semibold text-amber-700/80 dark:text-amber-300/70">
            Toque para {expanded ? 'ocultar' : 'ver detalhes'} e reenviar
          </p>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-amber-700 dark:text-amber-300" />
        ) : (
          <ChevronDown size={16} className="text-amber-700 dark:text-amber-300" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          <ul className="space-y-1.5">
            {items.map((it) => (
              <li
                key={it.localId}
                className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-2.5 py-1.5 dark:border-amber-900/40 dark:bg-slate-900/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-slate-800 dark:text-slate-100">
                    {formatPlaca(it.placa)}
                    <span className="ml-1.5 font-semibold text-slate-400">·</span>
                    <span className="ml-1.5 font-semibold text-slate-500 dark:text-slate-400">{formatData(it.dataInspecao)}</span>
                  </p>
                  <p className="truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {it.operador}
                    {it.attempts > 0 ? ` · ${it.attempts} tentativa(s)` : ''}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                    it.status === 'error'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                  }`}
                >
                  {it.status === 'error' ? 'Falhou' : it.status === 'syncing' ? 'Enviando' : 'Pendente'}
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => void handleRetryAll()}
            disabled={retrying || !online}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-black text-white transition active:scale-[.98] hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {retrying ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {retrying
              ? 'Reenviando…'
              : !online
                ? 'Sem internet para reenviar'
                : 'Reenviar todos agora'}
          </button>
        </div>
      )}
    </div>
  )
}
