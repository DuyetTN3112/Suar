import { test } from '@japa/runner'

import {
  REVIEW_OBSERVATION_CODES,
  validateReviewObservation,
  type ReviewObservationRuleInput,
} from '#modules/reviews/domain/observation/review_observation_rules'
import type {
  CompletionClaimV1,
  ReviewObservationV1,
} from '#modules/reviews/public_contracts/observation/completion_review_contracts'

const REVIEWER_ID = '10000000-0000-4000-8000-000000000001'
const SUBJECT_ID = '10000000-0000-4000-8000-000000000002'
const CLAIM_ID = '10000000-0000-4000-8000-000000000003'
const REPORT_ID = '10000000-0000-4000-8000-000000000004'
const SNAPSHOT_ID = '10000000-0000-4000-8000-000000000005'
const ASSIGNMENT_ID = '10000000-0000-4000-8000-000000000006'
const CONTRACT_ID = '10000000-0000-4000-8000-000000000007'
const EVIDENCE_ID = '10000000-0000-4000-8000-000000000008'
const DELIVERABLE_ID = '10000000-0000-4000-8000-000000000009'
const CRITERION_ID = '10000000-0000-4000-8000-000000000010'

function claim(): CompletionClaimV1 {
  return {
    schemaVersion: 'suar.completion_claim.v1',
    id: CLAIM_ID,
    completionReportId: REPORT_ID,
    completionReportRevision: 1,
    completionReportHash: `sha256:${'1'.repeat(64)}`,
    assignmentSnapshotId: SNAPSHOT_ID,
    taskContractVersionId: CONTRACT_ID,
    userId: SUBJECT_ID,
    action: 'designed',
    object: 'pre-order API contract',
    proposedTitle: 'Designed the pre-order API contract',
    proposedStatement: 'Designed the API contract and failure semantics.',
    actualRole: 'backend engineer',
    actualOwnership: 'primary_owner',
    actualAutonomy: 'independent',
    contributionStatement: 'Owned the API contract and review changes.',
    deliverableRefs: [DELIVERABLE_ID],
    criterionResultRefs: [CRITERION_ID],
    evidenceRefs: [EVIDENCE_ID],
    outcomeData: { reviewDefects: 0 },
    publicClaimDraft: null,
    privacyClassification: 'internal',
    status: 'under_review',
    createdAt: '2026-08-01T08:00:00.000Z',
  }
}

function observation(overrides: Partial<ReviewObservationV1> = {}): ReviewObservationV1 {
  return {
    schemaVersion: 'suar.review_observation.v1',
    id: '10000000-0000-4000-8000-000000000011',
    reviewWorkflowId: '10000000-0000-4000-8000-000000000012',
    reviewSessionId: '10000000-0000-4000-8000-000000000013',
    reviewRevision: 1,
    reviewPolicyVersion: 'review-policy-2026.08',
    capabilityTaxonomyVersion: 'capability-taxonomy-2026.08',
    assignmentSnapshotId: SNAPSHOT_ID,
    sourceSnapshotHash: `sha256:${'2'.repeat(64)}`,
    taskAssignmentId: ASSIGNMENT_ID,
    subjectUserId: SUBJECT_ID,
    observationType: 'accomplishment_claim',
    targetRef: CLAIM_ID,
    disposition: 'confirm',
    structuredValue: {
      action: 'designed',
      object: 'pre-order API contract',
      actualOwnership: 'primary_owner',
      deliverableRefs: [DELIVERABLE_ID],
      criterionResultRefs: [CRITERION_ID],
      evidenceRefs: [EVIDENCE_ID],
    },
    rationale: 'The submitted contract and tests support the claimed contribution.',
    evidenceRefs: [EVIDENCE_ID],
    reviewerId: REVIEWER_ID,
    reviewerType: 'human',
    confidence: 0.91,
    assessmentCeiling: 8,
    governanceState: 'final',
    supersedesObservationId: null,
    createdAt: '2026-08-01T09:00:00.000Z',
    finalizedAt: '2026-08-01T09:05:00.000Z',
    ...overrides,
  }
}

function validInput(
  overrides: Partial<ReviewObservationRuleInput> = {}
): ReviewObservationRuleInput {
  return {
    actorId: REVIEWER_ID,
    reviewerEligible: true,
    reviewerConflict: false,
    authorizedAssessmentCeiling: 8,
    evidenceSufficiency: 'adequate',
    observation: observation(),
    completionClaim: claim(),
    evidenceAccess: [{ evidenceId: EVIDENCE_ID, reviewerAccessState: 'available' }],
    ...overrides,
  }
}

