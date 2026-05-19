/** Opções fixas do filtro "Gerência" (valor normalizado em minúsculas, sem acento, para comparação). */
export type CoordenadorFilterSelectOption = { value: string; label: string }

function normCoord(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/** Compara nome da gerência no registro com o valor selecionado (ignora maiúsculas e acentos). */
export function matchesCoordenadorFilter(rowCoord: string, filterValue: string): boolean {
  if (filterValue === 'todos') return true
  return normCoord(rowCoord) === normCoord(filterValue)
}

export const COORDENADOR_FILTER_SELECT_OPTIONS: CoordenadorFilterSelectOption[] = [
  { value: 'todos',       label: 'Todos' },
  { value: 'frota',       label: 'FROTA' },
  { value: 'jamerson',    label: 'JAMERSON' },
  { value: 'julio',       label: 'JÚLIO' },
  { value: 'rafaela',     label: 'RAFAELA' },
  { value: 'ricardo',     label: 'RICARDO' },
  { value: 'paulo',       label: 'PAULO' },
  { value: 'leandro',     label: 'LEANDRO' },
  { value: 'jackson',     label: 'JACKSON' },
  { value: 'marcos',      label: 'MARCOS' },
  { value: 'valvick',     label: 'VALVICK' },
  { value: 'ruan valmir', label: 'RUAN VALMIR' },
  { value: 'pryscilla',   label: 'PRYSCILLA' },
  { value: 'waldir',      label: 'WALDIR' },
]
