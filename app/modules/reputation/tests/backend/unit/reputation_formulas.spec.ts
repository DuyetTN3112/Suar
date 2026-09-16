import { test } from '@japa/runner'

import {
  calculateWeightedTrustScore,
  calculateCredibilityScore,
  adjustCredibility,
  calculateRawScore,
  determineTier,
  calculateSkillWeightedScore,
  calculateSkillConfidence,
  mapLevelCodeToNumber,
  mapWeightedScoreToLevelCode,
  calculatePerformanceScore,
  calculateTrustScoreV2,
} from '#modules/reputation/domain/reputation_formulas'
import { TrustTierCode, TRUST_TIER_WEIGHTS } from '#modules/users/public_contracts/user_constants'

test.group('Reputation formulas', () => {
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

  test('skill weighting, confidence, and composed scores reward stronger and better-supported signals', ({
    assert,
  }) => {
    const level1Score = calculateSkillWeightedScore([
      {
        levelCode: 'l1',
        reviewerType: 'peer',
        reviewerCredibilityScore: 100,
        monthsAgo: 0,
      },
    ])
    const level2Score = calculateSkillWeightedScore([
      {
        levelCode: 'l2',
        reviewerType: 'peer',
        reviewerCredibilityScore: 100,
        monthsAgo: 0,
      },
    ])
    assert.isAbove(level2Score, level1Score)

    const managerScore = calculateSkillWeightedScore([
      {
        levelCode: 'l2',
        reviewerType: 'manager',
        reviewerCredibilityScore: 100,
        monthsAgo: 0,
      },
      {
        levelCode: 'l1',
        reviewerType: 'peer',
        reviewerCredibilityScore: 100,
        monthsAgo: 0,
      },
    ])
    assert.isAbove(managerScore, 1.5)

    assert.equal(
      calculateSkillConfidence({
        reviewCount: 0,
        hasManager: false,
        hasPeer: false,
        evidenceCount: 0,
        reviewerCredibilityAverage: 0,
      }),
      0
    )

    const fullConfidence = calculateSkillConfidence({
      reviewCount: 8,
      hasManager: true,
      hasPeer: true,
      evidenceCount: 3,
      reviewerCredibilityAverage: 100,
    })
    assert.equal(fullConfidence, 100)

    const levelCode = mapWeightedScoreToLevelCode(2.2)
    assert.equal(mapLevelCodeToNumber(levelCode), 2)

    const performanceScore = calculatePerformanceScore({
      qualityScore: 80,
      deliveryScore: 90,
      difficultyBonus: 70,
      consistencyScore: 85,
    })
    assert.equal(performanceScore, 81.8)

    const trustScore = calculateTrustScoreV2({
      reviewConsistency: 80,
      reviewerCredibility: 90,
      evidenceCoverage: 75,
      orgPartnerWeight: 85,
      volumeRecency: 70,
    })
    assert.equal(trustScore, 80.8)
  })
})