test.group('Unit | Review observation rules', () => {
  test('allows a human reviewer to verify only the exact claim and accessible evidence', ({
    assert,
  }) => {
    const result = validateReviewObservation(validInput())

    assert.isTrue(result.allowed)
    assert.isEmpty(result.blockerCodes)
  })

  test('blocks self-review, ineligible reviewer, and declared conflict independently', ({
    assert,
  }) => {
    const result = validateReviewObservation(
      validInput({
        actorId: SUBJECT_ID,
        reviewerEligible: false,
        reviewerConflict: true,
        observation: observation({ reviewerId: SUBJECT_ID }),
      })
    )

    assert.include(result.blockerCodes, REVIEW_OBSERVATION_CODES.selfReviewForbidden)
    assert.include(result.blockerCodes, REVIEW_OBSERVATION_CODES.reviewerIneligible)
    assert.include(result.blockerCodes, REVIEW_OBSERVATION_CODES.reviewerConflict)
  })

  test('prevents a reviewer from widening claim scope, references, or ownership', ({ assert }) => {
    const result = validateReviewObservation(
      validInput({
        observation: observation({
          structuredValue: {
            action: 'implemented',
            object: 'entire pre-order platform',
            actualOwnership: 'lead',
            deliverableRefs: ['10000000-0000-4000-8000-000000000099'],
            criterionResultRefs: [CRITERION_ID],
            evidenceRefs: [EVIDENCE_ID],
          },
        }),
      })
    )

    assert.include(result.blockerCodes, REVIEW_OBSERVATION_CODES.claimScopeExpanded)
    assert.include(result.blockerCodes, REVIEW_OBSERVATION_CODES.ownershipExpanded)
  })

  test('cannot verify inaccessible or insufficient evidence but may request more evidence', ({
    assert,
  }) => {
    const inaccessible = validateReviewObservation(
      validInput({
        evidenceSufficiency: 'governed_exception',
        evidenceAccess: [{ evidenceId: EVIDENCE_ID, reviewerAccessState: 'restricted' }],
      })
    )
    const requestEvidence = validateReviewObservation(
      validInput({
        evidenceSufficiency: 'inadequate',
        evidenceAccess: [{ evidenceId: EVIDENCE_ID, reviewerAccessState: 'restricted' }],
        observation: observation({ disposition: 'request_evidence' }),
      })
    )

    assert.include(inaccessible.blockerCodes, REVIEW_OBSERVATION_CODES.evidenceAccessInsufficient)
    assert.include(
      inaccessible.blockerCodes,
      REVIEW_OBSERVATION_CODES.evidenceSufficiencyInsufficient
    )
    assert.isTrue(requestEvidence.allowed)
  })

  test('requires taxonomy and an authorized ceiling for capability observations', ({ assert }) => {
    const missing = validateReviewObservation(
      validInput({
        authorizedAssessmentCeiling: null,
        completionClaim: null,
        observation: observation({
          observationType: 'capability',
          targetRef: '10000000-0000-4000-8000-000000000014',
          capabilityTaxonomyVersion: null,
          assessmentCeiling: null,
        }),
      })
    )
    const exceeded = validateReviewObservation(
      validInput({
        authorizedAssessmentCeiling: 6,
        completionClaim: null,
        observation: observation({
          observationType: 'capability',
          targetRef: '10000000-0000-4000-8000-000000000014',
          assessmentCeiling: 8,
        }),
      })
    )

    assert.include(missing.blockerCodes, REVIEW_OBSERVATION_CODES.capabilityTaxonomyRequired)
    assert.include(missing.blockerCodes, REVIEW_OBSERVATION_CODES.assessmentCeilingRequired)
    assert.include(exceeded.blockerCodes, REVIEW_OBSERVATION_CODES.assessmentCeilingExceeded)
  })

  test('requires evidence and confidence for final capability verification', ({ assert }) => {
    const result = validateReviewObservation(
      validInput({
        observation: observation({
          observationType: 'capability',
          targetRef: '10000000-0000-4000-8000-000000000014',
          evidenceRefs: [],
          confidence: null,
        }),
        completionClaim: null,
        evidenceAccess: [],
      })
    )

    assert.include(result.blockerCodes, 'TVA.REVIEW.OBSERVATION.CAPABILITY_EVIDENCE_REQUIRED')
    assert.include(result.blockerCodes, 'TVA.REVIEW.OBSERVATION.CAPABILITY_CONFIDENCE_REQUIRED')
  })

  test('keeps draft and request-evidence capability observations authorable without proof yet', ({
    assert,
  }) => {
    const draft = validateReviewObservation(
      validInput({
        evidenceSufficiency: 'pending',
        observation: observation({
          observationType: 'capability',
          targetRef: '10000000-0000-4000-8000-000000000014',
          evidenceRefs: [],
          confidence: null,
          governanceState: 'draft',
          finalizedAt: null,
        }),
        completionClaim: null,
        evidenceAccess: [],
      })
    )
    const requestEvidence = validateReviewObservation(
      validInput({
        evidenceSufficiency: 'pending',
        observation: observation({
          observationType: 'capability',
          targetRef: '10000000-0000-4000-8000-000000000014',
          disposition: 'request_evidence',
          evidenceRefs: [],
          confidence: null,
        }),
        completionClaim: null,
        evidenceAccess: [],
      })
    )

    assert.isTrue(draft.allowed)
    assert.isTrue(requestEvidence.allowed)
  })

  test('keeps AI output as a draft suggestion and forbids autonomous finalization', ({
    assert,
  }) => {
    const final = validateReviewObservation(
      validInput({ observation: observation({ reviewerType: 'ai_assistant' }) })
    )
    const draft = validateReviewObservation(
      validInput({
        evidenceSufficiency: 'pending',
        observation: observation({
          reviewerType: 'ai_assistant',
          governanceState: 'draft',
          finalizedAt: null,
        }),
      })
    )

    assert.include(final.blockerCodes, REVIEW_OBSERVATION_CODES.aiFinalizationForbidden)
    assert.isTrue(draft.allowed)
  })
})
