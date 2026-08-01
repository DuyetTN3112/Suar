import { test } from '@japa/runner'

import { evaluateProfileReviewEligibility } from '#modules/reviews/domain/profile_review_eligibility'

test.group('Profile review eligibility', () => {
  test('publishes only an explicitly confirmed completed session', ({ assert }) => {
    assert.deepEqual(
      evaluateProfileReviewEligibility({
        sessionStatus: 'completed',
        revieweeAction: 'confirmed',
        hasActiveDispute: false,
        latestDisputeStatus: null,
        latestFinalDecision: null,
      }),
      { eligible: true, reason: 'reviewee_confirmed' }
    )

    assert.deepEqual(
      evaluateProfileReviewEligibility({
        sessionStatus: 'completed',
        revieweeAction: null,
        hasActiveDispute: false,
        latestDisputeStatus: null,
        latestFinalDecision: null,
      }),
      { eligible: false, reason: 'reviewee_confirmation_missing' }
    )
  })

  test('active disputes and re-review decisions always retract', ({ assert }) => {
    assert.deepEqual(
      evaluateProfileReviewEligibility({
        sessionStatus: 'disputed',
        revieweeAction: 'disputed',
        hasActiveDispute: true,
        latestDisputeStatus: 'pending',
        latestFinalDecision: null,
      }),
      { eligible: false, reason: 'active_dispute' }
    )

    assert.deepEqual(
      evaluateProfileReviewEligibility({
        sessionStatus: 'disputed',
        revieweeAction: 'disputed',
        hasActiveDispute: false,
        latestDisputeStatus: 'resolved',
        latestFinalDecision: 'request_re_review',
      }),
      { eligible: false, reason: 'request_re_review' }
    )
  })

  test('only explicit publishable terminal dispute decisions restore eligibility', ({ assert }) => {
    for (const latestFinalDecision of [
      'uphold_review',
      'adjust_score',
      'dismiss_dispute',
      'partially_accept',
    ]) {
      assert.deepEqual(
        evaluateProfileReviewEligibility({
          sessionStatus: 'disputed',
          revieweeAction: 'disputed',
          hasActiveDispute: false,
          latestDisputeStatus: 'resolved',
          latestFinalDecision,
        }),
        { eligible: true, reason: 'resolved_dispute_publishable' }
      )
    }

    for (const latestDisputeStatus of [null, 'rejected', 'cancelled']) {
      assert.deepEqual(
        evaluateProfileReviewEligibility({
          sessionStatus: 'disputed',
          revieweeAction: 'disputed',
          hasActiveDispute: false,
          latestDisputeStatus,
          latestFinalDecision: null,
        }),
        { eligible: false, reason: 'dispute_not_publishable' }
      )
    }
  })

  test('unknown and unfinished session states fail closed', ({ assert }) => {
    for (const sessionStatus of ['pending', 'in_progress', 'unknown']) {
      assert.deepEqual(
        evaluateProfileReviewEligibility({
          sessionStatus,
          revieweeAction: 'confirmed',
          hasActiveDispute: false,
          latestDisputeStatus: null,
          latestFinalDecision: null,
        }),
        { eligible: false, reason: 'session_not_final' }
      )
    }
  })
})
