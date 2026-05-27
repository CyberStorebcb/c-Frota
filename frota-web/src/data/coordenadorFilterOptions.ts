import { OFFICIAL_COORDENADORES } from './officialFilters.gen'

/** Opções fixas do filtro "Gerência" (valor normalizado em minúsculas, sem acento, para comparação). */
export type CoordenadorFilterSelectOption = { value: string; label: string }

function normCoord(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/** Compara nome da gerência no registro com o valor selecionado (ignora maiúsculas e acentos). */
export function matchesCoordenadorFilter(rowCoord: string, filterValue: string): boolean {
  if (filterValue === 'todos') return true
  return normCoord(rowCoord) === normCoord(filterValue)
}

function toCoordValue(label: string): string {
  return normCoord(label)
}

export const COORDENADOR_FILTER_SELECT_OPTIONS: CoordenadorFilterSelectOption[] = [
  { value: 'todos', label: 'Todos' },
  ...OFFICIAL_COORDENADORES.map((label) => ({
    value: toCoordValue(label),
    label,
  })),
]
