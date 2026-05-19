/** Opções fixas do filtro "Processo" (valor em minúsculas para comparação). */
export type ProcessoFilterSelectOption = { value: string; label: string }

export const PROCESSO_FILTER_SELECT_OPTIONS: ProcessoFilterSelectOption[] = [
  { value: 'todos',       label: 'Todos' },
  { value: 'gstc',        label: 'GSTC' },
  { value: 'gere',        label: 'GERE' },
  { value: 'goman',       label: 'GOMAN' },
  { value: 'sesmt',       label: 'SESMT' },
  { value: 'transporte',  label: 'TRANSPORTE' },
  { value: 'spot',        label: 'SPOT' },
  { value: 'adm',         label: 'ADM' },
  { value: 'frota',       label: 'FROTA' },
]

export function matchesProcessoFilter(rowProcesso: string, filterValue: string): boolean {
  if (filterValue === 'todos') return true
  return rowProcesso.trim().toLowerCase() === filterValue.trim().toLowerCase()
}
