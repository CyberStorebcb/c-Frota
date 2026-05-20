import { useEffect, useRef, useState } from 'react'
import { DEMO_TIMING, demoDelay, resolveDemoProfile, type ChecklistDemoProfile } from './checklistDemoConfig'

export type ChecklistDemoPhase = 'select' | 'identify' | 'form' | 'done'

type Options = {
  enabled: boolean
  speedFactor: number
  tipoOverride?: string | null
  loop: boolean
  hasTipo: boolean
  hasOperador: boolean
  isConcluido: boolean
  onSelectTipo: (tipo: string) => void
  onConfirmOperador: (nome: string, matricula: string) => void
  onRestart: () => void
}

export function useChecklistDemoPlayer({
  enabled,
  speedFactor,
  tipoOverride,
  loop,
  hasTipo,
  hasOperador,
  isConcluido,
  onSelectTipo,
  onConfirmOperador,
  onRestart,
}: Options) {
  const profile = resolveDemoProfile(tipoOverride)
  const [highlightTipo, setHighlightTipo] = useState<string | null>(null)
  const [demoNome, setDemoNome] = useState('')
  const [demoMatricula, setDemoMatricula] = useState('')
  const [pulseSubmit, setPulseSubmit] = useState(false)
  const ranSelect = useRef(false)
  const ranIdentify = useRef(false)

  const phase: ChecklistDemoPhase = !hasTipo
    ? 'select'
    : !hasOperador
      ? 'identify'
      : isConcluido
        ? 'done'
        : 'form'

  // Etapa 1 — escolha do checklist
  useEffect(() => {
    if (!enabled || phase !== 'select') {
      ranSelect.current = false
      return
    }
    if (ranSelect.current) return
    ranSelect.current = true

    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(setTimeout(resolve, demoDelay(ms, speedFactor)))
      })

    void (async () => {
      await wait(DEMO_TIMING.selectPause)
      if (cancelled) return
      setHighlightTipo(profile.tipo)
      await wait(DEMO_TIMING.selectHighlight)
      if (cancelled) return
      setHighlightTipo(null)
      onSelectTipo(profile.tipo)
    })()

    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [enabled, phase, profile.tipo, speedFactor, onSelectTipo])

  // Etapa 2 — identificação com efeito de digitação
  useEffect(() => {
    if (!enabled || phase !== 'identify') {
      ranIdentify.current = false
      setDemoNome('')
      setDemoMatricula('')
      setPulseSubmit(false)
      return
    }
    if (ranIdentify.current) return
    ranIdentify.current = true

    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(setTimeout(resolve, demoDelay(ms, speedFactor)))
      })

    void (async () => {
      for (let i = 1; i <= profile.operador.length; i++) {
        if (cancelled) return
        setDemoNome(profile.operador.slice(0, i))
        await wait(DEMO_TIMING.identifyChar)
      }
      await wait(DEMO_TIMING.identifyPause)
      for (let i = 1; i <= profile.matricula.length; i++) {
        if (cancelled) return
        setDemoMatricula(profile.matricula.slice(0, i))
        await wait(DEMO_TIMING.identifyChar)
      }
      await wait(DEMO_TIMING.identifyPause)
      if (cancelled) return
      setPulseSubmit(true)
      await wait(DEMO_TIMING.identifySubmit)
      if (cancelled) return
      setPulseSubmit(false)
      onConfirmOperador(profile.operador, profile.matricula)
    })()

    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [enabled, phase, profile.operador, profile.matricula, speedFactor, onConfirmOperador])

  // Etapa 4 — loop opcional após conclusão
  useEffect(() => {
    if (!enabled || !loop || phase !== 'done') return
    const t = setTimeout(onRestart, demoDelay(DEMO_TIMING.conclusionHold, speedFactor))
    return () => clearTimeout(t)
  }, [enabled, loop, phase, speedFactor, onRestart])

  return {
    profile,
    phase,
    highlightTipo,
    demoNome,
    demoMatricula,
    pulseSubmit,
  }
}

export type { ChecklistDemoProfile }
