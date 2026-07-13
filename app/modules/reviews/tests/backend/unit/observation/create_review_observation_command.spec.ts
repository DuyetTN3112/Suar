import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import CreateReviewObservationCommand, {
  ReviewObservationBlockedError,
} from '#modules/reviews/actions/commands/observation/create_review_observation_command'
import type {
  ReviewObservationAuthoringContext,
  ReviewObservationAuthoringContextInput,
} from '#modules/reviews/actions/ports/outbound/observation/review_observation_authoring_context_reader'
import type {
  CreateReviewObservationInput,
  ReviewObservationWriter,
} from '#modules/reviews/actions/ports/outbound/observation/review_observation_writer'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
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
    proposedStatement: 'Designed the API contract.',
    actualRole: 'backend engineer',
    actualOwnership: 'primary_owner',
    actualAutonomy: 'independent',
    contributionStatement: 'Owned the contract design.',
    deliverableRefs: [],
    criterionResultRefs: [],
    evidenceRefs: [EVIDENCE_ID],
    outcomeData: {},
    publicClaimDraft: null,
    privacyClassification: 'internal',
    status: 'under_review',
    createdAt: '2026-08-01T08:00:00.000Z',
  }
}

function observation(overrides: Partial<ReviewObservationV1> = {}): ReviewObservationV1 {
  return {
    schemaVersion: 'suar.review_observation.v1',
    id: '10000000-0000-4000-8000-000000000009',
    reviewWorkflowId: '10000000-0000-4000-8000-000000000010',
    reviewSessionId: '10000000-0000-4000-8000-000000000011',
    reviewRevision: 1,
    reviewPolicyVersion: 'review-policy-2026.08',
    capabilityTaxonomyVersion: 'capability-taxonomy-2026.08',
    assignmentSnapshotId: SNAPSHOT_ID,
    sourceSnapshotHash: `sha256:${'4'.repeat(64)}`,
    taskAssignmentId: ASSIGNMENT_ID,
    subjectUserId: SUBJECT_ID,
    observationType: 'accomplishment_claim',
    targetRef: CLAIM_ID,
    disposition: 'confirm',
    structuredValue: {
      action: 'designed',
      object: 'pre-order API contract',
      actualOwnership: 'primary_owner',
      evidenceRefs: [EVIDENCE_ID],
    },
    rationale: 'The exact evidence supports this bounded claim.',
    evidenceRefs: [EVIDENCE_ID],
    reviewerId: REVIEWER_ID,
    reviewerType: 'human',
    confidence: 0.9,
    assessmentCeiling: 8,
    governanceState: 'final',
    supersedesObservationId: null,
    createdAt: '2026-08-01T09:00:00.000Z',
    finalizedAt: '2026-08-01T09:05:00.000Z',
    ...overrides,
  }
}

function authoring(): ReviewObservationAuthoringContext {
  return {
    reviewerEligible: true,
    reviewerConflict: false,
    reviewerRole: 'technical_reviewer',
    authorizedAssessmentCeiling: 8,
    taskAssignmentHash: `sha256:${'3'.repeat(64)}`,
    assignmentSnapshotHash: `sha256:${'4'.repeat(64)}`,
    completionReportId: REPORT_ID,
    completionReportHash: `sha256:${'5'.repeat(64)}`,
    completionClaim: claim(),
    completionClaimHash: `sha256:${'6'.repeat(64)}`,
    sourceSnapshotId: SNAPSHOT_ID,
    taskContractVersionId: CONTRACT_ID,
    taskContractHash: `sha256:${'7'.repeat(64)}`,
    evidence: [
      {
        evidenceId: EVIDENCE_ID,
        accessClassification: 'confidential',
        reviewerAccessState: 'available',
        evidenceHash: `sha256:${'8'.repeat(64)}`,
      },
    ],
  }
}

function execContext(userId: string | null): ReviewActionContext {
  return {
    userId,
    ip: '127.0.0.1',
    userAgent: 'unit-test',
    organizationId: null,
  }
}

