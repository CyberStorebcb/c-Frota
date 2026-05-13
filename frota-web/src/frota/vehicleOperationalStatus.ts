import { TOTAL_VEHICLE_ROWS } from '../data/totalVehiclesFleet.gen'
import { FLEET_CATALOG_DESMOBILIZADO_PLACAS } from './fleetCatalogDesmobilizadoPlacas'

function normalizePlacaCatalogo(s: string): string {
  return s.trim().toUpperCase()
}

export const VEHICLE_OPERATIONAL_STATUS_LABELS = [
  'ATIVOS',
  'DESMOBILIZADO',
  'EM MOBILIZAÇÃO',
  'AGUARDANDO',
  'RESERVA',
  'TRANSPORTE',
  'AVARIADO',
] as const

export type VehicleOperationalStatus = (typeof VEHICLE_OPERATIONAL_STATUS_LABELS)[number]

const NOT_ACTIVE_OPERATIONAL_STATUS_SET = new Set<string>([
  'DESMOBILIZADO',
  'EM MOBILIZAÇÃO',
  'AGUARDANDO',
  'AVARIADO',
])

/** Prefixo normalizado para classificação operacional (planilha vazia → catálogo `N/A`). */
export function prefixoParaStatusOperacional(prefixo: string): string {
  const p = prefixo.trim().toUpperCase()
  if (!p || p === 'N/A') return ''
  return p
}

export function isVehicleOperacionalAtivo(prefixo: string): boolean {
  return !NOT_ACTIVE_OPERATIONAL_STATUS_SET.has(prefixoParaStatusOperacional(prefixo))
}

export function statusOperacionalCatalogo(placa: string, prefixoPlanilha: string): string {
  const p = normalizePlacaCatalogo(placa)
  if (p && FLEET_CATALOG_DESMOBILIZADO_PLACAS.has(p)) return 'DESMOBILIZADO'
  return prefixoParaStatusOperacional(prefixoPlanilha)
}

export function getVehicleOperationalStatusRows() {
  return TOTAL_VEHICLE_ROWS.map((row) => ({
    ...row,
    statusOperacional: statusOperacionalCatalogo(row.placa, row.prefixo),
  }))
}

export function getVehicleOperationalStatusSummary() {
  const rows = getVehicleOperationalStatusRows()
  return VEHICLE_OPERATIONAL_STATUS_LABELS.map((label) => {
    const vehicles =
      label === 'ATIVOS'
        ? rows.filter((row) => !NOT_ACTIVE_OPERATIONAL_STATUS_SET.has(row.statusOperacional))
        : rows.filter((row) => row.statusOperacional === label)

    return {
      label,
      count: vehicles.length,
      vehicles,
    }
  })
}
