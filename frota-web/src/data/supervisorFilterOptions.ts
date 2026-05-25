import { TOTAL_VEHICLE_ROWS } from './totalVehiclesFleet.gen'

export type SupervisorFilterSelectOption = { value: string; label: string }

function normSup(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

export function matchesSupervisorFilter(rowSupervisor: string, filterValue: string): boolean {
  if (filterValue === 'todos') return true
  return normSup(rowSupervisor).includes(normSup(filterValue))
}

// Gera lista de supervisores únicos a partir da coluna RESPONSÁVEL do catálogo
function buildSupervisorOptions(): SupervisorFilterSelectOption[] {
  const skip = new Set(['', 'FROTA', 'AVARIADO', 'DESMOBILIZADA', 'RESERVA', 'ITALO', 'PAULO'])
  const seen = new Set<string>()
  const opts: SupervisorFilterSelectOption[] = []

  for (const row of TOTAL_VEHICLE_ROWS) {
    const v = row.responsavel?.trim().toUpperCase()
    if (!v || skip.has(v)) continue
    const key = normSup(v)
    if (seen.has(key)) continue
    seen.add(key)
    opts.push({ value: v, label: v })
  }

  opts.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  return [{ value: 'todos', label: 'Todos' }, ...opts]
}

export const SUPERVISOR_FILTER_SELECT_OPTIONS: SupervisorFilterSelectOption[] = buildSupervisorOptions()
