import { describe, expect, it } from 'vitest'
import { spentIn } from './shopSpent'

describe('reading what was spent in the shop', () => {
  it('takes `spent` from a ledger the shop wrote', () => {
    expect(spentIn({ version: 2, bought: {}, spent: 90 })).toBe(90)
  })

  it('reads nothing spent where there is no sound ledger', () => {
    for (const raw of [null, 'x', 3, {}, { version: 1, coins: 13 }, { version: 2, spent: '90' }]) {
      expect(spentIn(raw)).toBe(0)
    }
  })

  it('takes a negative amount as it stands — more coins than gold on the day', () => {
    expect(spentIn({ version: 2, spent: -17 })).toBe(-17)
  })

  it('never reads a fraction of a coin', () => {
    expect(spentIn({ version: 2, spent: 39.6 })).toBe(40)
  })
})
