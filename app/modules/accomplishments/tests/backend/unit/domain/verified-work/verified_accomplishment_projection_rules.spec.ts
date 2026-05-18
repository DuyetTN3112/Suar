import { test } from '@japa/runner'

import {
  VERIFIED_ACCOMPLISHMENT_GATE_CODES,
  evaluateVerifiedAccomplishmentGate,
  type VerifiedAccomplishmentGateInput,
} from '#modules/accomplishments/domain/verified-work/verified_accomplishment_projection_rules'
import type {
  CompletionClaimV1,
  ReviewObservationV1,
} from '#modules/reviews/public_contracts/observation/completion_review_contracts'

const IDS = {
  assignment: '20000000-0000-4000-8000-000000000001',
  snapshot: '20000000-0000-4000-8000-000000000002',
  contract: '20000000-0000-4000-8000-000000000003',
  specification: '20000000-0000-4000-8000-000000000004',
  report: '20000000-0000-4000-8000-000000000005',
  claim: '20000000-0000-4000-8000-000000000006',
  evidence: '20000000-0000-4000-8000-000000000007',
  deliverable: '20000000-0000-4000-8000-000000000008',
  criterion: '20000000-0000-4000-8000-000000000009',
  workflow: '20000000-0000-4000-8000-000000000010',
  session: '20000000-0000-4000-8000-000000000011',
  subject: '20000000-0000-4000-8000-000000000012',
  reviewer: '20000000-0000-4000-8000-000000000013',
  observation: '20000000-0000-4000-8000-000000000014',
} as const

const HASHES = {
  specification: `sha256:${'1'.repeat(64)}`,
  contract: `sha256:${'2'.repeat(64)}`,
  assignment: `sha256:${'3'.repeat(64)}`,
  completion: `sha256:${'4'.repeat(64)}`,
  review: `sha256:${'5'.repeat(64)}`,
  claim: `sha256:${'6'.repeat(64)}`,
  observation: `sha256:${'7'.repeat(64)}`,
} as const

function claim(overrides: Partial<CompletionClaimV1> = {}): CompletionClaimV1 {
  return {
    schemaVersion: 'suar.completion_claim.v1',
    id: IDS.claim,
    completionReportId: IDS.report,
    completionReportRevision: 1,
    completionReportHash: HASHES.completion,
    assignmentSnapshotId: IDS.snapshot,
    taskContractVersionId: IDS.contract,
    userId: IDS.subject,
    action: 'designed',
    object: 'pre-order-api',
    proposedTitle: 'Designed the pre-order API',
    proposedStatement: 'Designed the API contract and failure semantics.',
    actualRole: 'backend-engineer',
    actualOwnership: 'primary_owner',
    actualAutonomy: 'independent',
    contributionStatement: 'Owned the API contract and review changes.',
    deliverableRefs: [IDS.deliverable],
    criterionResultRefs: [IDS.criterion],
    evidenceRefs: [IDS.evidence],
    outcomeData: { accepted: true },
    publicClaimDraft: null,
    privacyClassification: 'internal',
    status: 'under_review',
    createdAt: '2026-08-01T08:00:00.000Z',
    ...overrides,
  }
}

function observation(overrides: Partial<ReviewObservationV1> = {}): ReviewObservationV1 {
  return {
    schemaVersion: 'suar.review_observation.v1',
    id: IDS.observation,
    reviewWorkflowId: IDS.workflow,
    reviewSessionId: IDS.session,
    reviewRevision: 1,
    reviewPolicyVersion: 'review-policy-2026.08',
    capabilityTaxonomyVersion: null,
    assignmentSnapshotId: IDS.snapshot,
    sourceSnapshotHash: HASHES.assignment,
    taskAssignmentId: IDS.assignment,
    subjectUserId: IDS.subject,
    observationType: 'accomplishment_claim',
    targetRef: IDS.claim,
    disposition: 'confirm',
    structuredValue: {
      action: 'designed',
      object: 'pre-order-api',
      actualOwnership: 'primary_owner',
      deliverableRefs: [IDS.deliverable],
      criterionResultRefs: [IDS.criterion],
      evidenceRefs: [IDS.evidence],
    },
    rationale: 'The immutable report and evidence support this bounded contribution.',
    evidenceRefs: [IDS.evidence],
    reviewerId: IDS.reviewer,
    reviewerType: 'human',
    confidence: 0.91,
    assessmentCeiling: null,
    governanceState: 'final',
    supersedesObservationId: null,
    createdAt: '2026-08-01T09:00:00.000Z',
    finalizedAt: '2026-08-01T09:05:00.000Z',
    ...overrides,
  }
}

