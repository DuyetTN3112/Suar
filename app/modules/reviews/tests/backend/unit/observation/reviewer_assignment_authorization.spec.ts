import { test } from '@japa/runner'

import { resolveReviewObservationReviewerAuthorization } from '#modules/reviews/domain/observation/reviewer_assignment_authorization'

const nativeAssignment = (
  overrides: Partial<
    Parameters<typeof resolveReviewObservationReviewerAuthorization>[0]['nativeAssignments'][number]
  > = {}
) => ({
  reviewerId: 'manager-1',
  reviewerType: 'manager' as const,
  assignmentRole: 'manager_required' as const,
  status: 'pending' as const,
  ...overrides,
})

const legacyReviewer = (
  overrides: Partial<
    NonNullable<
      Parameters<typeof resolveReviewObservationReviewerAuthorization>[0]['legacyReviewer']
    >
  > = {}
) => ({
  reviewerId: 'manager-1',
  reviewerRole: 'backend_lead',
  status: 'pending',
  ...overrides,
})

test.group('Review observation reviewer assignment authorization', () => {
  test('requires an active native assignment when the session has native assignments', ({
    assert,
  }) => {
    assert.isNull(
      resolveReviewObservationReviewerAuthorization({
        reviewerId: 'outsider',
        nativeAssignments: [nativeAssignment()],
        legacyReviewer: legacyReviewer({ reviewerId: 'outsider' }),
      })
    )
  })

  test('uses the native assignment role even when a legacy row disagrees', ({ assert }) => {
    assert.deepEqual(
      resolveReviewObservationReviewerAuthorization({
        reviewerId: 'manager-1',
        nativeAssignments: [nativeAssignment()],
        legacyReviewer: legacyReviewer(),
      }),
      { reviewerRole: 'manager_required', reviewerType: 'manager' }
    )
  })

  test('authorizes a submitted native assignment with the native role and type', ({ assert }) => {
    assert.deepEqual(
      resolveReviewObservationReviewerAuthorization({
        reviewerId: 'manager-1',
        nativeAssignments: [nativeAssignment({ status: 'submitted' })],
        legacyReviewer: legacyReviewer({ status: 'submitted' }),
      }),
      { reviewerRole: 'manager_required', reviewerType: 'manager' }
    )
  })

  test('does not authorize a waived native assignment', ({ assert }) => {
    assert.isNull(
      resolveReviewObservationReviewerAuthorization({
        reviewerId: 'manager-1',
        nativeAssignments: [nativeAssignment({ status: 'waived' })],
        legacyReviewer: legacyReviewer(),
      })
    )
  })

  test('keeps the legacy row as a compatibility path only when no native assignments exist', ({
    assert,
  }) => {
    assert.deepEqual(
      resolveReviewObservationReviewerAuthorization({
        reviewerId: 'manager-1',
        nativeAssignments: [],
        legacyReviewer: legacyReviewer(),
      }),
      { reviewerRole: 'backend_lead', reviewerType: 'legacy' }
    )
  })
})
