import { useCallback, useEffect, useState } from 'react'
import { fetchCompletedChecklistsInPeriod } from '../checklists/fetchChecklistCompletions'
import { normalizePlacaChecklist } from '../checklists/checklistFleetScope'
import { isOperacionalAtivosDashboardKpi } from '../frota/vehicleOperationalStatus'
import type { FleetVehicle } from '../frota/vehicleRegistry'

export type ChecklistNotification = {
  id: string           // e.g. "2026-05-19-10"
  timestamp: number    // ms quando foi gerada
  hojeIso: string
  realizaram: number
  naoRealizaram: number
  total: number
  lida: boolean
}

const STORAGE_KEY = 'frota.notifications.checklist'
const NOTIFY_HOURS = [10, 16, 18]

function hojeLocalIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function loadStored(): ChecklistNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ChecklistNotification[]
  } catch {
    return []
  }
}

function saveStored(notifs: ChecklistNotification[]) {
  // mantém apenas os últimos 30 dias
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  const trimmed = notifs.filter((n) => n.timestamp >= cutoff)
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed)) } catch { /* ignore */ }
}

async function fetchTodayStats(activeVehicles: FleetVehicle[]): Promise<{ realizaram: number; naoRealizaram: number; total: number }> {
  const hojeIso = hojeLocalIso()
  const data = await fetchCompletedChecklistsInPeriod(hojeIso, hojeIso)

  const placasFeitas = new Set<string>()
  for (const row of data) {
    const dv = row.dados_veiculo && typeof row.dados_veiculo === 'object'
      ? (row.dados_veiculo as Record<string, unknown>)
      : {}
    const placa = normalizePlacaChecklist(String(dv.placa ?? ''))
    if (placa) placasFeitas.add(placa)
  }

  const total = activeVehicles.filter(
    (v) => isOperacionalAtivosDashboardKpi(v.placa, v.prefixo ?? '', v.status),
  ).length
  const realizaram = placasFeitas.size
  const naoRealizaram = Math.max(0, total - realizaram)
  return { realizaram, naoRealizaram, total }
}

export function useChecklistNotifications(allVehicles: FleetVehicle[]) {
  const [notifications, setNotifications] = useState<ChecklistNotification[]>(loadStored)

  const unreadCount = notifications.filter((n) => !n.lida).length

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, lida: true }))
      saveStored(updated)
      return updated
    })
  }, [])

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => n.id === id ? { ...n, lida: true } : n)
      saveStored(updated)
      return updated
    })
  }, [])

  // Verifica a cada minuto se deve gerar nova notificação
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const check = async () => {
      const now = new Date()
      const hojeIso = hojeLocalIso()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()

      let stored = loadStored()
      let changed = false

      // Horários que já passaram hoje e ainda não têm notificação gerada
      const horasPendentes = NOTIFY_HOURS.filter((h) => {
        if (currentHour < h) return false // ainda não chegou
        const id = `${hojeIso}-${h}`
        return !stored.some((n) => n.id === id)
      })

      for (const h of horasPendentes) {
        try {
          const stats = await fetchTodayStats(allVehicles)
          const notif: ChecklistNotification = {
            id: `${hojeIso}-${h}`,
            timestamp: Date.now(),
            hojeIso,
            ...stats,
            lida: false,
          }
          stored = [notif, ...stored]
          changed = true
        } catch {
          // falha silenciosa
        }
      }

      // Também verifica se estamos exatamente na janela de um horário (HH:00–HH:05)
      // para gerar em tempo real quando o app já estava aberto
      if (NOTIFY_HOURS.includes(currentHour) && currentMinute <= 5) {
        const id = `${hojeIso}-${currentHour}`
        if (!stored.some((n) => n.id === id)) {
          try {
            const stats = await fetchTodayStats(allVehicles)
            const notif: ChecklistNotification = {
              id,
              timestamp: Date.now(),
              hojeIso,
              ...stats,
              lida: false,
            }
            stored = [notif, ...stored]
            changed = true
          } catch {
            // falha silenciosa
          }
        }
      }

      if (changed) {
        saveStored(stored)
        setNotifications(stored)
      }

      scheduleNext()
    }

    function scheduleNext() {
      // verifica de novo em 60 segundos
      timer = setTimeout(() => { void check() }, 60_000)
    }

    void check()
    return () => clearTimeout(timer)
  // allVehicles na dep array: se a frota carrega após o mount, recalcula o total corretamente
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allVehicles])

  return { notifications, unreadCount, markAllRead, markRead }
}
