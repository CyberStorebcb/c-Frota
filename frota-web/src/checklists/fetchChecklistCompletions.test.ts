import { describe, expect, it } from 'vitest'

import { countUniqueCompletionsInPeriod } from './fetchChecklistCompletions'

describe('countUniqueCompletionsInPeriod', () => {
  it('soma checklists diários de todos os dias do período', () => {
    const completions = new Set([
      'AAA1111|2026-05-20',
      'BBB2222|2026-05-20',
      'AAA1111|2026-05-21',
    ])

    expect(
      countUniqueCompletionsInPeriod(completions, ['2026-05-20', '2026-05-21']),
    ).toBe(3)
  })

  it('ignora dias fora do período', () => {
    const completions = new Set([
      'AAA1111|2026-05-20',
      'AAA1111|2026-05-22',
    ])

    expect(countUniqueCompletionsInPeriod(completions, ['2026-05-20', '2026-05-21'])).toBe(1)
  })
})
