import { OFFICIAL_PROCESSOS } from './officialFilters.gen'

/** Opções fixas do filtro "Processo" (valor em minúsculas para comparação). */
export type ProcessoFilterSelectOption = { value: string; label: string }

export const PROCESSO_FILTER_SELECT_OPTIONS: ProcessoFilterSelectOption[] = [
  { value: 'todos', label: 'Todos' },
  ...OFFICIAL_PROCESSOS.map((label) => ({
    value: label.toLowerCase(),
    label,
  })),
]

export function matchesProcessoFilter(rowProcesso: string, filterValue: string): boolean {
  if (filterValue === 'todos') return true
  return rowProcesso.trim().toLowerCase() === filterValue.trim().toLowerCase()
}
