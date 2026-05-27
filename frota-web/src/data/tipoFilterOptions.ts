/** Opções do filtro "Tipo de Veículo" — alinhado com VEHICLE_TYPE_IDS. */
export type TipoFilterSelectOption = { value: string; label: string }

function normTipo(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function matchesTipoFilter(rowTipo: string, filterValue: string): boolean {
  if (filterValue === 'todos') return true
  return normTipo(rowTipo) === normTipo(filterValue)
}

export const TIPO_FILTER_SELECT_OPTIONS: TipoFilterSelectOption[] = [
  { value: 'todos',         label: 'Todos' },
  { value: 'caminhao',      label: 'CAMINHÃO' },
  { value: 'carreta',       label: 'CARRETA' },
  { value: 'moto',          label: 'MOTO' },
  { value: 'motopoda',      label: 'MOTOPODA' },
  { value: 'munck',         label: 'MUNCK' },
  { value: 'oficina',       label: 'OFICINA' },
  { value: 'picape 4x4',    label: 'PICAPE 4X4' },
  { value: 'picape leve',   label: 'PICAPE LEVE' },
  { value: 'sky',           label: 'SKY' },
  { value: 'sky cd',        label: 'SKY CD' },
  { value: 'sky cs',        label: 'SKY CS' },
  { value: 'veiculos leves', label: 'VEÍCULOS LEVES' },
]
