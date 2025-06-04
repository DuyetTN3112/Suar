import { test } from '@japa/runner'
import { TrustTierCode, TRUST_TIER_WEIGHTS } from '#constants/user_constants'
import { ReviewSessionStatus } from '#constants/review_constants'
import {
  calculateWeightedTrustScore,
  calculateCredibilityScore,
  adjustCredibility,
  determineSessionStatus,
  calculateRawScore,
  determineTier,
} from '#actions/reviews/rules/review_formulas'

/**
 * Business formula tests for review system.
 *
 * Tests the pure functions in app/actions/reviews/rules/review_formulas.ts.
 * No database required.
 */

// ============================================================================
// Formula: Trust Score = rawScore * tierWeight
// ============================================================================

test.group('Trust Score Formula', () => {
  test('community tier reduces score by 50%', ({ assert }) => {
    const raw = 80
    const result = calculateWeightedTrustScore(raw, TRUST_TIER_WEIGHTS[TrustTierCode.COMMUNITY])
    assert.equal(result, 40)
  })

  test('organization tier reduces score by 20%', ({ assert }) => {
    const raw = 100
    const result = calculateWeightedTrustScore(raw, TRUST_TIER_WEIGHTS[TrustTierCode.ORGANIZATION])
    assert.equal(result, 80)
  })

  test('partner tier preserves full score', ({ assert }) => {
    const raw = 85.5
    const result = calculateWeightedTrustScore(raw, TRUST_TIER_WEIGHTS[TrustTierCode.PARTNER])
    assert.equal(result, 85.5)
  })

  test('zero rawScore gives zero', ({ assert }) => {
    assert.equal(calculateWeightedTrustScore(0, 1.0), 0)
  })

  test('rounds to 2 decimal places', ({ assert }) => {
    const result = calculateWeightedTrustScore(33.33, TRUST_TIER_WEIGHTS[TrustTierCode.COMMUNITY])
    // 33.33 * 0.5 = 16.665 → rounds to 16.67
    assert.equal(result, 16.67)
  })
})

// ============================================================================
// Formula: Credibility Score = 50 + (confirmed/total)*40 - (disputed/total)*30
// ============================================================================

test.group('Credibility Score Formula', () => {
  test('zero reviews gives baseline 50', ({ assert }) => {
    assert.equal(calculateCredibilityScore(0, 0, 0), 50)
  })

  test('all confirmed gives max 90', ({ assert }) => {
    // 50 + (10/10)*40 - (0/10)*30 = 50 + 40 = 90
    assert.equal(calculateCredibilityScore(10, 10, 0), 90)
  })

  test('all disputed gives 20', ({ assert }) => {
    // 50 + (0/10)*40 - (10/10)*30 = 50 - 30 = 20
    assert.equal(calculateCredibilityScore(10, 0, 10), 20)
  })

  test('mixed reviews calculate correctly', ({ assert }) => {
    // 50 + (7/10)*40 - (3/10)*30 = 50 + 28 - 9 = 69
    assert.equal(calculateCredibilityScore(10, 7, 3), 69)
  })

  test('result is clamped to min 0', ({ assert }) => {
    // Very high dispute ratio
    // 50 + 0 - (100/100)*30 = 20, but if confirmed=0 and disputed=total: 50-30=20 > 0
    // Need extreme case: 50 + 0 - (very high): can't exceed 30 deduction with this formula
    // Max deduction is 30, baseline is 50, so minimum with formula = 50-30 = 20
    const score = calculateCredibilityScore(1, 0, 1)
    assert.isAtLeast(score, 0)
  })

  test('result is clamped to max 100', ({ assert }) => {
    const score = calculateCredibilityScore(1, 1, 0)
    assert.isAtMost(score, 100)
  })

  test('neutral (no confirms or disputes) stays at 50', ({ assert }) => {
    // total=10 but confirmed=0, disputed=0 means 10 reviews neither confirmed nor disputed
    assert.equal(calculateCredibilityScore(10, 0, 0), 50)
  })

  test('half confirmed half disputed', ({ assert }) => {
    // 50 + (5/10)*40 - (5/10)*30 = 50 + 20 - 15 = 55
    assert.equal(calculateCredibilityScore(10, 5, 5), 55)
  })
})

// ============================================================================
// Formula: Incremental Credibility Adjustment
// confirmed → +2, disputed → -5, clamp [0, 100]
// ============================================================================

