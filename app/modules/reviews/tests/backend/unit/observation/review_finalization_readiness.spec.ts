import { test } from '@japa/runner'

import {
  REVIEW_FINALIZATION_READINESS_CODES,
  evaluateReviewFinalizationReadiness,
  type ReviewFinalizationReadinessInput,
} from '#modules/reviews/domain/observation/review_finalization_readiness'
import type { ReviewObservationV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'

const REVIEWER_ID = '10000000-0000-4000-8000-000000000001'
const SUBJECT_ID = '10000000-0000-4000-8000-000000000002'
const WORKFLOW_ID = '10000000-0000-4000-8000-000000000003'
const SESSION_ID = '10000000-0000-4000-8000-000000000004'
const ASSIGNMENT_ID = '10000000-0000-4000-8000-000000000005'
const SNAPSHOT_ID = '10000000-0000-4000-8000-000000000006'
const REPORT_ID = '10000000-0000-4000-8000-000000000007'
const CLAIM_ID = '10000000-0000-4000-8000-000000000008'
const OBSERVATION_ID = '10000000-0000-4000-8000-000000000009'
const EVIDENCE_ID = '10000000-0000-4000-8000-000000000010'
const HASH = `sha256:${'a'.repeat(64)}` as const

function observation(overrides: Partial<ReviewObservationV1> = {}): ReviewObservationV1 {
  return {
    schemaVersion: 'suar.review_observation.v1',
    id: OBSERVATION_ID,
    reviewWorkflowId: WORKFLOW_ID,
    reviewSessionId: SESSION_ID,
    reviewRevision: 1,
    reviewPolicyVersion: 'review-policy-2026.08',
    capabilityTaxonomyVersion: null,
    assignmentSnapshotId: SNAPSHOT_ID,
    sourceSnapshotHash: HASH,
    taskAssignmentId: ASSIGNMENT_ID,
    subjectUserId: SUBJECT_ID,
    observationType: 'accomplishment_claim',
    targetRef: CLAIM_ID,
    disposition: 'confirm',
    structuredValue: { evidenceRefs: [EVIDENCE_ID] },
    rationale: 'The exact submitted evidence supports this observation.',
    evidenceRefs: [EVIDENCE_ID],
    reviewerId: REVIEWER_ID,
    reviewerType: 'human',
    confidence: 0.9,
    assessmentCeiling: null,
    governanceState: 'final',
    supersedesObservationId: null,
    createdAt: '2026-08-01T09:00:00.000Z',
    finalizedAt: '2026-08-01T09:05:00.000Z',
    ...overrides,
  }
}

function input(
  overrides: Partial<ReviewFinalizationReadinessInput> = {}
): ReviewFinalizationReadinessInput {
  return {
    expected: {
      reviewWorkflowId: WORKFLOW_ID,
      reviewSessionId: SESSION_ID,
      taskAssignmentId: ASSIGNMENT_ID,
      assignmentSnapshotId: SNAPSHOT_ID,
      assignmentSnapshotHash: HASH,
      completionReportId: REPORT_ID,
      completionReportHash: HASH,
      completionClaimId: CLAIM_ID,
    },
    observations: [
      {
        observation: observation(),
        current: true,
        revisionHash: HASH,
        completionReportId: REPORT_ID,
        completionReportHash: HASH,
        completionClaimId: CLAIM_ID,
        evidenceSufficiency: 'adequate',
        evidence: [{ evidenceId: EVIDENCE_ID, reviewerAccessState: 'available' }],
      },
    ],
    ...overrides,
  }
}

test.group('Review finalization readiness', () => {
  test('never authorizes an empty or policy-unevaluated review', ({ assert }) => {
    const result = evaluateReviewFinalizationReadiness(input({ observations: [] }))

    assert.isFalse(result.finalizationAuthorized)
    assert.equal(result.policyStatus, 'not_evaluated')
    assert.include(result.blockerCodes, REVIEW_FINALIZATION_READINESS_CODES.observationRequired)
    assert.include(result.blockerCodes, REVIEW_FINALIZATION_READINESS_CODES.policyUnresolved)
  })

  test('reports a valid current observation without converting it into governed authorization', ({
    assert,
  }) => {
    const result = evaluateReviewFinalizationReadiness(input())

    assert.isFalse(result.finalizationAuthorized)
    assert.deepEqual(result.currentObservationIds, [OBSERVATION_ID])
    assert.deepEqual(result.blockerCodes, [REVIEW_FINALIZATION_READINESS_CODES.policyUnresolved])
  })

  test('ignores stale prior revisions when selecting current facts', ({ assert }) => {
    const result = evaluateReviewFinalizationReadiness(
      input({
        observations: [
          {
            ...input().observations[0],
            observation: observation({ id: '10000000-0000-4000-8000-000000000011' }),
            current: false,
          },
          input().observations[0],
        ],
      })
    )

    assert.deepEqual(result.currentObservationIds, [OBSERVATION_ID])
    assert.deepEqual(result.staleObservationIds, ['10000000-0000-4000-8000-000000000011'])
    assert.notInclude(
      result.blockerCodes,
      REVIEW_FINALIZATION_READINESS_CODES.conflictingObservations
    )
  })

  test('blocks provenance and evidence drift before any policy decision', ({ assert }) => {
    const result = evaluateReviewFinalizationReadiness(
      input({
        observations: [
          {
            ...input().observations[0],
            observation: observation({
              assignmentSnapshotId: '10000000-0000-4000-8000-000000000012',
            }),
            completionReportId: '10000000-0000-4000-8000-000000000013',
            completionReportHash: `sha256:${'b'.repeat(64)}`,
            evidence: [{ evidenceId: EVIDENCE_ID, reviewerAccessState: 'restricted' }],
          },
        ],
      })
    )

    assert.include(result.blockerCodes, REVIEW_FINALIZATION_READINESS_CODES.snapshotMismatch)
    assert.include(result.blockerCodes, REVIEW_FINALIZATION_READINESS_CODES.reportMismatch)
    assert.include(result.blockerCodes, REVIEW_FINALIZATION_READINESS_CODES.reportHashMismatch)
    assert.include(result.blockerCodes, REVIEW_FINALIZATION_READINESS_CODES.evidenceUnavailable)
  })

  test('blocks final verification when evidence sufficiency is not adequate', ({ assert }) => {
    const result = evaluateReviewFinalizationReadiness(
      input({
        observations: [
          {
            ...input().observations[0],
            evidenceSufficiency: 'pending',
          },
        ],
      })
    )

    assert.include(result.blockerCodes, REVIEW_FINALIZATION_READINESS_CODES.evidenceSufficiency)
  })

  test('requires evidence and confidence for a final capability observation', ({ assert }) => {
    const result = evaluateReviewFinalizationReadiness(
      input({
        observations: [
          {
            ...input().observations[0],
            observation: observation({
              observationType: 'capability',
              capabilityTaxonomyVersion: 'taxonomy-2026.08',
              assessmentCeiling: 3,
              evidenceRefs: [],
              confidence: null,
            }),
            evidence: [],
          },
        ],
      })
    )

    assert.include(result.blockerCodes, 'TVA.REVIEW.FINALIZATION.CAPABILITY_EVIDENCE_REQUIRED')
    assert.include(result.blockerCodes, 'TVA.REVIEW.FINALIZATION.CAPABILITY_CONFIDENCE_REQUIRED')
    assert.isFalse(result.finalizationAuthorized)
    assert.equal(result.policyStatus, 'not_evaluated')
  })

  test('blocks disputed, frozen, revoked and non-final current observations', ({ assert }) => {
    for (const governanceState of ['draft', 'disputed', 'frozen', 'revoked'] as const) {
      const result = evaluateReviewFinalizationReadiness(
        input({
          observations: [
            {
              ...input().observations[0],
              observation: observation({
                governanceState,
                finalizedAt: governanceState === 'draft' ? null : '2026-08-01T09:05:00.000Z',
              }),
            },
          ],
        })
      )

      assert.include(result.blockerCodes, REVIEW_FINALIZATION_READINESS_CODES.governanceState)
    }
  })

  test('reports conflicting current dispositions for the same claim', ({ assert }) => {
    const result = evaluateReviewFinalizationReadiness(
      input({
        observations: [
          input().observations[0],
          {
            ...input().observations[0],
            observation: observation({
              id: '10000000-0000-4000-8000-000000000014',
              disposition: 'narrow',
            }),
          },
        ],
      })
    )

    assert.include(result.blockerCodes, REVIEW_FINALIZATION_READINESS_CODES.conflictingObservations)
    assert.deepEqual(result.conflictTargetRefs, [CLAIM_ID])
  })
})
