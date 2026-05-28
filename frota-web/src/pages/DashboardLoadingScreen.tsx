import { useEffect, useId, useRef, useState } from 'react'

const STATUS_STEPS = [
  { from: 0,  to: 20,  label: 'Conectando ao servidor…' },
  { from: 20, to: 45,  label: 'Carregando frota…' },
  { from: 45, to: 70,  label: 'Buscando checklists…' },
  { from: 70, to: 88,  label: 'Calculando indicadores…' },
  { from: 88, to: 101, label: 'Quase pronto…' },
] as const

/** Duração esperada de um carregamento típico em ms. */
const ESTIMATED_MS = 4_500

export function DashboardLoadingScreen({ done }: { done: boolean }) {
  const startRef = useRef(Date.now())
  const [pct, setPct]         = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const uid    = useId().replace(/:/g, '')
  const gradId = `dlGrad-${uid}`

  // Incrementa o progresso automaticamente até 90 %; salta para 100 % quando done=true
  useEffect(() => {
    if (done) {
      setPct(100)
      return
    }
    const id = setInterval(() => {
      const ms = Date.now() - startRef.current
      setElapsed(ms)
      const t     = Math.min(1, ms / ESTIMATED_MS)
      const eased = 1 - Math.pow(1 - t, 2) // ease-out quadrático
      setPct(Math.floor(eased * 90))
    }, 80)
    return () => clearInterval(id)
  }, [done])

  const statusLabel = STATUS_STEPS.find((s) => pct >= s.from && pct < s.to)?.label ?? 'Quase pronto…'
  const remaining   = done ? 0 : Math.max(0, Math.ceil((ESTIMATED_MS - elapsed) / 1000))

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16">
      {/* Logo + título */}
      <div className="flex flex-col items-center gap-4">
        <svg viewBox="0 0 60 60" className="h-16 w-16 drop-shadow-2xl" aria-hidden>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E40AF" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
          <circle cx="30" cy="30" r="28" fill={`url(#${gradId})`} />
          <path
            d="M18 32L26 40L42 22"
            stroke="white"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-3xl font-black tracking-tight text-[#1E3A8A] dark:text-blue-400">
          Frota Web
        </span>
        <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">
          Preparando seu painel de controle…
        </p>
      </div>

      {/* Barra de progresso + indicadores */}
      <div className="w-full max-w-sm">
        {/* Barra */}
        <div className="relative h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700/60">
          {/* trilha brilhante animada */}
          {!done && (
            <div
              className="absolute inset-y-0 w-1/3 animate-[shimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent"
              aria-hidden
            />
          )}
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-700 to-blue-400 shadow-md shadow-blue-500/30 transition-all duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Status + percentual */}
        <div className="mt-3 flex items-center justify-between gap-3 text-[13px]">
          <span className="flex items-center gap-2 font-semibold text-slate-500 dark:text-slate-400">
            {!done && (
              <span
                className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 dark:border-slate-600 dark:border-t-slate-300"
                aria-hidden
              />
            )}
            {done ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8l3.5 3.5L13 4.5" />
                </svg>
                Pronto!
              </span>
            ) : statusLabel}
          </span>
          <span className="font-black tabular-nums text-slate-700 dark:text-slate-200">
            {pct}%
          </span>
        </div>

        {/* Estimativa de tempo */}
        {remaining > 0 && !done && (
          <p className="mt-1.5 text-right text-xs font-semibold text-slate-400 dark:text-slate-500">
            Estimativa: ~{remaining}s restante{remaining !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  )
}
