import { test } from '@japa/runner'
import {
  getLevelCodeFromPercentage,
  ProficiencyLevel,
  TrustTierCode,
  TRUST_TIER_WEIGHTS,
} from '#constants/user_constants'

// ============================================================================
// getLevelCodeFromPercentage
// ============================================================================
test.group('getLevelCodeFromPercentage', () => {
  test('0% maps to BEGINNER', ({ assert }) => {
    assert.equal(getLevelCodeFromPercentage(0), ProficiencyLevel.BEGINNER)
  })

  test('12% maps to BEGINNER', ({ assert }) => {
    assert.equal(getLevelCodeFromPercentage(12), ProficiencyLevel.BEGINNER)
  })

  test('12.5% maps to ELEMENTARY', ({ assert }) => {
    assert.equal(getLevelCodeFromPercentage(12.5), ProficiencyLevel.ELEMENTARY)
  })

  test('25% maps to JUNIOR', ({ assert }) => {
    assert.equal(getLevelCodeFromPercentage(25), ProficiencyLevel.JUNIOR)
  })

  test('37.5% maps to MIDDLE', ({ assert }) => {
    assert.equal(getLevelCodeFromPercentage(37.5), ProficiencyLevel.MIDDLE)
  })

  test('50% maps to SENIOR', ({ assert }) => {
    assert.equal(getLevelCodeFromPercentage(50), ProficiencyLevel.SENIOR)
  })

  test('62.5% maps to LEAD', ({ assert }) => {
    assert.equal(getLevelCodeFromPercentage(62.5), ProficiencyLevel.LEAD)
  })

  test('75% maps to PRINCIPAL', ({ assert }) => {
    assert.equal(getLevelCodeFromPercentage(75), ProficiencyLevel.PRINCIPAL)
  })

  test('87.5% maps to MASTER', ({ assert }) => {
    assert.equal(getLevelCodeFromPercentage(87.5), ProficiencyLevel.MASTER)
  })

  test('100% maps to MASTER (fallback)', ({ assert }) => {
    assert.equal(getLevelCodeFromPercentage(100), ProficiencyLevel.MASTER)
  })

  test('mid-range percentages map correctly', ({ assert }) => {
    assert.equal(getLevelCodeFromPercentage(6), ProficiencyLevel.BEGINNER)
    assert.equal(getLevelCodeFromPercentage(18), ProficiencyLevel.ELEMENTARY)
    assert.equal(getLevelCodeFromPercentage(30), ProficiencyLevel.JUNIOR)
    assert.equal(getLevelCodeFromPercentage(45), ProficiencyLevel.MIDDLE)
    assert.equal(getLevelCodeFromPercentage(55), ProficiencyLevel.SENIOR)
    assert.equal(getLevelCodeFromPercentage(70), ProficiencyLevel.LEAD)
    assert.equal(getLevelCodeFromPercentage(80), ProficiencyLevel.PRINCIPAL)
    assert.equal(getLevelCodeFromPercentage(95), ProficiencyLevel.MASTER)
  })
})

// ============================================================================
// TRUST_TIER_WEIGHTS
// ============================================================================
test.group('TRUST_TIER_WEIGHTS', () => {
  test('community weight is 0.5', ({ assert }) => {
    assert.equal(TRUST_TIER_WEIGHTS[TrustTierCode.COMMUNITY], 0.5)
  })

  test('organization weight is 0.8', ({ assert }) => {
    assert.equal(TRUST_TIER_WEIGHTS[TrustTierCode.ORGANIZATION], 0.8)
  })

  test('partner weight is 1.0', ({ assert }) => {
    assert.equal(TRUST_TIER_WEIGHTS[TrustTierCode.PARTNER], 1.0)
  })

  test('all tiers have weights', ({ assert }) => {
    for (const tier of Object.values(TrustTierCode)) {
      assert.isNumber(TRUST_TIER_WEIGHTS[tier])
    }
  })

  test('weights are in ascending order', ({ assert }) => {
    assert.isBelow(
      TRUST_TIER_WEIGHTS[TrustTierCode.COMMUNITY],
      TRUST_TIER_WEIGHTS[TrustTierCode.ORGANIZATION]
    )
    assert.isBelow(
      TRUST_TIER_WEIGHTS[TrustTierCode.ORGANIZATION],
      TRUST_TIER_WEIGHTS[TrustTierCode.PARTNER]
    )
  })

  test('all weights are between 0 and 1', ({ assert }) => {
    for (const weight of Object.values(TRUST_TIER_WEIGHTS)) {
      assert.isAtLeast(weight, 0)
      assert.isAtMost(weight, 1)
    }
  })
})
