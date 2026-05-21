import { describe, expect, it } from 'vitest'

import {
  aggregateChecklistCompletions,
  buildActiveFleetMap,
  type ChecklistFleetVehicle,
} from './checklistFleetScope'
import type { FleetVehicle } from '../frota/vehicleRegistry'

function vehicle(partial: Partial<FleetVehicle> & Pick<FleetVehicle, 'placa'>): FleetVehicle {
  return {
    id: partial.placa,
    placa: partial.placa,
    modelo: 'Modelo',
    tipo: 'Utilitário',
    prefixo: partial.prefixo ?? '0101',
    responsavel: partial.responsavel ?? 'João',
    supervisor: partial.supervisor ?? 'Sup 1',
    coordenador: partial.coordenador ?? 'Ger 1',
    base: partial.base ?? 'BCB',
    status: partial.status ?? 'ATIVO',
    emManutencao: false,
    ano: '2020',
    createdAt: '2026-01-01',
    ...partial,
  }
}

describe('aggregateChecklistCompletions', () => {
  const fleetMap = new Map<string, ChecklistFleetVehicle>([
    ['ABC1D23', { placa: 'ABC1D23', base: 'BCB', supervisor: 'Sup 1', coordenador: 'Ger 1', responsavel: 'João' }],
    ['DEF4G56', { placa: 'DEF4G56', base: 'BDC', supervisor: 'Sup 2', coordenador: 'Ger 2', responsavel: 'Maria' }],
  ])

  it('deduplica múltiplos checklists da mesma placa no mesmo dia', () => {
    const { completions, porDia } = aggregateChecklistCompletions(
      [
        { data_inspecao: '2026-05-20', nc_count: 0, dados_veiculo: { placa: 'ABC1D23' } },
        { data_inspecao: '2026-05-20', nc_count: 0, dados_veiculo: { placa: 'ABC1D23' } },
      ],
      fleetMap,
      { base: 'todos', coordenador: 'todos', supervisor: 'todos' },
    )

    expect(completions.size).toBe(1)
    expect(porDia).toEqual([{ data: '2026-05-20', realizados: 1, comNc: 0 }])
  })

  it('respeita filtro de base como no Detalhar', () => {
    const { completions, porDia } = aggregateChecklistCompletions(
      [
        { data_inspecao: '2026-05-20', nc_count: 0, dados_veiculo: { placa: 'ABC1D23' } },
        { data_inspecao: '2026-05-20', nc_count: 0, dados_veiculo: { placa: 'DEF4G56' } },
      ],
      fleetMap,
      { base: 'bcb', coordenador: 'todos', supervisor: 'todos' },
    )

    expect(completions.size).toBe(1)
    expect(porDia[0]?.realizados).toBe(1)
  })
})

describe('buildActiveFleetMap', () => {
  it('inclui veículos ATIVOS e TRANSPORTE', () => {
    const map = buildActiveFleetMap([
      vehicle({ placa: 'AAA1111', prefixo: '0101' }),
      vehicle({ placa: 'BBB2222', prefixo: 'TRPT', status: 'ATIVO' }),
      vehicle({ placa: 'CCC3333', prefixo: '0101', status: 'INATIVO' }),
    ])

    expect(map.has('AAA1111')).toBe(true)
    expect(map.has('BBB2222')).toBe(true)
    expect(map.has('CCC3333')).toBe(false)
  })
})
