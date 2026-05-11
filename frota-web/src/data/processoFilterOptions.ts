/** Opções fixas do filtro "Processo" (valor em minúsculas para comparação). */
export type ProcessoFilterSelectOption = { value: string; label: string }

export const PROCESSO_FILTER_SELECT_OPTIONS: ProcessoFilterSelectOption[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'desmobilizado', label: 'DESMOBILIZADO' },
  { value: 'adm', label: 'ADM' },
  { value: 'frota', label: 'FROTA' },
  { value: 'gere', label: 'GERE' },
  { value: 'goman', label: 'GOMAN' },
  { value: 'gstc', label: 'GSTC' },
  { value: 'planejamento', label: 'PLANEJAMENTO' },
  { value: 'reserva', label: 'RESERVA' },
  { value: 'sesmt', label: 'SESMT' },
  { value: 'spot', label: 'SPOT' },
  { value: 'transporte', label: 'TRANSPORTE' },
  /** Apontamentos gerados a partir de NC em checklist usam este rótulo. */
  { value: 'checklist', label: 'Checklist' },
]

export function matchesProcessoFilter(rowProcesso: string, filterValue: string): boolean {
  if (filterValue === 'todos') return true
  return rowProcesso.trim().toLowerCase() === filterValue.trim().toLowerCase()
}