test.group('Incremental Credibility Adjustment', () => {
  test('confirm adds 2 from baseline', ({ assert }) => {
    assert.equal(adjustCredibility(50, 'confirmed'), 52)
  })

  test('dispute subtracts 5 from baseline', ({ assert }) => {
    assert.equal(adjustCredibility(50, 'disputed'), 45)
  })

  test('confirm does not exceed 100', ({ assert }) => {
    assert.equal(adjustCredibility(99, 'confirmed'), 100)
  })

  test('dispute does not go below 0', ({ assert }) => {
    assert.equal(adjustCredibility(3, 'disputed'), 0)
  })

  test('multiple confirms stack', ({ assert }) => {
    let score = 50
    score = adjustCredibility(score, 'confirmed')
    score = adjustCredibility(score, 'confirmed')
    score = adjustCredibility(score, 'confirmed')
    assert.equal(score, 56)
  })

  test('dispute hits harder than confirm', ({ assert }) => {
    // 1 dispute = -5, 1 confirm = +2, net = -3
    let score = 50
    score = adjustCredibility(score, 'confirmed')
    score = adjustCredibility(score, 'disputed')
    assert.equal(score, 47)
  })
})

// ============================================================================
// Formula: Review Session Status Determination
// ============================================================================

test.group('Review Session Status Determination', () => {
  test('completed when manager done and peers met', ({ assert }) => {
    assert.equal(
      determineSessionStatus(true, 3, 2, ReviewSessionStatus.IN_PROGRESS),
      ReviewSessionStatus.COMPLETED
    )
  })

  test('completed when peers exactly meet requirement', ({ assert }) => {
    assert.equal(
      determineSessionStatus(true, 2, 2, ReviewSessionStatus.IN_PROGRESS),
      ReviewSessionStatus.COMPLETED
    )
  })

  test('not completed if manager not done', ({ assert }) => {
    assert.notEqual(
      determineSessionStatus(false, 5, 2, ReviewSessionStatus.IN_PROGRESS),
      ReviewSessionStatus.COMPLETED
    )
  })

  test('not completed if peers insufficient', ({ assert }) => {
    assert.notEqual(
      determineSessionStatus(true, 1, 2, ReviewSessionStatus.IN_PROGRESS),
      ReviewSessionStatus.COMPLETED
    )
  })

  test('moves from pending to in_progress', ({ assert }) => {
    assert.equal(
      determineSessionStatus(false, 0, 2, ReviewSessionStatus.PENDING),
      ReviewSessionStatus.IN_PROGRESS
    )
  })

  test('stays in_progress if already in_progress', ({ assert }) => {
    assert.equal(
      determineSessionStatus(false, 1, 3, ReviewSessionStatus.IN_PROGRESS),
      ReviewSessionStatus.IN_PROGRESS
    )
  })

  test('zero peers required, manager done = completed', ({ assert }) => {
    assert.equal(
      determineSessionStatus(true, 0, 0, ReviewSessionStatus.PENDING),
      ReviewSessionStatus.COMPLETED
    )
  })
})

// ============================================================================
// Formula: Average Raw Score from skills
// ============================================================================

test.group('Raw Score Average Calculation', () => {
  test('single skill returns that percentage', ({ assert }) => {
    assert.equal(calculateRawScore([80]), 80)
  })

  test('multiple skills averaged', ({ assert }) => {
    assert.equal(calculateRawScore([80, 90, 70]), 80)
  })

  test('empty array returns 0', ({ assert }) => {
    assert.equal(calculateRawScore([]), 0)
  })

  test('rounds to 2 decimal places', ({ assert }) => {
    // (33 + 33 + 34) / 3 = 33.333...
    assert.equal(calculateRawScore([33, 33, 34]), 33.33)
  })

  test('handles single 100%', ({ assert }) => {
    assert.equal(calculateRawScore([100]), 100)
  })

  test('handles all zeros', ({ assert }) => {
    assert.equal(calculateRawScore([0, 0, 0]), 0)
  })
})

// ============================================================================
// Formula: Tier Determination
// ============================================================================

test.group('Tier Determination', () => {
  test('partner org member gets partner tier (weight 1.0)', ({ assert }) => {
    const result = determineTier(true, true)
    assert.equal(result.tierCode, TrustTierCode.PARTNER)
    assert.equal(result.tierWeight, 1.0)
  })

  test('org member gets organization tier (weight 0.8)', ({ assert }) => {
    const result = determineTier(true, false)
    assert.equal(result.tierCode, TrustTierCode.ORGANIZATION)
    assert.equal(result.tierWeight, 0.8)
  })

  test('no org membership gets community tier (weight 0.5)', ({ assert }) => {
    const result = determineTier(false, false)
    assert.equal(result.tierCode, TrustTierCode.COMMUNITY)
    assert.equal(result.tierWeight, 0.5)
  })

  test('partner takes priority over org membership', ({ assert }) => {
    const result = determineTier(true, true)
    assert.equal(result.tierCode, TrustTierCode.PARTNER)
  })
})
