import { test } from '@japa/runner'

import type { ReviewSubmittedEvent } from '#modules/reviews/events/review_events'
import {
  handleReviewSkillScoreUpdated,
  handleReviewSubmitted,
  type ReviewListenerDependencies,
} from '#modules/reviews/listeners/review_listener'

function dependencies(
  overrides: Partial<ReviewListenerDependencies> = {}
): ReviewListenerDependencies {
  return {
    processReviewSubmitted: async () => Promise.resolve(),
    processReviewConfirmed: async () => Promise.resolve(),
    processDisputeResolved: async () => Promise.resolve(),
    processSkillScoreUpdated: async () => Promise.resolve(),
    logger: {
      debug: () => {},
      error: () => {},
    },
    ...overrides,
  }
}

const submittedEvent: ReviewSubmittedEvent = {
  submissionId: 'submission-1',
  reviewSessionId: 'review-session-1',
  reviewerAssignmentId: 'reviewer-assignment-1',
  reviewerId: 'reviewer-1',
  reviewerType: 'peer',
  revieweeId: 'reviewee-1',
  taskId: 'task-1',
  skillReviewIds: ['skill-review-1'],
  submittedAt: '2026-07-26T12:00:00.000Z',
}

test.group('Review listener handlers', () => {
  test('review-submitted handler delegates before logging success', async ({ assert }) => {
    const calls: string[] = []
    const deps = dependencies({
      processReviewSubmitted: async (event, context) => {
        await Promise.resolve()
        assert.strictEqual(event, submittedEvent)
        assert.deepEqual(context, {})
        calls.push('process')
      },
      logger: {
        debug: () => calls.push('debug'),
        error: () => calls.push('error'),
      },
    })

    await handleReviewSubmitted(submittedEvent, deps)

    assert.deepEqual(calls, ['process', 'debug'])
  })

  test('listener rethrows the business failure even when failure telemetry throws', async ({
    assert,
  }) => {
    const original = new Error('durable review processing failed')
    const deps = dependencies({
      processReviewSubmitted: () => Promise.reject(original),
      logger: {
        debug: () => {},
        error: () => {
          throw new Error('logger failed')
        },
      },
    })

    let caught: unknown
    try {
      await handleReviewSubmitted(submittedEvent, deps)
    } catch (error) {
      caught = error
    }

    assert.strictEqual(caught, original)
  })

  test('skill-score handler invalidates only the affected user review cache', async ({
    assert,
  }) => {
    const userIds: string[] = []
    const deps = dependencies({
      processSkillScoreUpdated: async (event) => {
        await Promise.resolve()
        userIds.push(event.userId)
      },
    })

    await handleReviewSkillScoreUpdated(
      {
        userId: 'reviewee-1',
        skillId: 'skill-1',
        oldScore: 3,
        newScore: 4,
      },
      deps
    )

    assert.deepEqual(userIds, ['reviewee-1'])
  })
})
