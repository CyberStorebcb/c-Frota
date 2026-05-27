import { useCallback, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'

export function useFilterPanelVisible(storageKey: string, defaultVisible = false) {
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === 'true'
    } catch {
      return defaultVisible
    }
  })

  const setVisiblePersisted = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      setVisible((prev) => {
        const value = typeof next === 'function' ? next(prev) : next
        try {
          localStorage.setItem(storageKey, String(value))
        } catch {
          /* ignore */
        }
        return value
      })
    },
    [storageKey],
  )

  return [visible, setVisiblePersisted] as const
}

export type FilterPanelProps = {
  visible: boolean
  onVisibleChange: (visible: boolean) => void
  activeCount: number
  onClear?: () => void
  summary?: string | null
  children: ReactNode
  variant?: 'section' | 'card'
  className?: string
  toggleButtonProps?: {
    id?: string
    'data-tour'?: string
    'aria-controls'?: string
  }
  contentProps?: {
    id?: string
    'data-tour'?: string
  }
  headerExtra?: ReactNode
  /** Renderizado imediatamente antes do botão Expandir/Ocultar */
  beforeToggleExtra?: ReactNode
}

export function FilterPanel({
  visible,
  onVisibleChange,
  activeCount,
  onClear,
  summary,
  children,
  variant = 'card',
  className,
  toggleButtonProps,
  contentProps,
  headerExtra,
  beforeToggleExtra,
}: FilterPanelProps) {
  const active = activeCount > 0

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-white shadow-sm dark:bg-slate-800">
          <SlidersHorizontal size={16} aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Filtros
            </p>
            {active ? (
              <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-black text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                {activeCount} ativo{activeCount === 1 ? '' : 's'}
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                Nenhum filtro aplicado
              </span>
            )}
          </div>
          {!visible && active && summary ? (
            <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {summary}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {headerExtra}
        {active && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-rose-900/60 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
          >
            <RotateCcw size={13} />
            Limpar filtros
          </button>
        ) : null}
        {beforeToggleExtra}
        <button
          type="button"
          id={toggleButtonProps?.id}
          data-tour={toggleButtonProps?.['data-tour']}
          aria-expanded={visible}
          aria-controls={toggleButtonProps?.['aria-controls'] ?? contentProps?.id}
          onClick={() => onVisibleChange(!visible)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {visible ? (
            <>
              <ChevronUp size={13} className="text-slate-400" />
              Ocultar
            </>
          ) : (
            <>
              <ChevronDown size={13} className="text-slate-400" />
              Expandir
            </>
          )}
        </button>
      </div>
    </div>
  )

  const body = (
    <div
      id={contentProps?.id}
      data-tour={contentProps?.['data-tour']}
      className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${visible ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
    >
      <div className="overflow-hidden">
        <div className="flex flex-col gap-4 border-t border-slate-200/80 px-4 py-4 dark:border-slate-800/60 sm:px-5">
          {children}
        </div>
      </div>
    </div>
  )

  if (variant === 'section') {
    return (
      <section
        className={`shrink-0 border-b border-slate-200/80 bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-950/40 ${className ?? ''}`}
      >
        {header}
        {body}
      </section>
    )
  }

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-950 ${className ?? ''}`}
    >
      {header}
      {body}
    </div>
  )
}

export type FilterPanelGroupProps = {
  title: string
  children: ReactNode
  className?: string
  columns?: string
}

export function FilterPanelGroup({
  title,
  children,
  className,
  columns = 'sm:grid-cols-2',
}: FilterPanelGroupProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 ${className ?? ''}`}
    >
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <div className={`grid gap-3 ${columns}`}>{children}</div>
    </div>
  )
}

export type FilterSearchFieldProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function FilterSearchField({
  value,
  onChange,
  placeholder = 'Buscar...',
  className,
}: FilterSearchFieldProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 ${className ?? ''}`}
    >
      <Search size={15} className="shrink-0 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 placeholder:text-slate-400 outline-none dark:text-slate-200"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Limpar busca"
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  )
}
