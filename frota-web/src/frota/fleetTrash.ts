import { FLEET_TRASH_REMOVED_AT, FLEET_TRASH_ROWS } from '../data/fleetTrash.gen'
import type { TotalVehicleSourceRow } from '../data/totalVehiclesFleet.gen'
import {
  getRestoredTrashCatalogRows,
  isCatalogTrashRestored,
} from '../services/catalogTrashService'
import { formatPlaca, normalizePlaca, type FleetVehicle } from './vehicleRegistry'

export { FLEET_TRASH_REMOVED_AT, FLEET_TRASH_ROWS }

export const FLEET_TRASH_PLACAS = new Set(
  FLEET_TRASH_ROWS.map((r) => normalizePlaca(r.placa)).filter(Boolean),
)

export function isFleetTrashPlaca(placa: string): boolean {
  const p = normalizePlaca(placa)
  if (!FLEET_TRASH_PLACAS.has(p)) return false
  return !isCatalogTrashRestored(p)
}

function trashRowToFleetVehicle(row: TotalVehicleSourceRow): FleetVehicle {
  const placa = normalizePlaca(row.placa) || row.placa.trim().toUpperCase()
  return {
    id: `trash-${placa}`,
    placa,
    modelo: (row.modelo || '—').trim().toUpperCase() || '—',
    tipo: (row.tipo || 'VEICULOS LEVES').trim().toUpperCase() as FleetVehicle['tipo'],
    prefixo: (row.prefixo || 'N/A').trim().toUpperCase() || 'N/A',
    responsavel: (row.responsavel || '—').trim().toUpperCase() || '—',
    supervisor: (row.responsavel || 'NÃO ATRIBUÍDO').trim().toUpperCase() || 'NÃO ATRIBUÍDO',
    coordenador: (row.gerencia || 'NÃO ATRIBUÍDO').trim().toUpperCase() || 'NÃO ATRIBUÍDO',
    base: (row.base || 'N/A').trim().toUpperCase() || 'N/A',
    status: 'INATIVO',
    emManutencao: false,
    ano: (row.ano || '').trim(),
    proprietario: (row.proprietario || '').trim().toUpperCase(),
    setor: (row.setor || '').trim().toUpperCase(),
    processo: (row.processo || '').trim().toUpperCase(),
    createdAt: FLEET_TRASH_REMOVED_AT,
    source: 'total',
  }
}

export type TrashedFleetVehicle = FleetVehicle & { removedAt: string }

export function getTrashedFleetVehicles(): TrashedFleetVehicle[] {
  return FLEET_TRASH_ROWS.filter((row) => !isCatalogTrashRestored(row.placa))
    .map((row) => ({
      ...trashRowToFleetVehicle(row),
      removedAt: FLEET_TRASH_REMOVED_AT,
    }))
    .sort((a, b) => a.placa.localeCompare(b.placa))
}

export { getRestoredTrashCatalogRows }

export function formatTrashPlaca(placa: string): string {
  const p = normalizePlaca(placa)
  if (!p) return placa
  if (p === 'MOT') return 'MOT*'
  return formatPlaca(p)
}
