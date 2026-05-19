import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { TOUR_STEPS, shouldAutoStartTour, type TourStep } from './tourSteps'
import { useAuth } from '../auth/AuthContext'

type TourCtx = {
  active: boolean
  stepIndex: number
  step: TourStep | null
  total: number
  start: () => void
  stop: () => void
  next: () => void
  prev: () => void
  goTo: (i: number) => void
}

const Ctx = createContext<TourCtx | null>(null)

const STORAGE_KEY = 'frota.tour.completed'

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const autoStartedFor = useRef<string | null>(null)

  // ── Auto-start para usuários demo ────────────────────────────────────────
  useEffect(() => {
    if (!user?.email) return
    if (!shouldAutoStartTour(user.email)) return
    if (autoStartedFor.current === user.email) return
    autoStartedFor.current = user.email
    setStepIndex(0)
    setActive(true)
  }, [user?.email])

  // ── Navegação automática quando o passo muda de rota ────────────────────
  useEffect(() => {
    if (!active) return
    const step = TOUR_STEPS[stepIndex]
    if (!step) return
    if (location.pathname !== step.path) {
      navigate(step.path)
    }
  }, [active, stepIndex, location.pathname, navigate])

  const start = useCallback(() => {
    setStepIndex(0)
    setActive(true)
  }, [])

  const stop = useCallback(() => {
    setActive(false)
    try { localStorage.setItem(STORAGE_KEY, 'true') } catch { /* ignore */ }
  }, [])

  const next = useCallback(() => {
    setStepIndex((i) => {
      const n = i + 1
      if (n >= TOUR_STEPS.length) {
        setActive(false)
        try { localStorage.setItem(STORAGE_KEY, 'true') } catch { /* ignore */ }
        return i
      }
      return n
    })
  }, [])

  const prev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1))
  }, [])

  const goTo = useCallback((i: number) => {
    if (i < 0 || i >= TOUR_STEPS.length) return
    setStepIndex(i)
  }, [])

  const value = useMemo<TourCtx>(
    () => ({
      active,
      stepIndex,
      step: active ? TOUR_STEPS[stepIndex] ?? null : null,
      total: TOUR_STEPS.length,
      start,
      stop,
      next,
      prev,
      goTo,
    }),
    [active, stepIndex, start, stop, next, prev, goTo],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTour() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useTour must be used inside TourProvider')
  return c
}
