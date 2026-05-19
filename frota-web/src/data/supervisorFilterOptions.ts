/** Opções fixas do filtro "Supervisor" (valor normalizado para comparação). */
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

export const SUPERVISOR_FILTER_SELECT_OPTIONS: SupervisorFilterSelectOption[] = [
  { value: 'todos',               label: 'Todos' },
  { value: 'Antonio Reis',        label: 'ANTONIO REIS' },
  { value: 'Antonio Alencar',     label: 'ANTONIO ALENCAR' },
  { value: 'Arlison Lima',        label: 'ARLISON LIMA' },
  { value: 'Cristophe Melo',      label: 'CRISTOPHE MELO' },
  { value: 'Deilton Ribeiro',     label: 'DEILTON RIBEIRO' },
  { value: 'Edivan Carvalho',     label: 'EDIVAN CARVALHO' },
  { value: 'Everaldo Filho',      label: 'EVERALDO FILHO' },
  { value: 'Guilherme Nogueira',  label: 'GUILHERME NOGUEIRA' },
  { value: 'Joao Junior',         label: 'JOAO JUNIOR' },
  { value: 'Josiel Santos',       label: 'JOSIEL SANTOS' },
  { value: 'Leonardo Anchieta',   label: 'LEONARDO ANCHIETA' },
  { value: 'Luis Souza',          label: 'LUIS SOUZA' },
  { value: 'Luis Alves',          label: 'LUIS ALVES' },
  { value: 'Messias Santos',      label: 'MESSIAS SANTOS' },
  { value: 'Mikeias Pinheiro',    label: 'MIKEIAS PINHEIRO' },
  { value: 'Pablo Loura',         label: 'PABLO LOURA' },
  { value: 'Raimundo Silva',      label: 'RAIMUNDO SILVA' },
  { value: 'Raimundo Nascimento', label: 'RAIMUNDO NASCIMENTO' },
  { value: 'Werbeth Carvalho',    label: 'WERBETH CARVALHO' },
]
