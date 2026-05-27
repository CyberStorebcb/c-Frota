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
  { value: 'afonso',      label: 'AFONSO' },
  { value: 'jackson',     label: 'JACKSON' },
  { value: 'jamerson',    label: 'JAMERSON' },
  { value: 'julio',       label: 'JÚLIO' },
  { value: 'leandro',     label: 'LEANDRO' },
  { value: 'marcos',      label: 'MARCOS' },
  { value: 'paulo',       label: 'PAULO' },
  { value: 'pryscilla',   label: 'PRYSCILLA' },
  { value: 'rafaela',     label: 'RAFAELA' },
  { value: 'ricardo',     label: 'RICARDO' },
  { value: 'ruan valmir', label: 'RUAN VALMIR' },
  { value: 'waldir',      label: 'WALDIR' },
]
