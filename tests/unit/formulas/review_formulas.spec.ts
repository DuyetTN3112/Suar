import { test } from '@japa/runner'

import { ReviewSessionStatus } from '#modules/reviews/constants/review_constants'
import {
  calculateWeightedTrustScore,
  calculateCredibilityScore,
  adjustCredibility,
  determineSessionStatus,
  calculateRawScore,
  determineTier,
  calculateSkillWeightedScore,
  calculateSkillConfidence,
  mapLevelCodeToNumber,
  mapWeightedScoreToLevelCode,
  calculatePerformanceScore,
  calculateTrustScoreV2,
} from '#modules/reviews/domain/review_formulas'
import { TrustTierCode, TRUST_TIER_WEIGHTS } from '#modules/users/constants/user_constants'

test.group('Review formulas', () => {
  test('trust, credibility, raw score, and tier math preserve canonical weighting contracts', ({
    assert,
  }) => {
    assert.equal(calculateWeightedTrustScore(80, TRUST_TIER_WEIGHTS[TrustTierCode.COMMUNITY]), 40)
    assert.equal(calculateCredibilityScore(0, 0, 0), 50)
    assert.equal(calculateCredibilityScore(10, 7, 3), 69)
    assert.equal(adjustCredibility(50, 'confirmed'), 52)
    assert.equal(adjustCredibility(50, 'disputed'), 45)
    assert.equal(adjustCredibility(99, 'confirmed'), 100)
    assert.equal(adjustCredibility(3, 'disputed'), 0)
    assert.equal(calculateRawScore([]), 0)
    assert.equal(calculateRawScore([80, 90, 70]), 80)
    assert.equal(calculateRawScore([33, 33, 34]), 33.33)
    assert.deepEqual(determineTier(true, true), {
      tierCode: TrustTierCode.PARTNER,
      tierWeight: 1,
      tierName: 'Partner-Verified',
    })
    assert.deepEqual(determineTier(false, false), {
      tierCode: TrustTierCode.COMMUNITY,
      tierWeight: 0.5,
      tierName: 'Community-Verified',
    })
  })

  test('session status precedence completes before any pending-to-in-progress transition', ({
    assert,
  }) => {
    assert.equal(
      determineSessionStatus(true, 2, 2, ReviewSessionStatus.IN_PROGRESS),
      ReviewSessionStatus.COMPLETED
    )
    assert.equal(
      determineSessionStatus(false, 0, 2, ReviewSessionStatus.PENDING),
      ReviewSessionStatus.IN_PROGRESS
    )
    assert.equal(
      determineSessionStatus(false, 1, 3, ReviewSessionStatus.IN_PROGRESS),
      ReviewSessionStatus.IN_PROGRESS
    )
    assert.equal(
      determineSessionStatus(true, 0, 0, ReviewSessionStatus.PENDING),
      ReviewSessionStatus.COMPLETED
    )
  })

  test('skill weighting, confidence, and composed scores reward stronger and better-supported signals', ({
    assert,
  }) => {
    const managerWeightedHigher = calculateSkillWeightedScore([
      { levelCode: 'lead', reviewerType: 'manager', reviewerCredibilityScore: 90, monthsAgo: 1 },
      { levelCode: 'junior', reviewerType: 'peer', reviewerCredibilityScore: 20, monthsAgo: 12 },
    ])
    const peerWeightedLower = calculateSkillWeightedScore([
      { levelCode: 'lead', reviewerType: 'peer', reviewerCredibilityScore: 20, monthsAgo: 12 },
      { levelCode: 'junior', reviewerType: 'manager', reviewerCredibilityScore: 90, monthsAgo: 1 },
    ])

    assert.equal(calculateSkillWeightedScore([]), 0)
    assert.equal(mapLevelCodeToNumber('beginner'), 1)
    assert.equal(mapLevelCodeToNumber('master'), 8)
    assert.equal(mapWeightedScoreToLevelCode(1.49), 'beginner')
    assert.equal(mapWeightedScoreToLevelCode(6.5), 'principal')
    assert.equal(mapWeightedScoreToLevelCode(7.5), 'master')
    assert.isAbove(managerWeightedHigher, peerWeightedLower)
    const highSignal = calculateSkillConfidence({
      reviewCount: 8,
      hasManager: true,
      hasPeer: true,
      evidenceCount: 3,
      reviewerCredibilityAverage: 90,
    })
    const lowSignal = calculateSkillConfidence({
      reviewCount: 1,
      hasManager: false,
      hasPeer: true,
      evidenceCount: 0,
      reviewerCredibilityAverage: 20,
    })

    assert.isAbove(highSignal, lowSignal)
    assert.isAtMost(highSignal, 100)
    assert.equal(
      calculatePerformanceScore({
        qualityScore: 100,
        deliveryScore: 100,
        difficultyBonus: 100,
        consistencyScore: 100,
      }),
      100
    )
    assert.equal(
      calculateTrustScoreV2({
        reviewConsistency: 100,
        reviewerCredibility: 100,
        evidenceCoverage: 100,
        orgPartnerWeight: 100,
        volumeRecency: 100,
      }),
      100
    )
    assert.equal(
      calculatePerformanceScore({
        qualityScore: -10,
        deliveryScore: -10,
        difficultyBonus: -10,
        consistencyScore: -10,
      }),
      0
    )
  })
})
