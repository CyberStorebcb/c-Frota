export type ChecklistTop10GroupBy = 'supervisor' | 'base' | 'gerencia'

export type ChecklistTop10Row = {
  placa: string
  base: string
  supervisor: string
  coordenador: string
  responsavel: string
}

export type ChecklistAdherenceEntry = {
  label: string
  pct: number
  realizados: number
  esperados: number
  veiculos: number
}

export const CHECKLIST_TOP10_GROUP_OPTIONS: { value: ChecklistTop10GroupBy; label: string }[] = [
  { value: 'base', label: 'Base' },
  { value: 'gerencia', label: 'Gerente' },
  { value: 'supervisor', label: 'Supervisor' },
]

function groupLabel(row: ChecklistTop10Row, groupBy: ChecklistTop10GroupBy): string {
  switch (groupBy) {
    case 'supervisor':
      return row.supervisor.trim() || 'Não informado'
    case 'base':
      return row.base.trim() || 'Sem base'
    case 'gerencia':
      return row.coordenador.trim() || 'Não informado'
  }
}

// ─── Peso de domingo ──────────────────────────────────────────────────────────
// Aos domingos a meta é reduzida em 80 % — apenas 20 % da frota é esperada.
export const DOMINGO_FATOR = 0.2

export function isDomingo(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return false
  return new Date(y, m - 1, d).getDay() === 0 // 0 = domingo
}

/** Retorna o peso do dia: 0.2 para domingo, 1.0 para os demais. */
export function pesoDia(iso: string): number {
  return isDomingo(iso) ? DOMINGO_FATOR : 1.0
}

/** Soma os pesos de um array de dias ISO (domingos valem 0.2). */
export function pesosDias(days: string[]): number {
  return days.reduce((s, d) => s + pesoDia(d), 0)
}
// ─────────────────────────────────────────────────────────────────────────────

export function listDaysInPeriod(ini: string, fim: string): string[] {
  const [yi, mi, di] = ini.split('-').map(Number)
  const [yf, mf, df] = fim.split('-').map(Number)
  if (!yi || !mi || !di || !yf || !mf || !df) return []

  const days: string[] = []
  const cursor = new Date(yi, mi - 1, di)
  const end = new Date(yf, mf - 1, df)

  while (cursor.getTime() <= end.getTime()) {
    days.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`,
    )
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

export function countDaysInPeriod(ini: string, fim: string): number {
  return listDaysInPeriod(ini, fim).length
}

export type FleetAdherenceStats = {
  realizados: number
  esperados: number
  pct: number
}

function countPlacaCompletions(placa: string, days: string[], completions: Set<string>): number {
  let total = 0
  for (const day of days) {
    if (completions.has(`${placa}|${day}`)) total += 1
  }
  return total
}

export function filterCompletionsToDays(completions: Set<string>, days: string[]): Set<string> {
  const daysSet = new Set(days)
  const filtered = new Set<string>()
  for (const key of completions) {
    const pipeIdx = key.lastIndexOf('|')
    if (pipeIdx === -1) continue
    const day = key.slice(pipeIdx + 1)
    if (daysSet.has(day)) filtered.add(key)
  }
  return filtered
}

/** Aderência diária da frota: checklists concluídos (placa × dia) ÷ (veículos × dias do período). */
export function computeFleetAdherence(
  fleetPlacas: Iterable<string>,
  completions: Set<string>,
  days: string[],
): FleetAdherenceStats {
  const placas = [...fleetPlacas]
  const esperados = placas.length * pesosDias(days)
  if (esperados === 0) {
    return { realizados: 0, esperados: 0, pct: 0 }
  }

  let realizados = 0
  for (const placa of placas) {
    realizados += countPlacaCompletions(placa, days, completions)
  }

  return {
    realizados,
    esperados,
    pct: Math.round((realizados / esperados) * 100),
  }
}

type GroupStats = {
  veiculos: number
  realizados: number
  esperados: number
}

export function buildChecklistAdherenceRanking(
  frota: ChecklistTop10Row[],
  completions: Set<string>,
  days: string[],
  groupBy: ChecklistTop10GroupBy,
  sort: 'best' | 'worst',
  limit = 10,
  minVeiculos = 1,
): ChecklistAdherenceEntry[] {
  const groups = new Map<string, GroupStats>()

  for (const vehicle of frota) {
    const label = groupLabel(vehicle, groupBy)
    const stats = groups.get(label) ?? { veiculos: 0, realizados: 0, esperados: 0 }
    stats.veiculos += 1
    stats.esperados += pesosDias(days)
    stats.realizados += countPlacaCompletions(vehicle.placa, days, completions)
    groups.set(label, stats)
  }

  const entries = [...groups.entries()]
    .filter(([, stats]) => stats.veiculos >= minVeiculos)
    .map(([label, stats]) => ({
      label,
      veiculos: stats.veiculos,
      realizados: stats.realizados,
      esperados: stats.esperados,
      pct: stats.esperados > 0 ? Math.round((stats.realizados / stats.esperados) * 100) : 0,
    }))

  entries.sort((a, b) => {
    if (sort === 'best') {
      if (b.pct !== a.pct) return b.pct - a.pct
    } else if (a.pct !== b.pct) {
      return a.pct - b.pct
    }
    return a.label.localeCompare(b.label, 'pt-BR')
  })

  return entries.slice(0, limit)
}