function input(overrides: Partial<VerifiedAccomplishmentGateInput> = {}): VerifiedAccomplishmentGateInput {
  return {
    profileEligible: true,
    requiredReviewerQuorumMet: true,
    requiredReviewerCount: 1,
    expectedReviewPolicyVersion: 'review-policy-2026.08',
    unresolvedDispute: false,
    taskAssignmentId: IDS.assignment,
    assignmentSnapshotId: IDS.snapshot,
    assignmentSnapshotHash: HASHES.assignment,
    taskSpecificationVersionId: IDS.specification,
    taskSpecificationHash: HASHES.specification,
    taskContractVersionId: IDS.contract,
    taskContractHash: HASHES.contract,
    completionReportId: IDS.report,
    completionReportHash: HASHES.completion,
    reviewWorkflowId: IDS.workflow,
    reviewHash: HASHES.review,
    claim: claim(),
    claimHash: HASHES.claim,
    observations: [
      {
        observation: observation(),
        revisionHash: HASHES.observation,
        evidenceSufficiency: 'adequate',
      },
    ],
    ...overrides,
  }
}

test.group('Unit | Verified accomplishment projection gate', () => {
  test('accepts one exact final human-reviewed claim and returns bounded projection facts', ({
    assert,
  }) => {
    const result = evaluateVerifiedAccomplishmentGate(input())

    assert.isTrue(result.allowed)
    if (!result.allowed) return
    assert.equal(result.lifecycleState, 'verified')
    assert.equal(result.action, 'designed')
    assert.equal(result.object, 'pre-order-api')
    assert.equal(result.ownershipLevel, 'primary_owner')
    assert.deepEqual(result.evidenceIds, [IDS.evidence])
    assert.deepEqual(result.reviewObservationIds, [IDS.observation])
    assert.deepEqual(result.reviewerReferences, [
      { reviewerId: IDS.reviewer, reviewerRole: 'human' },
    ])
  })

  test('uses the reviewer-narrowed ownership and partial lifecycle without widening claim scope', ({
    assert,
  }) => {
    const narrowed = observation({
      disposition: 'partially_verify',
      structuredValue: {
        action: 'designed',
        object: 'pre-order-api',
        actualOwnership: 'contributor',
        deliverableRefs: [IDS.deliverable],
        criterionResultRefs: [IDS.criterion],
        evidenceRefs: [IDS.evidence],
      },
    })
    const result = evaluateVerifiedAccomplishmentGate(
      input({ observations: [{ observation: narrowed, revisionHash: HASHES.observation, evidenceSufficiency: 'adequate' }] })
    )

    assert.isTrue(result.allowed)
    if (!result.allowed) return
    assert.equal(result.lifecycleState, 'partially_verified')
    assert.equal(result.ownershipLevel, 'contributor')
  })

  test('blocks operational-only, missing quorum, insufficient evidence and unresolved dispute independently', ({
    assert,
  }) => {
    const operational = evaluateVerifiedAccomplishmentGate(input({ profileEligible: false }))
    const quorum = evaluateVerifiedAccomplishmentGate(
      input({ requiredReviewerQuorumMet: false })
    )
    const evidence = evaluateVerifiedAccomplishmentGate(
      input({
        observations: [
          {
            observation: observation(),
            revisionHash: HASHES.observation,
            evidenceSufficiency: 'inadequate',
          },
        ],
      })
    )
    const dispute = evaluateVerifiedAccomplishmentGate(input({ unresolvedDispute: true }))

    assert.include(operational.blockerCodes, VERIFIED_ACCOMPLISHMENT_GATE_CODES.profileIneligible)
    assert.include(quorum.blockerCodes, VERIFIED_ACCOMPLISHMENT_GATE_CODES.reviewerQuorumMissing)
    assert.include(evidence.blockerCodes, VERIFIED_ACCOMPLISHMENT_GATE_CODES.evidenceInsufficient)
    assert.include(dispute.blockerCodes, VERIFIED_ACCOMPLISHMENT_GATE_CODES.unresolvedDispute)
  })

  test('rejects rejected/conflicted/draft/AI observations instead of treating task completion as proof', ({
    assert,
  }) => {
    for (const reviewed of [
      observation({ disposition: 'reject' }),
      observation({ disposition: 'flag_conflict' }),
      observation({ governanceState: 'draft', finalizedAt: null }),
      observation({ reviewerType: 'ai_assistant' }),
    ]) {
      const result = evaluateVerifiedAccomplishmentGate(
        input({
          observations: [
            {
              observation: reviewed,
              revisionHash: HASHES.observation,
              evidenceSufficiency: 'adequate',
            },
          ],
        })
      )
      assert.isFalse(result.allowed)
      assert.include(
        result.blockerCodes,
        VERIFIED_ACCOMPLISHMENT_GATE_CODES.finalHumanDecisionMissing
      )
    }
  })

  test('rejects a foreign report/snapshot/workflow provenance chain', ({ assert }) => {
    const foreign = observation({
      assignmentSnapshotId: '20000000-0000-4000-8000-000000000099',
      reviewWorkflowId: '20000000-0000-4000-8000-000000000098',
    })
    const result = evaluateVerifiedAccomplishmentGate(
      input({
        claim: claim({ completionReportHash: `sha256:${'f'.repeat(64)}` }),
        observations: [
          {
            observation: foreign,
            revisionHash: HASHES.observation,
            evidenceSufficiency: 'adequate',
          },
        ],
      })
    )

    assert.include(result.blockerCodes, VERIFIED_ACCOMPLISHMENT_GATE_CODES.provenanceMismatch)
  })

  test('does not average conflicting final reviewer decisions', ({ assert }) => {
    const second = observation({
      id: '20000000-0000-4000-8000-000000000015',
      reviewerId: '20000000-0000-4000-8000-000000000016',
      disposition: 'partially_verify',
      structuredValue: {
        action: 'designed',
        object: 'pre-order-api',
        actualOwnership: 'contributor',
        deliverableRefs: [IDS.deliverable],
        criterionResultRefs: [IDS.criterion],
        evidenceRefs: [IDS.evidence],
      },
    })
    const result = evaluateVerifiedAccomplishmentGate(
      input({
        observations: [
          {
            observation: observation(),
            revisionHash: HASHES.observation,
            evidenceSufficiency: 'adequate',
          },
          {
            observation: second,
            revisionHash: `sha256:${'8'.repeat(64)}`,
            evidenceSufficiency: 'adequate',
          },
        ],
      })
    )

    assert.include(result.blockerCodes, VERIFIED_ACCOMPLISHMENT_GATE_CODES.conflictingDecisions)
  })

  test('rejects self-review and observations outside the governed review policy', ({ assert }) => {
    const selfReview = evaluateVerifiedAccomplishmentGate(
      input({
        observations: [
          {
            observation: observation({ reviewerId: IDS.subject }),
            revisionHash: HASHES.observation,
            evidenceSufficiency: 'adequate',
          },
        ],
      })
    )
    const wrongPolicy = evaluateVerifiedAccomplishmentGate(
      {
        ...input(),
        expectedReviewPolicyVersion: 'review-policy-2026.08',
        requiredReviewerCount: 1,
        observations: [
          {
            observation: observation({ reviewPolicyVersion: 'review-policy-foreign' }),
            revisionHash: HASHES.observation,
            evidenceSufficiency: 'adequate',
          },
        ],
      }
    )

    assert.include(
      selfReview.blockerCodes,
      'TVA.ACCOMPLISHMENT.GATE.REVIEWER_INELIGIBLE'
    )
    assert.include(
      wrongPolicy.blockerCodes,
      'TVA.ACCOMPLISHMENT.GATE.REVIEW_POLICY_MISMATCH'
    )
  })

  test('derives quorum from distinct governed reviewers instead of trusting a boolean', ({
    assert,
  }) => {
    const forged = evaluateVerifiedAccomplishmentGate(
      {
        ...input(),
        requiredReviewerQuorumMet: true,
        expectedReviewPolicyVersion: 'review-policy-2026.08',
        requiredReviewerCount: 2,
      }
    )

    assert.isFalse(forged.allowed)
    assert.include(forged.blockerCodes, VERIFIED_ACCOMPLISHMENT_GATE_CODES.reviewerQuorumMissing)
  })
})
