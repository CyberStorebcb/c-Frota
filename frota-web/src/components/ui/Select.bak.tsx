import { ChevronDown, Search, Check } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Portal } from './Portal'

export type SelectOption = { label: string; value: string }

export function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: SelectOption[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null)

  const selected = useMemo(
    () => options.find((o) => o.value === value)?.label ?? value,
    [options, value],
  )

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return options
    return options.filter((o) => o.label.toLowerCase().includes(s))
  }, [options, q])

  useEffect(() => {
    if (!open) return
    const btn = btnRef.current
    if (!btn) return

    const update = () => {
      const r = btn.getBoundingClientRect()
      setPos({ left: r.left, top: r.bottom + 8, width: r.width })
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open])

  return (
    <div className="min-w-[160px] flex-1">
      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </div>

      <div className="relative mt-1">
        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={[
            'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm font-bold',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40',
            value !== 'todos'
              ? 'border-slate-900 bg-white text-slate-900 dark:border-slate-200 dark:bg-slate-950 dark:text-slate-100'
              : 'border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100',
            'shadow-sm hover:bg-slate-50 dark:hover:bg-slate-900/60',
          ].join(' ')}
        >
          <span className="truncate">{selected}</span>
          <ChevronDown
            size={16}
            className={[
              'text-slate-400 transition-transform duration-150',
              open ? 'rotate-180' : 'rotate-0',
            ].join(' ')}
          />
        </button>

        {open ? (
          <Portal>
            <button
              type="button"
              className="fixed inset-0 z-[9998] cursor-default"
              onPointerDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setOpen(false)
              }}
              aria-label="Fechar"
            />

            {pos ? (
              <div
                className="anim-dropdown-in fixed z-[9999] rounded-2xl border border-slate-200 bg-white p-3 shadow-soft dark:border-slate-800 dark:bg-slate-950"
                style={{ left: pos.left, top: pos.top, width: pos.width }}
                onPointerDownCapture={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
                  <Search size={14} className="text-slate-400 dark:text-slate-500" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                    autoFocus
                  />
                </div>

                <div className="mt-2 max-h-64 overflow-auto pr-1">
                  {filtered.map((o) => {
                    const isSel = o.value === value
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onChange(o.value)
                          setOpen(false)
                        }}
                        className={[
                          'flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-extrabold',
                          isSel
                            ? 'bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100'
                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900/60',
                        ].join(' ')}
                      >
                        {o.label}
                        {isSel ? <Check size={16} /> : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </Portal>
        ) : null}
      </div>
    </div>
  )
}

