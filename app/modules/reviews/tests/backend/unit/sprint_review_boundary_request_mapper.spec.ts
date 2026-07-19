import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildCreateReviewDisputeEvidenceRequest,
  buildCreateSprintReviewDisputeRequest,
  buildCreateSprintReviewDisputeCommentRequest,
  buildReviewDisputeCaseFileRequest,
  buildReportSprintReviewDisputeRequest,
  buildSubmitSprintReviewPackageRequest,
} from '#modules/reviews/controllers/mappers/request/sprint-review/sprint_review_boundary_request_mapper'
import {
  buildCloseProjectSprintReviewPeriodRequest,
  buildCloseProjectSprintReviewRequest,
  buildExpireSprintReviewPackagesRequest,
} from '#modules/reviews/controllers/mappers/request/sprint-review/sprint_review_lifecycle_request_mapper'

function requestOf(values: Record<string, unknown>) {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(values, key) ? values[key] : fallback
    },
  }
}


test.group('', () => {
  test('maps sprint lifecycle route params and optional reason without coercing values', ({ assert }) => {
    assert.deepEqual(buildCloseProjectSprintReviewRequest({ sprintId: ' sprint-1 ' }), {
      sprintId: 'sprint-1',
    })
    assert.deepEqual(
      buildCloseProjectSprintReviewRequest({ sprintId: 'sprint-1', projectId: 'project-1' }),
      { sprintId: 'sprint-1', projectId: 'project-1' }
    )
    assert.deepEqual(buildCloseProjectSprintReviewPeriodRequest({ sprintId: 'sprint-2' }), {
      sprintId: 'sprint-2',
    })
    assert.deepEqual(
      buildExpireSprintReviewPackagesRequest(
        { sprintId: 'sprint-3' },
        requestOf({ reason: 'manual close' })
      ),
      { sprintId: 'sprint-3', reason: 'manual close' }
    )
  })

  test('rejects malformed sprint lifecycle route or body values', ({ assert }) => {
    assert.throws(() => buildCloseProjectSprintReviewRequest({ sprintId: 42 }), ValidationException)
    assert.throws(() => buildCloseProjectSprintReviewPeriodRequest({}), ValidationException)
    assert.throws(
      () => buildExpireSprintReviewPackagesRequest({ sprintId: 'sprint-1' }, requestOf({ reason: 42 })),
      ValidationException
    )
  })

  test('maps dispute comment and report aliases into strict command inputs', ({ assert }) => {
    assert.deepEqual(
      buildCreateSprintReviewDisputeCommentRequest(
        { disputeId: ' dispute-1 ' },
        requestOf({ body: '  Need context  ', visibility: 'admin_only' })
      ),
      { dispute_id: 'dispute-1', body: 'Need context', visibility: 'admin_only' }
    )
    assert.deepEqual(
      buildReportSprintReviewDisputeRequest(
        { disputeId: 'dispute-1' },
        requestOf({ escalation_reason: '  Escalate for review  ' })
      ),
      { dispute_id: 'dispute-1', escalation_reason: 'Escalate for review' }
    )
  })

  test('rejects missing or invalid dispute comment and report inputs', ({ assert }) => {
    assert.throws(
      () => buildCreateSprintReviewDisputeCommentRequest({ disputeId: 'dispute-1' }, requestOf({ body: '   ' })),
      ValidationException
    )
    assert.throws(
      () =>
        buildCreateSprintReviewDisputeCommentRequest(
          { disputeId: 'dispute-1' },
          requestOf({ body: 'hello', visibility: 'public' })
        ),
      ValidationException
    )
    assert.throws(
      () => buildReportSprintReviewDisputeRequest({ disputeId: 42 }, requestOf({ escalationReason: 'reason' })),
      ValidationException
    )
    assert.throws(
      () => buildReportSprintReviewDisputeRequest({ disputeId: 'dispute-1' }, requestOf({})),
      ValidationException
    )
  })

  test('maps dispute artifacts and sprint dispute aliases without coercion', ({ assert }) => {
    assert.deepEqual(buildReviewDisputeCaseFileRequest({ disputeId: ' dispute-1 ' }), { dispute_id: 'dispute-1' })
    assert.deepEqual(
      buildCreateReviewDisputeEvidenceRequest(
        { disputeId: 'dispute-1' },
        requestOf({ evidence_type: 'url', url: 'https://example.test', title: 'Demo' })
      ),
      { dispute_id: 'dispute-1', evidence_type: 'url', url: 'https://example.test', title: 'Demo', description: null }
    )
    assert.deepEqual(
      buildCreateSprintReviewDisputeRequest(
        { packageId: 'package-1' },
        requestOf({ dispute_reason: '  Needs context  ', requested_outcome: 'add_context' })
      ),
      { package_id: 'package-1', dispute_reason: 'Needs context', requested_outcome: 'add_context' }
    )
  })

  test('rejects malformed dispute artifact and sprint dispute inputs', ({ assert }) => {
    assert.throws(() => buildReviewDisputeCaseFileRequest({ disputeId: 42 }), ValidationException)
    assert.throws(
      () => buildCreateReviewDisputeEvidenceRequest({ disputeId: 'dispute-1' }, requestOf({ url: 42 })),
      ValidationException
    )
    assert.throws(
      () => buildCreateSprintReviewDisputeRequest({ packageId: 'package-1' }, requestOf({ dispute_reason: 'x', requested_outcome: 'invalid' })),
      ValidationException
    )
  })

  test('maps sprint review package submission aliases and defaults optional fields', ({ assert }) => {
    const dto = buildSubmitSprintReviewPackageRequest(
      { packageId: 'package-1' },
      requestOf({
        manager_reviews: [
          {
            target_user_id: 'manager-1',
            rating: 5,
            dimensions: { quality: 5 },
            comment: 'Good collaboration',
          },
        ],
        environmentReviews: [
          {
            targetType: 'project',
            targetId: 'project-1',
            rating: '4',
            isAnonymousPublicly: false,
          },
        ],
      })
    )

    assert.deepEqual(dto, {
      package_id: 'package-1',
      manager_reviews: [
        {
          target_user_id: 'manager-1',
          rating: 5,
          dimensions: { quality: 5 },
          comment: 'Good collaboration',
          is_anonymous_to_target: true,
        },
      ],
      environment_reviews: [
        {
          target_type: 'project',
          target_id: 'project-1',
          rating: 4,
          dimensions: null,
          comment: null,
          is_anonymous_publicly: false,
        },
      ],
    })
  })

  test('rejects malformed sprint review package submission items', ({ assert }) => {
    assert.throws(
      () => buildSubmitSprintReviewPackageRequest({ packageId: 42 }, requestOf({})),
      ValidationException
    )
    assert.throws(
      () =>
        buildSubmitSprintReviewPackageRequest(
          { packageId: 'package-1' },
          requestOf({ managerReviews: [{ targetUserId: 'manager-1', rating: 6 }] })
        ),
      ValidationException
    )
    assert.throws(
      () =>
        buildSubmitSprintReviewPackageRequest(
          { packageId: 'package-1' },
          requestOf({ environmentReviews: [{ targetType: 'team', targetId: 'team-1', rating: 3 }] })
        ),
      ValidationException
    )
    assert.throws(
      () =>
        buildSubmitSprintReviewPackageRequest(
          { packageId: 'package-1' },
          requestOf({ managerReviews: 'not-an-array' })
        ),
      ValidationException
    )
  })


})
