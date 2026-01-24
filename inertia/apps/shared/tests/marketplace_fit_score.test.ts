import { describe, expect, it } from 'vitest'

import { normalizeMarketplaceFitScore } from '@/apps/shared/marketplace/fit_score'

describe('normalizeMarketplaceFitScore', () => {
  it('bounds marketplace fit scores to the 0-100 presentation range', () => {
    expect(normalizeMarketplaceFitScore(177)).toBe(100)
    expect(normalizeMarketplaceFitScore(100)).toBe(100)
    expect(normalizeMarketplaceFitScore(67.4)).toBe(67)
    expect(normalizeMarketplaceFitScore(-12)).toBe(0)
  })

  it('normalizes serialized scores and ignores absent or non-numeric values', () => {
    expect(normalizeMarketplaceFitScore('88.6')).toBe(89)
    expect(normalizeMarketplaceFitScore(null)).toBeNull()
    expect(normalizeMarketplaceFitScore(undefined)).toBeNull()
    expect(normalizeMarketplaceFitScore('')).toBeNull()
    expect(normalizeMarketplaceFitScore('not-a-score')).toBeNull()
  })
})
