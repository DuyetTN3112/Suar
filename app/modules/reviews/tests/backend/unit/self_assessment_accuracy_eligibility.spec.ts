import { test } from '@japa/runner'

import {
  evaluateSelfAssessmentAccuracyEligibility,
  resolveSelfAssessmentAccuracyPeriod,
} from '#modules/reviews/domain/self_assessment_accuracy_eligibility'

const OPEN_PERIOD = {
  valid: true,
  periodStartMillis: null,
  periodEndMillis: null,
} as const

test.group('Self-assessment accuracy eligibility', () => {
  test('publishes a confirmed completed review with normalized scores and date', ({ assert }) => {
    assert.deepEqual(
      evaluateSelfAssessmentAccuracyEligibility(
        {
          sessionStatus: 'completed',
          revieweeAction: 'confirmed',
          hasActiveDispute: false,
          latestDisputeStatus: null,
          latestFinalDecision: null,
          selfScore: '4',
          reviewedScore: '4.5',
          reviewCompletedAt: '2026-07-12T10:00:00.000Z',
        },
        OPEN_PERIOD
      ),
      {
        eligible: true,
        selfScore: 4,
        reviewedScore: 4.5,
        reviewCompletedAt: '2026-07-12T10:00:00.000Z',
      }
    )
  })

  test('fails closed without reviewee confirmation or with an active dispute', ({ assert }) => {
    const base = {
      sessionStatus: 'completed',
      revieweeAction: null,
      hasActiveDispute: false,
      latestDisputeStatus: null,
      latestFinalDecision: null,
      selfScore: 4,
      reviewedScore: 4.5,
      reviewCompletedAt: '2026-07-12T10:00:00.000Z',
    } as const

    assert.deepEqual(evaluateSelfAssessmentAccuracyEligibility(base, OPEN_PERIOD), {
      eligible: false,
    })
    assert.deepEqual(
      evaluateSelfAssessmentAccuracyEligibility(
        {
          ...base,
          sessionStatus: 'disputed',
          revieweeAction: 'disputed',
          hasActiveDispute: true,
          latestDisputeStatus: 'pending',
        },
        OPEN_PERIOD
      ),
      { eligible: false }
    )
  })

  test('publishes a resolved dispute only for a publishable decision', ({ assert }) => {
    assert.deepEqual(
      evaluateSelfAssessmentAccuracyEligibility(
        {
          sessionStatus: 'disputed',
          revieweeAction: 'disputed',
          hasActiveDispute: false,
          latestDisputeStatus: 'resolved',
          latestFinalDecision: 'adjust_score',
          selfScore: 3,
          reviewedScore: 4,
          reviewCompletedAt: '2026-07-13T10:00:00.000Z',
        },
        OPEN_PERIOD
      ),
      {
        eligible: true,
        selfScore: 3,
        reviewedScore: 4,
        reviewCompletedAt: '2026-07-13T10:00:00.000Z',
      }
    )
  })

  test('validates period boundaries and filters by review completion time', ({ assert }) => {
    const period = resolveSelfAssessmentAccuracyPeriod({
      periodStart: '2026-07-10T00:00:00.000Z',
      periodEnd: '2026-07-20T00:00:00.000Z',
    })
    assert.isTrue(period.valid)
    if (!period.valid) return

    assert.deepEqual(
      evaluateSelfAssessmentAccuracyEligibility(
        {
          sessionStatus: 'completed',
          revieweeAction: 'confirmed',
          hasActiveDispute: false,
          latestDisputeStatus: null,
          latestFinalDecision: null,
          selfScore: 4,
          reviewedScore: 4,
          reviewCompletedAt: '2026-07-21T00:00:00.000Z',
        },
        period
      ),
      { eligible: false }
    )
    assert.deepEqual(
      resolveSelfAssessmentAccuracyPeriod({
        periodStart: 'invalid',
        periodEnd: '2026-07-20T00:00:00.000Z',
      }),
      { valid: false }
    )
    assert.deepEqual(
      resolveSelfAssessmentAccuracyPeriod({
        periodStart: '2026-07-21T00:00:00.000Z',
        periodEnd: '2026-07-20T00:00:00.000Z',
      }),
      { valid: false }
    )
  })
})
