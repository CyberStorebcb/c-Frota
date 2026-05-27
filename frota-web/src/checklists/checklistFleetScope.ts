import { matchesBaseFilter } from '../data/baseFilterOptions'
import { matchesCoordenadorFilter } from '../data/coordenadorFilterOptions'
import { matchesPrefixoFilter } from '../data/prefixoFilterOptions'
import { matchesResponsavelFilter } from '../data/responsavelFilterOptions'
import { matchesSupervisorFilter } from '../data/supervisorFilterOptions'
import { matchesTipoFilter } from '../data/tipoFilterOptions'
import {
  getVehicleOperationalStatusRowsWithLocals,
  getVehicleOperationalStatusSummary,
} from '../frota/vehicleOperationalStatus'
import type { FleetVehicle } from '../frota/vehicleRegistry'

export function normalizePlacaChecklist(s: string): string {
  return s.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export type ChecklistFleetVehicle = {
  placa: string
  base: string
  supervisor: string
  coordenador: string
  responsavel: string
  tipo: string
  prefixo: string
}

export type ChecklistFleetFilters = {
  base: string
  coordenador: string
  supervisor: string
  responsavel?: string
  tipo?: string
  prefixo?: string
}


export function passesChecklistFleetFilters(
  v: ChecklistFleetVehicle,
  filters: ChecklistFleetFilters,
): boolean {
  if (filters.base !== 'todos' && !matchesBaseFilter(v.base, filters.base)) return false
  if (filters.supervisor !== 'todos' && !matchesSupervisorFilter(v.supervisor, filters.supervisor)) return false
  if (filters.coordenador !== 'todos' && !matchesCoordenadorFilter(v.coordenador, filters.coordenador)) return false
  if (filters.responsavel && filters.responsavel !== 'todos') {
    if (!matchesResponsavelFilter(v.responsavel, filters.responsavel)) return false
  }
  if (filters.tipo && filters.tipo !== 'todos') {
    if (!matchesTipoFilter(v.tipo, filters.tipo)) return false
  }
  if (filters.prefixo && filters.prefixo !== 'todos' && filters.prefixo.trim()) {
    if (!matchesPrefixoFilter(v.prefixo, filters.prefixo)) return false
  }
  return true
}

/** Frota operacional ativa (ATIVOS + TRANSPORTE), alinhada ao Detalhar checklists. */
export function buildActiveFleetMap(vehicles: FleetVehicle[]): Map<string, ChecklistFleetVehicle> {
  const opRows = getVehicleOperationalStatusRowsWithLocals(vehicles)
  const resumo = getVehicleOperationalStatusSummary(opRows)
  const ativasVehicles = [
    ...(resumo.find((s) => s.label === 'ATIVOS')?.vehicles ?? []),
    ...(resumo.find((s) => s.label === 'TRANSPORTE')?.vehicles ?? []),
  ]
  const ativasSet = new Set(ativasVehicles.map((r) => normalizePlacaChecklist(r.placa)))
  const map = new Map<string, ChecklistFleetVehicle>()

  for (const v of vehicles) {
    const placa = normalizePlacaChecklist(v.placa)
    if (!placa || !ativasSet.has(placa)) continue
    map.set(placa, {
      placa,
      base: v.base ?? '',
      supervisor: v.supervisor ?? '',
      coordenador: v.coordenador ?? '',
      responsavel: v.responsavel ?? '',
      tipo: v.tipo ?? '',
      prefixo: v.prefixo ?? '',
    })
  }

  return map
}

export function filterActiveFleet(
  fleetMap: Map<string, ChecklistFleetVehicle>,
  filters: ChecklistFleetFilters,
): ChecklistFleetVehicle[] {
  return [...fleetMap.values()].filter((v) => passesChecklistFleetFilters(v, filters))
}

export type ChecklistDayStats = { data: string; realizados: number; comNc: number; naoRealizados: number }

type ChecklistRowInput = {
  data_inspecao: unknown
  nc_count: unknown
  dados_veiculo: unknown
}

/** Agrega checklists concluídos: 1 contagem por placa × dia (mesma regra do Detalhar).
 *  Se `operacionalPlacas` for fornecido, só entram checklists de veículos operacionais no escopo;
 *  `naoRealizados` = operacionais ativos que não fizeram checklist no dia. */
export function aggregateChecklistCompletions(
  rows: ChecklistRowInput[],
  fleetMap: Map<string, ChecklistFleetVehicle>,
  filters: ChecklistFleetFilters,
  operacionalPlacas?: Set<string>,
): { completions: Set<string>; porDia: ChecklistDayStats[] } {
  const scopedPlacas = new Set(filterActiveFleet(fleetMap, filters).map((v) => v.placa))
  const completions = new Set<string>()
  const comNcByKey = new Map<string, boolean>()

  // Placas operacionais dentro do escopo filtrado
  const opPlacas = operacionalPlacas
    ? new Set([...scopedPlacas].filter((p) => operacionalPlacas.has(p)))
    : null
  const totalOperacionais = opPlacas ? opPlacas.size : 0

  for (const row of rows) {
    const dv = row.dados_veiculo && typeof row.dados_veiculo === 'object'
      ? (row.dados_veiculo as Record<string, unknown>)
      : {}
    const placa = normalizePlacaChecklist(String(dv.placa ?? ''))
    if (!placa || !fleetMap.has(placa) || !scopedPlacas.has(placa)) continue
    if (opPlacas && !opPlacas.has(placa)) continue

    const dia = String(row.data_inspecao ?? '').slice(0, 10)
    if (!dia) continue

    const key = `${placa}|${dia}`
    completions.add(key)
    if ((row.nc_count as number) > 0) comNcByKey.set(key, true)
    else if (!comNcByKey.has(key)) comNcByKey.set(key, false)
  }

  const dayMap = new Map<string, { realizados: number; comNc: number }>()
  for (const key of completions) {
    const pipeIdx = key.lastIndexOf('|')
    const placa = key.slice(0, pipeIdx)
    const day = key.slice(pipeIdx + 1)
    if (!scopedPlacas.has(placa)) continue

    const prev = dayMap.get(day) ?? { realizados: 0, comNc: 0 }
    dayMap.set(day, {
      realizados: prev.realizados + 1,
      comNc: prev.comNc + (comNcByKey.get(key) ? 1 : 0),
    })
  }

  return {
    completions,
    porDia: Array.from(dayMap.entries()).map(([data, stats]) => {
      // naoRealizados = operacionais ativos - total de checklists do dia (mesma logica da aderencia)
      // Total bruto de checklists no numerador, operacionais no denominador
      const naoRealizados = opPlacas ? Math.max(0, totalOperacionais - stats.realizados) : 0
      return { data, ...stats, naoRealizados }
    }),
  }
}
