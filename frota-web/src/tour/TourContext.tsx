import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { TOUR_STEPS, shouldAutoStartTour, type TourStep } from './tourSteps'
import { useAuth } from '../auth/AuthContext'

type TourCtx = {
  active: boolean
  stepIndex: number
  step: TourStep | null
  total: number
  /** Inicia do passo salvo (retoma onde parou). */
  start: () => void
  /** Inicia sempre do passo 0, ignorando progresso salvo. */
  startFresh: () => void
  stop: () => void
  next: () => void
  prev: () => void
  goTo: (i: number) => void
}

const Ctx = createContext<TourCtx | null>(null)

const STORAGE_COMPLETED = 'frota.tour.completed'
const STORAGE_PROGRESS  = 'frota.tour.progress'

function loadProgress(): number {
  try {
    const v = localStorage.getItem(STORAGE_PROGRESS)
    const n = v ? parseInt(v, 10) : 0
    return Number.isFinite(n) && n >= 0 && n < TOUR_STEPS.length ? n : 0
  } catch {
    return 0
  }
}

function saveProgress(index: number) {
  try { localStorage.setItem(STORAGE_PROGRESS, String(index)) } catch { /* ignore */ }
}

function clearProgress() {
  try { localStorage.removeItem(STORAGE_PROGRESS) } catch { /* ignore */ }
}

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
    const saved = loadProgress()
    tourNavigatingRef.current = true
    setStepIndex(saved)
    setActive(true)
  }, [user?.email])

  // ── Persiste progresso sempre que o passo muda (enquanto ativo) ──────────
  useEffect(() => {
    if (active) saveProgress(stepIndex)
  }, [active, stepIndex])

  // ── Navegação automática quando o passo muda de rota ────────────────────
  // tourNavigatingRef = true indica que a navegação foi iniciada pelo tour,
  // não pelo usuário — evita que o tour se encerre ao navegar entre passos.
  const tourNavigatingRef = useRef(false)

  useEffect(() => {
    if (!active) return
    const step = TOUR_STEPS[stepIndex]
    if (!step) return
    if (location.pathname !== step.path) {
      if (tourNavigatingRef.current) {
        // Ainda aguardando a navegação do tour chegar — ignora.
        return
      }
      // O usuário navegou manualmente para fora do roteiro: encerra o tour.
      setActive(false)
      clearProgress()
      try { localStorage.setItem(STORAGE_COMPLETED, 'true') } catch { /* ignore */ }
    } else {
      tourNavigatingRef.current = false
    }
  }, [active, stepIndex, location.pathname])

  // Inicia retomando progresso salvo
  const start = useCallback(() => {
    const saved = loadProgress()
    tourNavigatingRef.current = true
    setStepIndex(saved)
    setActive(true)
  }, [])

  // Inicia sempre do zero
  const startFresh = useCallback(() => {
    clearProgress()
    tourNavigatingRef.current = true
    setStepIndex(0)
    setActive(true)
  }, [])

  const stop = useCallback(() => {
    setActive(false)
    clearProgress()
    try { localStorage.setItem(STORAGE_COMPLETED, 'true') } catch { /* ignore */ }
  }, [])

  const next = useCallback(() => {
    setStepIndex((i) => {
      const n = i + 1
      if (n >= TOUR_STEPS.length) {
        setActive(false)
        clearProgress()
        try { localStorage.setItem(STORAGE_COMPLETED, 'true') } catch { /* ignore */ }
        return i
      }
      const nextStep = TOUR_STEPS[n]
      const curStep = TOUR_STEPS[i]
      if (nextStep && curStep && nextStep.path !== curStep.path) {
        tourNavigatingRef.current = true
        navigate(nextStep.path)
      }
      return n
    })
  }, [navigate])

  const prev = useCallback(() => {
    setStepIndex((i) => {
      const n = Math.max(0, i - 1)
      const prevStep = TOUR_STEPS[n]
      const curStep = TOUR_STEPS[i]
      if (prevStep && curStep && prevStep.path !== curStep.path) {
        tourNavigatingRef.current = true
        navigate(prevStep.path)
      }
      return n
    })
  }, [navigate])

  const goTo = useCallback((i: number) => {
    if (i < 0 || i >= TOUR_STEPS.length) return
    const curStep = TOUR_STEPS[stepIndex]
    const targetStep = TOUR_STEPS[i]
    if (targetStep && curStep && targetStep.path !== curStep.path) {
      tourNavigatingRef.current = true
      navigate(targetStep.path)
    }
    setStepIndex(i)
  }, [navigate, stepIndex])

  const value = useMemo<TourCtx>(
    () => ({
      active,
      stepIndex,
      step: active ? TOUR_STEPS[stepIndex] ?? null : null,
      total: TOUR_STEPS.length,
      start,
      startFresh,
      stop,
      next,
      prev,
      goTo,
    }),
    [active, stepIndex, start, startFresh, stop, next, prev, goTo],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTour() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useTour must be used inside TourProvider')
  return c
}
