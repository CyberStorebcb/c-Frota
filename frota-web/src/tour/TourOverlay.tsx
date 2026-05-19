import { useEffect, useLayoutEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, SkipForward, X, Sparkles } from 'lucide-react'
import { useTour } from './TourContext'
import { useLocation } from 'react-router-dom'

type Rect = { top: number; left: number; width: number; height: number }

const PAD = 8 // padding em torno do elemento destacado

export function TourOverlay() {
  const { active, step, stepIndex, total, next, prev, stop } = useTour()
  const location = useLocation()
  const [rect, setRect] = useState<Rect | null>(null)
  const [ready, setReady] = useState(false)

  // ── Aguarda a rota mudar antes de buscar o elemento ─────────────────────
  useEffect(() => {
    setReady(false)
    setRect(null)
    if (!active || !step) return
    if (location.pathname !== step.path) return

    const waitMs = step.waitMs ?? 250
    const timer = window.setTimeout(() => setReady(true), waitMs)
    return () => window.clearTimeout(timer)
  }, [active, step, location.pathname, stepIndex])

  // ── Calcula a posição do elemento destacado ─────────────────────────────
  useLayoutEffect(() => {
    if (!ready || !step) return
    if (!step.selector) { setRect(null); return }

    const update = () => {
      const el = document.querySelector(step.selector!) as HTMLElement | null
      if (!el) { setRect(null); return }
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
      // pequeno delay para terminar scroll
      window.setTimeout(() => {
        const r = el.getBoundingClientRect()
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
      }, 300)
    }
    update()

    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [ready, step])

  if (!active || !step) return null

  const isCentered = !step.selector || !rect
  const hasSpotlight = !isCentered && rect !== null

  // ── Posição do tooltip ──────────────────────────────────────────────────
  let tooltipStyle: React.CSSProperties = {}
  if (hasSpotlight && rect) {
    const placement = step.placement ?? 'auto'
    const TOOLTIP_W = 360
    const TOOLTIP_H = 200
    const vh = window.innerHeight
    const vw = window.innerWidth

    let top = 0
    let left = 0
    let actual: 'top' | 'bottom' | 'left' | 'right' = 'bottom'

    if (placement === 'top' || (placement === 'auto' && rect.top > vh / 2)) {
      top = rect.top - TOOLTIP_H - PAD - 12
      left = rect.left + rect.width / 2 - TOOLTIP_W / 2
      actual = 'top'
    } else if (placement === 'left') {
      top = rect.top + rect.height / 2 - TOOLTIP_H / 2
      left = rect.left - TOOLTIP_W - PAD - 12
      actual = 'left'
    } else if (placement === 'right') {
      top = rect.top + rect.height / 2 - TOOLTIP_H / 2
      left = rect.left + rect.width + PAD + 12
      actual = 'right'
    } else {
      // bottom (default / auto)
      top = rect.top + rect.height + PAD + 12
      left = rect.left + rect.width / 2 - TOOLTIP_W / 2
      actual = 'bottom'
    }

    // clamp dentro da viewport
    left = Math.max(12, Math.min(vw - TOOLTIP_W - 12, left))
    top = Math.max(12, Math.min(vh - TOOLTIP_H - 12, top))

    tooltipStyle = { top, left, width: TOOLTIP_W, position: 'fixed' }
    void actual // posição de seta ficaria aqui no futuro
  }

  const isLast = stepIndex === total - 1
  const isFirst = stepIndex === 0
  const progress = ((stepIndex + 1) / total) * 100

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999]">
      {/* ── Overlay escuro ─────────────────────────────────────────────── */}
      {isCentered ? (
        <div className="pointer-events-auto absolute inset-0 bg-black/70 backdrop-blur-sm" />
      ) : hasSpotlight && rect ? (
        <>
          {/* 4 retângulos formando o "buraco" ao redor do elemento */}
          <div
            className="pointer-events-auto absolute bg-black/70 backdrop-blur-[2px] transition-all"
            style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top - PAD) }}
          />
          <div
            className="pointer-events-auto absolute bg-black/70 backdrop-blur-[2px] transition-all"
            style={{
              top: rect.top + rect.height + PAD,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          <div
            className="pointer-events-auto absolute bg-black/70 backdrop-blur-[2px] transition-all"
            style={{
              top: Math.max(0, rect.top - PAD),
              left: 0,
              width: Math.max(0, rect.left - PAD),
              height: rect.height + PAD * 2,
            }}
          />
          <div
            className="pointer-events-auto absolute bg-black/70 backdrop-blur-[2px] transition-all"
            style={{
              top: Math.max(0, rect.top - PAD),
              left: rect.left + rect.width + PAD,
              right: 0,
              height: rect.height + PAD * 2,
            }}
          />
          {/* Borda animada em torno do elemento */}
          <div
            className="pointer-events-none absolute rounded-2xl ring-4 ring-brand-400 transition-all"
            style={{
              top: rect.top - PAD,
              left: rect.left - PAD,
              width: rect.width + PAD * 2,
              height: rect.height + PAD * 2,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0)',
              animation: 'tour-pulse 2s ease-in-out infinite',
            }}
          />
        </>
      ) : null}

      {/* ── Tooltip / Modal ─────────────────────────────────────────────── */}
      <div
        className={`pointer-events-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl ${
          isCentered ? 'fixed left-1/2 top-1/2 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2' : ''
        }`}
        style={isCentered ? undefined : tooltipStyle}
      >
        {/* Barra de progresso */}
        <div className="h-1 overflow-hidden rounded-t-2xl bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-5">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-brand-400" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-400">
                Passo {stepIndex + 1} de {total}
              </span>
            </div>
            <button
              type="button"
              onClick={stop}
              className="text-slate-500 transition hover:text-slate-200"
              title="Fechar tour"
            >
              <X size={16} />
            </button>
          </div>

          <h3 className="mb-2 text-lg font-black text-slate-100">{step.title}</h3>
          <p className="text-sm leading-relaxed text-slate-300">{step.content}</p>

          <div className="mt-5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={stop}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              <SkipForward size={12} />
              Pular
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prev}
                disabled={isFirst}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-extrabold text-slate-300 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft size={14} />
                Voltar
              </button>
              <button
                type="button"
                onClick={isLast ? stop : next}
                className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-extrabold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600"
              >
                {isLast ? 'Concluir' : 'Próximo'}
                {!isLast && <ChevronRight size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Keyframes da pulsação */}
      <style>{`
        @keyframes tour-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(56,189,248,0.55); }
          50%       { box-shadow: 0 0 0 8px rgba(56,189,248,0); }
        }
      `}</style>
    </div>
  )
}
