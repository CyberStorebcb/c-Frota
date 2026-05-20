import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { TOUR_STEPS, shouldAutoStartTour, type TourStep } from './tourSteps'
import { useAuth } from '../auth/AuthContext'

type TourCtx = {
  active: boolean
  finished: boolean
  stepIndex: number
  step: TourStep | null
  total: number
  /** Inicia do passo salvo (retoma onde parou). */
  start: () => void
  /** Inicia sempre do passo 0, ignorando progresso salvo. */
  startFresh: () => void
  /** Encerra o tour ativo sem marcar como concluído. */
  stop: () => void
  /** Reinicia do zero (mesmo comportamento que startFresh, exposto para o botão de reset). */
  resetTour: () => void
  next: () => void
  prev: () => void
  goTo: (i: number) => void
}

const Ctx = createContext<TourCtx | null>(null)

const STORAGE_PROGRESS = 'frota.tour.progress'

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
  const [finished, setFinished] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const lastLoginEmailRef = useRef<string | null>(null)

  // Índice aguardando a rota chegar antes de ser aplicado ao state.
  // -1 = nenhuma navegação pendente.
  const pendingIndexRef = useRef<number>(-1)

  // ── Auto-start: reinicia do zero a cada novo login do usuário demo ────────
  useEffect(() => {
    if (!user?.email) {
      lastLoginEmailRef.current = null
      return
    }
    if (!shouldAutoStartTour(user.email)) return
    if (lastLoginEmailRef.current === user.email) return
    lastLoginEmailRef.current = user.email
    clearProgress()
    pendingIndexRef.current = -1
    setStepIndex(0)
    setActive(true)
    setFinished(false)
  }, [user?.email])

  // ── Persiste progresso sempre que o passo muda (enquanto ativo) ──────────
  useEffect(() => {
    if (active) saveProgress(stepIndex)
  }, [active, stepIndex])

  // ── Confirma stepIndex quando a rota destino chega ───────────────────────
  // Quando next()/prev() precisam trocar de rota, eles apenas chamam navigate()
  // e guardam o índice em pendingIndexRef. Este efeito aplica o índice ao state
  // somente depois que o React Router confirma que a nova rota chegou, garantindo
  // que o overlay exiba o conteúdo do step certo para a página certa.
  useEffect(() => {
    if (!active) return

    const pending = pendingIndexRef.current
    if (pending >= 0) {
      const targetStep = TOUR_STEPS[pending]
      if (targetStep && location.pathname === targetStep.path) {
        // Rota chegou: aplica o índice agora.
        pendingIndexRef.current = -1
        setStepIndex(pending)
      }
      // Ainda em trânsito — aguarda a próxima mudança de location.
      return
    }

    // Sem navegação pendente: verifica se o usuário saiu manualmente da rota.
    const step = TOUR_STEPS[stepIndex]
    if (step && location.pathname !== step.path) {
      setActive(false)
      clearProgress()
    }
  }, [active, stepIndex, location.pathname])

  const isDemo = shouldAutoStartTour(user?.email)

  // ── Helpers para navegar entre steps ────────────────────────────────────
  function applyIndex(current: number, target: number) {
    if (target >= TOUR_STEPS.length) {
      setActive(false)
      clearProgress()
      if (isDemo) setFinished(true)
      return
    }
    if (target < 0) return

    const curStep = TOUR_STEPS[current]
    const targetStep = TOUR_STEPS[target]
    if (targetStep && curStep && targetStep.path !== curStep.path) {
      // Troca de rota: navega primeiro, aplica índice só quando a rota chegar.
      pendingIndexRef.current = target
      navigate(targetStep.path)
    } else {
      // Mesma rota: aplica imediatamente.
      setStepIndex(target)
    }
  }

  // Inicia retomando progresso salvo
  const start = useCallback(() => {
    const saved = loadProgress()
    pendingIndexRef.current = -1
    setStepIndex(saved)
    setActive(true)
  }, [])

  // Inicia sempre do zero
  const startFresh = useCallback(() => {
    clearProgress()
    pendingIndexRef.current = -1
    setStepIndex(0)
    setActive(true)
  }, [])

  const stop = useCallback(() => {
    setActive(false)
    setFinished(false)
    clearProgress()
    pendingIndexRef.current = -1
  }, [])

  const resetTour = useCallback(() => {
    clearProgress()
    pendingIndexRef.current = -1
    setStepIndex(0)
    setActive(true)
    setFinished(false)
  }, [])

  const next = useCallback(() => {
    setStepIndex((i) => {
      applyIndex(i, i + 1)
      // Se houve troca de rota, o stepIndex permanece em `i` até a rota chegar.
      // Se mesma rota, applyIndex já chamou setStepIndex(i+1) — retornar i aqui
      // seria sobrescrito pelo setStepIndex interno, mas React batcha as atualizações,
      // então retornamos i+1 apenas quando não há troca de rota.
      const nextStep = TOUR_STEPS[i + 1]
      const curStep = TOUR_STEPS[i]
      const sameRoute = !nextStep || !curStep || nextStep.path === curStep.path
      return sameRoute ? Math.min(i + 1, TOUR_STEPS.length - 1) : i
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const prev = useCallback(() => {
    setStepIndex((i) => {
      const target = Math.max(0, i - 1)
      applyIndex(i, target)
      const prevStep = TOUR_STEPS[target]
      const curStep = TOUR_STEPS[i]
      const sameRoute = !prevStep || !curStep || prevStep.path === curStep.path
      return sameRoute ? target : i
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = useCallback((target: number) => {
    if (target < 0 || target >= TOUR_STEPS.length) return
    setStepIndex((i) => {
      applyIndex(i, target)
      const targetStep = TOUR_STEPS[target]
      const curStep = TOUR_STEPS[i]
      const sameRoute = !targetStep || !curStep || targetStep.path === curStep.path
      return sameRoute ? target : i
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<TourCtx>(
    () => ({
      active,
      finished,
      stepIndex,
      step: active ? TOUR_STEPS[stepIndex] ?? null : null,
      total: TOUR_STEPS.length,
      start,
      startFresh,
      stop,
      resetTour,
      next,
      prev,
      goTo,
    }),
    [active, finished, stepIndex, start, startFresh, stop, resetTour, next, prev, goTo],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTour() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useTour must be used inside TourProvider')
  return c
}
