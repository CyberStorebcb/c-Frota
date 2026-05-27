import { OFFICIAL_SUPERVISORS } from './officialFilters.gen'

export type SupervisorFilterSelectOption = { value: string; label: string }

function normSup(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

export function matchesSupervisorFilter(rowSupervisor: string, filterValue: string): boolean {
  if (filterValue === 'todos') return true
  return normSup(rowSupervisor).includes(normSup(filterValue))
}

/** Lista oficial de supervisores (fonte: FILTROS.xlsx). */
export const AUTHORIZED_SUPERVISORS = [...OFFICIAL_SUPERVISORS]

const AUTHORIZED_SUPERVISOR_NORMS = new Set(AUTHORIZED_SUPERVISORS.map(normSup))

/** Variantes legadas no catálogo que mapeiam para um supervisor autorizado. */
const SUPERVISOR_LEGACY_ALIASES: Record<string, string> = {
  'antonio marcos salazar': 'antonio marcos salazar dos reis',
  'joadson carlos da silva ferreira': 'joadson carlos',
  'wallyson da silva almeida': 'wallyson da silva',
  'laercio corta lima': 'laercio costa lima',
}

/** Retorna true se o nome corresponde a um supervisor autorizado (inclui variantes legadas). */
export function isAuthorizedSupervisor(name: string): boolean {
  const n = normSup(name)
  if (!n) return false
  if (AUTHORIZED_SUPERVISOR_NORMS.has(n)) return true
  const alias = SUPERVISOR_LEGACY_ALIASES[n]
  return alias ? AUTHORIZED_SUPERVISOR_NORMS.has(alias) : false
}

function buildSupervisorOptions(): SupervisorFilterSelectOption[] {
  const opts: SupervisorFilterSelectOption[] = AUTHORIZED_SUPERVISORS.map((name) => ({
    value: name,
    label: name,
  }))

  opts.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  return [{ value: 'todos', label: 'Todos' }, ...opts]
}

export const SUPERVISOR_FILTER_SELECT_OPTIONS: SupervisorFilterSelectOption[] = buildSupervisorOptions()