function harness(context: ReviewObservationAuthoringContext | null = authoring()) {
  const writes: CreateReviewObservationInput[] = []
  const reads: ReviewObservationAuthoringContextInput[] = []
  const writer = {
    createOrLoad: (input: CreateReviewObservationInput) => {
      writes.push(input)
      return Promise.resolve({
        inserted: true,
        observationId: input.observation.id,
        observationFactId: input.observation.id,
        revisionId: '10000000-0000-4000-8000-000000000012',
        revisionNumber: 1,
        revisionHash: `sha256:${'9'.repeat(64)}` as const,
        governanceState: input.observation.governanceState,
      })
    },
  } as unknown as ReviewObservationWriter
  return {
    writes,
    reads,
    dependencies: {
      contexts: {
        load: (input: ReviewObservationAuthoringContextInput) => {
          reads.push(input)
          return Promise.resolve(context)
        },
      },
      writer,
    },
  }
}

function dto() {
  return {
    idempotencyKey: 'create-observation-unit',
    completionReportId: REPORT_ID,
    completionClaimId: CLAIM_ID,
    observation: observation(),
    evidenceSufficiency: 'adequate' as const,
    rationaleClassification: 'confidential' as const,
    evidenceRelations: [{ evidenceId: EVIDENCE_ID, relation: 'supports' as const }],
  }
}

test.group('Unit | Create Review Observation command', () => {
  test('persists only authoritative provenance and evidence metadata', async ({ assert }) => {
    const { writes, reads, dependencies } = harness()
    const result = await new CreateReviewObservationCommand(
      execContext(REVIEWER_ID),
      dependencies
    ).execute(dto())

    assert.isTrue(result.inserted)
    assert.lengthOf(writes, 1)
    assert.equal(writes[0]?.reviewerRole, 'technical_reviewer')
    assert.equal(writes[0]?.completionReportHash, authoring().completionReportHash)
    assert.equal(writes[0]?.evidenceLinks[0]?.reviewerAccessState, 'available')
    assert.equal(writes[0]?.evidenceLinks[0]?.relation, 'supports')
    assert.equal(reads[0]?.observationType, 'accomplishment_claim')
    assert.equal(reads[0]?.targetRef, CLAIM_ID)
    assert.equal(reads[0]?.sourceSnapshotHash, authoring().assignmentSnapshotHash)
    assert.equal(reads[0]?.reviewerType, 'human')
  })

  test('passes the authenticated review context to the persistence audit boundary', async ({
    assert,
  }) => {
    const { writes, dependencies } = harness()
    await new CreateReviewObservationCommand(execContext(REVIEWER_ID), dependencies).execute(dto())

    const persistedInput = writes[0] as CreateReviewObservationInput & {
      auditContext: ReviewActionContext
    }
    assert.equal(persistedInput.auditContext.userId, REVIEWER_ID)
    assert.equal(persistedInput.auditContext.ip, '127.0.0.1')
    assert.equal(persistedInput.auditContext.userAgent, 'unit-test')
  })

  test('rejects guest and missing cross-module authoring context before persistence', async ({
    assert,
  }) => {
    await assert.rejects(
      () =>
        new CreateReviewObservationCommand(execContext(null), harness().dependencies).execute(
          dto()
        ),
      UnauthorizedException
    )
    const denied = harness(null)
    await assert.rejects(
      () =>
        new CreateReviewObservationCommand(execContext(REVIEWER_ID), denied.dependencies).execute(
          dto()
        ),
      ForbiddenException
    )
    assert.isEmpty(denied.writes)
  })

  test('propagates domain blockers and never writes a self-review', async ({ assert }) => {
    const blocked = harness()
    await assert.rejects(
      () =>
        new CreateReviewObservationCommand(execContext(SUBJECT_ID), blocked.dependencies).execute({
          ...dto(),
          observation: observation({ reviewerId: SUBJECT_ID }),
        }),
      ReviewObservationBlockedError
    )
    assert.isEmpty(blocked.writes)
  })

  test('rejects a client-supplied source snapshot hash that differs from authoritative context', async ({
    assert,
  }) => {
    const blocked = harness()
    await assert.rejects(
      () =>
        new CreateReviewObservationCommand(execContext(REVIEWER_ID), blocked.dependencies).execute({
          ...dto(),
          observation: observation({ sourceSnapshotHash: `sha256:${'f'.repeat(64)}` }),
        }),
      ReviewObservationBlockedError
    )
    assert.isEmpty(blocked.writes)
  })

  test('requires an exact evidence relation for every referenced item', async ({ assert }) => {
    const blocked = harness()
    await assert.rejects(
      () =>
        new CreateReviewObservationCommand(execContext(REVIEWER_ID), blocked.dependencies).execute({
          ...dto(),
          evidenceRelations: [],
        }),
      ValidationException
    )
    assert.isEmpty(blocked.writes)
  })
})
