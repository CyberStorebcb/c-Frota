import { TOTAL_VEHICLE_ROWS } from './totalVehiclesFleet.gen'

export type ResponsavelFilterSelectOption = { value: string; label: string }

function normResp(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

const SKIP_RESPONSAVEL = new Set([
  '',
  'FROTA',
  'AVARIADO',
  'DESMOBILIZADA',
  'RESERVA',
  'NÃO ATRIBUÍDO',
  'NAO ATRIBUIDO',
  'N/A',
])

export function matchesResponsavelFilter(rowResponsavel: string, filterValue: string): boolean {
  if (filterValue === 'todos') return true
  return normResp(rowResponsavel) === normResp(filterValue)
}

function buildResponsavelOptions(): ResponsavelFilterSelectOption[] {
  const seen = new Set<string>()
  const opts: ResponsavelFilterSelectOption[] = []

  for (const row of TOTAL_VEHICLE_ROWS) {
    const v = row.responsavel?.trim().toUpperCase()
    if (!v || SKIP_RESPONSAVEL.has(v)) continue
    const key = normResp(v)
    if (seen.has(key)) continue
    seen.add(key)
    opts.push({ value: v, label: v })
  }

  opts.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  return [{ value: 'todos', label: 'Todos' }, ...opts]
}

export const RESPONSAVEL_FILTER_SELECT_OPTIONS: ResponsavelFilterSelectOption[] = buildResponsavelOptions()
