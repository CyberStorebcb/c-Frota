import { OFFICIAL_PREFIXOS } from './officialFilters.gen'

export type PrefixoFilterSelectOption = { value: string; label: string }

function normPrefixo(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, ' ')
}

export function matchesPrefixoFilter(rowPrefixo: string, filterValue: string): boolean {
  if (filterValue === 'todos') return true
  return normPrefixo(rowPrefixo) === normPrefixo(filterValue)
}

export const PREFIXO_FILTER_SELECT_OPTIONS: PrefixoFilterSelectOption[] = [
  { value: 'todos', label: 'Todos' },
  ...OFFICIAL_PREFIXOS.map((label) => ({
    value: label,
    label,
  })),
]
