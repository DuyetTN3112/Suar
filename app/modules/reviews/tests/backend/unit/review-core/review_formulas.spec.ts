import { test } from '@japa/runner'

import {
  determineSessionStatus,
  isReviewSessionQuorumSatisfied,
} from '#modules/reviews/domain/review-core/review_formulas'
import { ReviewSessionStatus } from '#modules/reviews/public_contracts/review_constants'

test.group('Review formulas', () => {
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
      determineSessionStatus(false, 0, 2, ReviewSessionStatus.COMPLETED),
      ReviewSessionStatus.COMPLETED
    )
    assert.equal(
      determineSessionStatus(true, 1, 2, ReviewSessionStatus.PENDING),
      ReviewSessionStatus.IN_PROGRESS
    )
  })

  test('review session quorum satisfaction requires creator review and distinct review thresholds', ({
    assert,
  }) => {
    assert.isFalse(
      isReviewSessionQuorumSatisfied({
        creatorReviewCompleted: false,
        managerReviewsCount: 1,
        peerReviewsCount: 2,
        requiredTotalReviews: 2,
        minimumManagerReviews: 1,
        minimumPeerReviews: 2,
      })
    )
    assert.isFalse(
      isReviewSessionQuorumSatisfied({
        creatorReviewCompleted: true,
        managerReviewsCount: 0,
        peerReviewsCount: 2,
        requiredTotalReviews: 2,
        minimumManagerReviews: 1,
        minimumPeerReviews: 2,
      })
    )
    assert.isFalse(
      isReviewSessionQuorumSatisfied({
        creatorReviewCompleted: true,
        managerReviewsCount: 1,
        peerReviewsCount: 1,
        requiredTotalReviews: 2,
        minimumManagerReviews: 1,
        minimumPeerReviews: 2,
      })
    )
    assert.isTrue(
      isReviewSessionQuorumSatisfied({
        creatorReviewCompleted: true,
        managerReviewsCount: 1,
        peerReviewsCount: 2,
        requiredTotalReviews: 2,
        minimumManagerReviews: 1,
        minimumPeerReviews: 2,
      })
    )
  })
})
