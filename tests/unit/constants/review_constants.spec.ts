import { test } from '@japa/runner'
import {
  ReviewSessionStatus,
  FlaggedReviewStatus,
  AnomalyFlagType,
  AnomalySeverity,
  ReviewerType,
  ReverseReviewTargetType,
  ReviewConfirmationAction,
  REVIEW_DEFAULTS,
} from '#constants/review_constants'

test.group('ReviewConstants', () => {
  test('ReviewSessionStatus enum has correct values matching DB CHECK', ({ assert }) => {
    assert.equal(ReviewSessionStatus.PENDING, 'pending')
    assert.equal(ReviewSessionStatus.IN_PROGRESS, 'in_progress')
    assert.equal(ReviewSessionStatus.COMPLETED, 'completed')
    assert.equal(ReviewSessionStatus.DISPUTED, 'disputed')
    assert.equal(Object.values(ReviewSessionStatus).length, 4)
  })

  test('FlaggedReviewStatus enum has correct values', ({ assert }) => {
    assert.equal(FlaggedReviewStatus.PENDING, 'pending')
    assert.equal(FlaggedReviewStatus.REVIEWED, 'reviewed')
    assert.equal(FlaggedReviewStatus.DISMISSED, 'dismissed')
    assert.equal(FlaggedReviewStatus.CONFIRMED, 'confirmed')
    assert.equal(Object.values(FlaggedReviewStatus).length, 4)
  })

  test('AnomalyFlagType enum has 6 types matching DB CHECK', ({ assert }) => {
    assert.equal(AnomalyFlagType.SUDDEN_SPIKE, 'sudden_spike')
    assert.equal(AnomalyFlagType.MUTUAL_HIGH, 'mutual_high')
    assert.equal(AnomalyFlagType.BULK_SAME_LEVEL, 'bulk_same_level')
    assert.equal(AnomalyFlagType.FREQUENCY_ANOMALY, 'frequency_anomaly')
    assert.equal(AnomalyFlagType.NEW_ACCOUNT_HIGH, 'new_account_high')
    assert.equal(AnomalyFlagType.IP_COLLUSION, 'ip_collusion')
    assert.equal(Object.values(AnomalyFlagType).length, 6)
  })

  test('AnomalySeverity enum has correct values', ({ assert }) => {
    assert.equal(AnomalySeverity.LOW, 'low')
    assert.equal(AnomalySeverity.MEDIUM, 'medium')
    assert.equal(AnomalySeverity.HIGH, 'high')
    assert.equal(AnomalySeverity.CRITICAL, 'critical')
    assert.equal(Object.values(AnomalySeverity).length, 4)
  })

  test('ReviewerType enum has correct values', ({ assert }) => {
    assert.equal(ReviewerType.MANAGER, 'manager')
    assert.equal(ReviewerType.PEER, 'peer')
    assert.equal(Object.values(ReviewerType).length, 2)
  })

  test('ReverseReviewTargetType enum has correct values', ({ assert }) => {
    assert.equal(ReverseReviewTargetType.PEER, 'peer')
    assert.equal(ReverseReviewTargetType.MANAGER, 'manager')
    assert.equal(ReverseReviewTargetType.PROJECT, 'project')
    assert.equal(ReverseReviewTargetType.ORGANIZATION, 'organization')
    assert.equal(Object.values(ReverseReviewTargetType).length, 4)
  })

  test('ReviewConfirmationAction enum has correct values', ({ assert }) => {
    assert.equal(ReviewConfirmationAction.CONFIRMED, 'confirmed')
    assert.equal(ReviewConfirmationAction.DISPUTED, 'disputed')
    assert.equal(Object.values(ReviewConfirmationAction).length, 2)
  })

  test('REVIEW_DEFAULTS has correct values', ({ assert }) => {
    assert.equal(REVIEW_DEFAULTS.MIN_PEER_REVIEWS, 2)
    assert.equal(REVIEW_DEFAULTS.INITIAL_CREDIBILITY_SCORE, 50)
    assert.equal(REVIEW_DEFAULTS.MAX_CREDIBILITY_SCORE, 100)
    assert.equal(REVIEW_DEFAULTS.MIN_RATING, 1)
    assert.equal(REVIEW_DEFAULTS.MAX_RATING, 5)
  })

  test('REVIEW_DEFAULTS MIN_RATING < MAX_RATING', ({ assert }) => {
    assert.isBelow(REVIEW_DEFAULTS.MIN_RATING, REVIEW_DEFAULTS.MAX_RATING)
  })

  test('REVIEW_DEFAULTS INITIAL_CREDIBILITY_SCORE <= MAX_CREDIBILITY_SCORE', ({ assert }) => {
    assert.isAtMost(
      REVIEW_DEFAULTS.INITIAL_CREDIBILITY_SCORE,
      REVIEW_DEFAULTS.MAX_CREDIBILITY_SCORE
    )
  })
})
