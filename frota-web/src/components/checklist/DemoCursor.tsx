import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export type DemoCursorTarget = {
  selector: string
  tap?: boolean        // dispara animação de toque ao chegar
  key?: string | number // troca de key força reposicionamento mesmo com mesmo selector
}

type Pos = { x: number; y: number }

function getCenter(selector: string): Pos | null {
  // Procura dentro do scroll container do phone frame primeiro
  const scroller = document.querySelector('.overscroll-contain') as HTMLElement | null
  const root = scroller ?? document.body
  const el = root.querySelector(selector) as HTMLElement | null
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

export function DemoCursor({ target, visible }: { target: DemoCursorTarget | null; visible: boolean }) {
  const [pos, setPos] = useState<Pos | null>(null)
  const [tapping, setTapping] = useState(false)
  const prevSelector = useRef<string | null>(null)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reposiciona quando o target muda
  useLayoutEffect(() => {
    if (!target || !visible) return

    const compute = () => {
      const center = getCenter(target.selector)
      if (!center) return false
      setPos(center)
      return true
    }

    // Tenta imediatamente, depois com pequeno delay para aguardar render
    if (!compute()) {
      const t = setTimeout(() => compute(), 120)
      return () => clearTimeout(t)
    }
  }, [target, visible])

  // Dispara animação de toque quando target.tap === true
  useEffect(() => {
    if (!target?.tap || !visible) return
    if (tapTimer.current) clearTimeout(tapTimer.current)
    // Pequeno delay para o cursor chegar antes de "tocar"
    tapTimer.current = setTimeout(() => {
      setTapping(true)
      tapTimer.current = setTimeout(() => setTapping(false), 400)
    }, 300)
    return () => {
      if (tapTimer.current) clearTimeout(tapTimer.current)
    }
  }, [target, visible])

  // Rastreia mudanças de rota/scroll para atualizar posição
  useEffect(() => {
    if (!target || !visible) return
    const update = () => {
      const center = getCenter(target.selector)
      if (center) setPos(center)
    }
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [target, visible])

  if (!visible || !pos) return null

  return (
    <div
      className="pointer-events-none fixed z-[99999]"
      style={{
        left: pos.x,
        top: pos.y,
        transform: 'translate(-50%, -50%)',
        transition: 'left 0.45s cubic-bezier(0.25,0.46,0.45,0.94), top 0.45s cubic-bezier(0.25,0.46,0.45,0.94)',
      }}
    >
      {/* Ripple de toque */}
      {tapping && (
        <span
          className="absolute inset-0 -m-4 animate-ping rounded-full bg-white/40"
          style={{ animationDuration: '0.4s', animationIterationCount: 1 }}
        />
      )}
      {/* Círculo externo */}
      <span
        className={`absolute rounded-full border-2 border-white/80 bg-white/15 shadow-lg transition-transform duration-150 ${
          tapping ? 'scale-75' : 'scale-100'
        }`}
        style={{ width: 44, height: 44, top: -22, left: -22 }}
      />
      {/* Ponto central */}
      <span
        className="absolute rounded-full bg-white shadow-md"
        style={{ width: 10, height: 10, top: -5, left: -5 }}
      />
    </div>
  )
}
