/** Opções fixas do filtro "Coordenador" (valor normalizado em minúsculas, sem acento, para comparação). */
export type CoordenadorFilterSelectOption = { value: string; label: string }

function normCoord(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/** Compara nome do coordenador no registro com o valor selecionado (ignora maiúsculas e acentos). */
export function matchesCoordenadorFilter(rowCoord: string, filterValue: string): boolean {
  if (filterValue === 'todos') return true
  return normCoord(rowCoord) === normCoord(filterValue)
}

export const COORDENADOR_FILTER_SELECT_OPTIONS: CoordenadorFilterSelectOption[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'desmobilizado', label: 'DESMOBILIZADO' },
  { value: 'frota', label: 'FROTA' },
  { value: 'jackson', label: 'JACKSON' },
  { value: 'jamerson', label: 'JAMERSON' },
  { value: 'joao felipe', label: 'JOÃO FELIPE' },
  { value: 'julio', label: 'JÚLIO' },
  { value: 'ana', label: 'Ana' },
  { value: 'bruno', label: 'Bruno' },
  { value: 'carlos', label: 'Carlos' },
]
