import { describe, expect, it } from 'vitest'

import { classifyAgendamento, groupAgendaItems, sortAgendaItems, type AgendaScreenshotItem } from './generateAgendaScreenshot'

const baseItem = (overrides: Partial<AgendaScreenshotItem>): AgendaScreenshotItem => ({
  id: '1',
  placa: 'ABC1D23',
  prefixo: '0101',
  modelo: 'Strada',
  processo: '0101',
  base: 'BCB',
  responsavel: 'João',
  supervisor: 'Sup 1',
  coordenador: 'Ger 1',
  veiculoLabel: 'ABC1D23',
  defeito: 'Pneu careca',
  agendamentoData: '2026-05-20',
  justificativa: null,
  imperativo: false,
  ...overrides,
})

describe('classifyAgendamento', () => {
  it('classifica vencida, hoje e futura', () => {
    expect(classifyAgendamento('2026-05-19', '2026-05-20')).toBe('vencida')
    expect(classifyAgendamento('2026-05-20', '2026-05-20')).toBe('hoje')
    expect(classifyAgendamento('2026-05-21', '2026-05-20')).toBe('futura')
  })
})

describe('sortAgendaItems', () => {
  it('ordena por data e placa', () => {
    const sorted = sortAgendaItems([
      baseItem({ id: 'b', agendamentoData: '2026-05-21', placa: 'BBB2222' }),
      baseItem({ id: 'a', agendamentoData: '2026-05-20', placa: 'AAA1111' }),
    ])
    expect(sorted.map((i) => i.id)).toEqual(['a', 'b'])
  })
})

describe('groupAgendaItems', () => {
  it('agrupa e ordena por data', () => {
    const groups = groupAgendaItems([
      baseItem({ id: 'a', agendamentoData: '2026-05-22' }),
      baseItem({ id: 'b', agendamentoData: '2026-05-19' }),
      baseItem({ id: 'c', agendamentoData: '2026-05-20' }),
    ], '2026-05-20')

    expect(groups.vencida.map((i) => i.id)).toEqual(['b'])
    expect(groups.hoje.map((i) => i.id)).toEqual(['c'])
    expect(groups.futura.map((i) => i.id)).toEqual(['a'])
  })
})
