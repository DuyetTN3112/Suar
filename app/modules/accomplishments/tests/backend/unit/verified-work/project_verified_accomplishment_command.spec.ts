import { test } from '@japa/runner'

import ProjectVerifiedAccomplishmentCommand, {
  PROJECT_VERIFIED_ACCOMPLISHMENT_CODES,
  ProjectVerifiedAccomplishmentBlockedError,
} from '#modules/accomplishments/actions/commands/verified-work/project_verified_accomplishment_command'
import type {
  GovernedAccomplishmentProjectionSource,
  GovernedAccomplishmentProjectionSourceIdentity,
} from '#modules/accomplishments/actions/ports/outbound/verified-work/governed_accomplishment_projection_source_reader'
import type {
  AccomplishmentTransaction,
  AccomplishmentTransactionRunner,
} from '#modules/accomplishments/actions/ports/outbound/accomplishment_transaction'
import type {
  CreateVerifiedAccomplishmentAggregateInput,
  VerifiedAccomplishmentWriter,
} from '#modules/accomplishments/actions/ports/outbound/verified-work/verified_accomplishment_writer'
import { NodeAccomplishmentContentHasher } from '#modules/accomplishments/infra/adapters/verified-work/node_accomplishment_content_hasher'
import type {
  CompletionClaimV1,
  ReviewObservationV1,
} from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'

const id = (suffix: number): string =>
  `40000000-0000-4000-8000-${suffix.toString().padStart(12, '0')}`
const hash = (character: string) => `sha256:${character.repeat(64)}` as const

const IDS = {
  organization: id(1),
  project: id(2),
  task: id(3),
  assignment: id(4),
  snapshot: id(5),
  specification: id(6),
  contract: id(7),
  report: id(8),
  claim: id(9),
  subject: id(10),
  workflow: id(11),
  session: id(12),
  observation: id(13),
  observationRevision: id(14),
  observationFact: id(15),
  reviewer: id(16),
  evidence: id(17),
  deliverable: id(18),
  criterion: id(19),
  finalizedFact: id(20),
} as const

function claim(): CompletionClaimV1 {
  return {
    schemaVersion: 'suar.completion_claim.v1',
    id: IDS.claim,
    completionReportId: IDS.report,
    completionReportRevision: 1,
    completionReportHash: hash('4'),
    assignmentSnapshotId: IDS.snapshot,
    taskContractVersionId: IDS.contract,
    userId: IDS.subject,
    action: 'designed',
    object: 'pre_order_api',
    proposedTitle: 'Designed the pre-order API contract',
    proposedStatement: 'Designed failure-safe API and idempotency semantics.',
    actualRole: 'backend_engineer',
    actualOwnership: 'primary_owner',
    actualAutonomy: 'independent',
    contributionStatement: 'Owned the API contract and review changes.',
    deliverableRefs: [IDS.deliverable],
    criterionResultRefs: [IDS.criterion],
    evidenceRefs: [IDS.evidence],
    outcomeData: { acceptanceScenarios: 12 },
    publicClaimDraft: null,
    privacyClassification: 'confidential',
    status: 'under_review',
    createdAt: '2026-08-01T08:00:00.000Z',
  }
}

function observation(): ReviewObservationV1 {
  return {
    schemaVersion: 'suar.review_observation.v1',
    id: IDS.observation,
    reviewWorkflowId: IDS.workflow,
    reviewSessionId: IDS.session,
    reviewRevision: 1,
    reviewPolicyVersion: 'review-policy-2026.08',
    capabilityTaxonomyVersion: null,
    assignmentSnapshotId: IDS.snapshot,
    sourceSnapshotHash: hash('3'),
    taskAssignmentId: IDS.assignment,
    subjectUserId: IDS.subject,
    observationType: 'accomplishment_claim',
    targetRef: IDS.claim,
    disposition: 'confirm',
    structuredValue: {
      action: 'designed',
      object: 'pre_order_api',
      actualOwnership: 'primary_owner',
      deliverableRefs: [IDS.deliverable],
      criterionResultRefs: [IDS.criterion],
      evidenceRefs: [IDS.evidence],
    },
    rationale: 'The contract, implementation and tests support this exact contribution.',
    evidenceRefs: [IDS.evidence],
    reviewerId: IDS.reviewer,
    reviewerType: 'human',
    confidence: 0.92,
    assessmentCeiling: null,
    governanceState: 'final',
    supersedesObservationId: null,
    createdAt: '2026-08-01T09:00:00.000Z',
    finalizedAt: '2026-08-01T09:05:00.000Z',
  }
}

function source(
  overrides: Partial<GovernedAccomplishmentProjectionSource> = {}
): GovernedAccomplishmentProjectionSource {
  const completionClaim = claim()
  const reviewObservation = observation()
  const identity = {
    reviewWorkflowId: IDS.workflow,
    completionClaimId: IDS.claim,
    reviewFinalizedFactId: IDS.finalizedFact,
    reviewFinalizedFactHash: hash('5'),
    projectionPolicyVersion: 'accomplishment-policy-2026.08',
  }
  return {
    identity,
    organizationId: IDS.organization,
    projectId: IDS.project,
    projectContextVersionId: null,
    workPackageVersionId: null,
    provenanceClass: 'native_prework',
    reconstruction: null,
    gateInput: {
      profileEligible: true,
      requiredReviewerQuorumMet: true,
      requiredReviewerCount: 1,
      expectedReviewPolicyVersion: 'review-policy-2026.08',
      unresolvedDispute: false,
      taskAssignmentId: IDS.assignment,
      assignmentSnapshotId: IDS.snapshot,
      assignmentSnapshotHash: hash('3'),
      taskSpecificationVersionId: IDS.specification,
      taskSpecificationHash: hash('1'),
      taskContractVersionId: IDS.contract,
      taskContractHash: hash('2'),
      completionReportId: IDS.report,
      completionReportHash: hash('4'),
      reviewWorkflowId: IDS.workflow,
      reviewHash: hash('5'),
      claim: completionClaim,
      claimHash: hash('6'),
      observations: [
        {
          observation: reviewObservation,
          revisionHash: hash('7'),
          evidenceSufficiency: 'adequate',
        },
      ],
    },
    governedClaimRef: {
      claimId: IDS.claim,
      claimHash: hash('6'),
      subjectUserId: IDS.subject,
    },
    requirementContext: {
      taskId: IDS.task,
      taskAssignmentId: IDS.assignment,
      assignmentSnapshotId: IDS.snapshot,
      assignmentSnapshotHash: hash('3'),
      taskSpecificationVersionId: IDS.specification,
      taskSpecificationHash: hash('1'),
      taskContractVersionId: IDS.contract,
      taskContractHash: hash('2'),
      businessContext: 'Pre-order order lifecycle',
      systemArea: 'order_service',
      environment: 'production',
      scaleSummary: 'Multi-service transaction flow',
      constraints: [{ id: id(30), description: 'Inventory consistency' }],
      deliverables: [
        {
          id: IDS.deliverable,
          title: 'OpenAPI specification',
          kind: 'design_specification',
          summary: 'Reviewed API contract.',
        },
      ],
    },
    completionReport: {
      id: IDS.report,
      completionReportHash: hash('4'),
      taskId: IDS.task,
      taskAssignmentId: IDS.assignment,
      assignmentSnapshotId: IDS.snapshot,
      assignmentSnapshotHash: hash('3'),
      taskContractVersionId: IDS.contract,
      claims: [{ claim: completionClaim, claimHash: hash('6') }],
      criterionResults: [
        {
          id: IDS.criterion,
          completionReportId: IDS.report,
          actualOutcome: 'All acceptance and idempotency scenarios passed.',
          result: 'met',
          explanation: 'Twelve scenarios passed.',
        },
      ],
      evidence: [
        {
          id: IDS.evidence,
          completionReportId: IDS.report,
          evidenceType: 'design_specification',
          accessClassification: 'confidential',
          availability: 'available',
          contentHash: hash('8'),
        },
      ],
      claimEvidenceMappings: [
        {
          completionReportId: IDS.report,
          contributorClaimId: IDS.claim,
          evidenceId: IDS.evidence,
        },
      ],
    },
    observationFacts: [
      {
        observation: reviewObservation,
        observationRevisionId: IDS.observationRevision,
        observationFactId: IDS.observationFact,
        revisionHash: hash('7'),
      },
    ],
    reviewHash: hash('5'),
    taskType: 'feature_development',
    businessDomain: 'commerce',
    problemCategory: 'api_design',
    collaborationType: 'cross_functional',
    complexity: {
      summary: 'Cross-service API semantics',
      factors: ['failure recovery', 'idempotency'],
      novelty: 'new_domain_flow',
      risk: 'high',
    },
    keyDecisions: ['Use idempotency keys at callback boundaries.'],
    technology: ['AdonisJS', 'OpenAPI', 'PostgreSQL'],
    verification: {
      method: 'design_and_code_review',
      confidenceScore: 0.92,
      verifiedAt: '2026-08-01T09:05:00.000Z',
    },
    initialVisibility: 'internal',
    capabilityProjection: null,
    ...overrides,
  }
}

function dependencies(
  sourceFact: GovernedAccomplishmentProjectionSource,
  transactions?: AccomplishmentTransactionRunner
) {
  const writes: CreateVerifiedAccomplishmentAggregateInput[] = []
  const seenTransactions: { source?: object; writer?: object } = {}
  const writer: VerifiedAccomplishmentWriter = {
    createOrLoad(input, transaction) {
      writes.push(input)
      if (transaction) seenTransactions.writer = transaction
      const head = input.lifecycleRevisions.at(-1)
      if (!head) throw new Error('missing lifecycle head')
      return Promise.resolve({
        inserted: writes.length === 1,
        accomplishmentId: input.accomplishment.id,
        projectionKey: input.projectionKey,
        canonicalHash: input.accomplishment.canonicalHash as TvaSha256,
        lifecycleState: input.accomplishment.lifecycleState,
        lifecycleRevisionId: head.id,
        lifecycleSequence: head.sequence,
      })
    },
  }
  return {
    writes,
    seenTransactions,
    dependencies: {
      sources: {
        load: (
          _identity: GovernedAccomplishmentProjectionSourceIdentity,
          transaction?: AccomplishmentTransaction
        ) => {
          if (transaction) seenTransactions.source = transaction
          return Promise.resolve(sourceFact)
        },
      },
      writer,
      hasher: new NodeAccomplishmentContentHasher(),
      ...(transactions ? { transactions } : {}),
    },
  }
}

test.group('Unit | Project verified accomplishment command', () => {
  test('builds one deterministic canonical aggregate from exact governed facts', async ({
    assert,
  }) => {
    const sourceFact = source()
    const harness = dependencies(sourceFact)
    const command = new ProjectVerifiedAccomplishmentCommand(harness.dependencies)

    const first = await command.execute(sourceFact.identity)
    await command.execute(sourceFact.identity)

    assert.lengthOf(harness.writes, 2)
    assert.equal(harness.writes[0]?.projectionKey, harness.writes[1]?.projectionKey)
    assert.equal(harness.writes[0]?.accomplishment.id, harness.writes[1]?.accomplishment.id)
    assert.equal(
      harness.writes[0]?.accomplishment.canonicalHash,
      harness.writes[1]?.accomplishment.canonicalHash
    )
    assert.equal(first.accomplishmentId, harness.writes[0]?.accomplishment.id)
    assert.equal(harness.writes[0]?.accomplishment.title, claim().proposedTitle)
    assert.equal(harness.writes[0]?.accomplishment.action, claim().action)
    assert.equal(harness.writes[0]?.accomplishment.ownershipLevel, 'primary_owner')
    assert.deepEqual(harness.writes[0]?.accomplishment.provenance.completionClaimIds, [
      IDS.claim,
    ])
    assert.lengthOf(harness.writes[0]?.lifecycleRevisions ?? [], 3)
  })

  test('reads governed facts and writes the aggregate through one transaction handle', async ({
    assert,
  }) => {
    const transaction = {}
    const runner: AccomplishmentTransactionRunner = {
      run: (work) => work(transaction),
    }
    const sourceFact = source()
    const harness = dependencies(sourceFact, runner)
    const command = new ProjectVerifiedAccomplishmentCommand(harness.dependencies)

    await command.execute(sourceFact.identity)

    assert.strictEqual(harness.seenTransactions.source, transaction)
    assert.strictEqual(harness.seenTransactions.writer, transaction)
  })

  test('does not write when profile eligibility or dispute governance blocks projection', async ({
    assert,
  }) => {
    const blocked = source({
      gateInput: { ...source().gateInput, profileEligible: false, unresolvedDispute: true },
    })
    const harness = dependencies(blocked)
    const command = new ProjectVerifiedAccomplishmentCommand(harness.dependencies)

    let error: unknown
    try {
      await command.execute(blocked.identity)
    } catch (cause) {
      error = cause
    }
    assert.instanceOf(error, ProjectVerifiedAccomplishmentBlockedError)
    assert.include(
      (error as ProjectVerifiedAccomplishmentBlockedError).blockerCodes,
      PROJECT_VERIFIED_ACCOMPLISHMENT_CODES.gateBlocked
    )
    assert.lengthOf(harness.writes, 0)
  })

  test('fails closed when normalized observation provenance is incomplete', async ({ assert }) => {
    const incomplete = source({ observationFacts: [] })
    const harness = dependencies(incomplete)
    const command = new ProjectVerifiedAccomplishmentCommand(harness.dependencies)

    let error: unknown
    try {
      await command.execute(incomplete.identity)
    } catch (cause) {
      error = cause
    }
    assert.instanceOf(error, ProjectVerifiedAccomplishmentBlockedError)
    assert.include(
      (error as ProjectVerifiedAccomplishmentBlockedError).blockerCodes,
      PROJECT_VERIFIED_ACCOMPLISHMENT_CODES.observationProvenanceMismatch
    )
    assert.lengthOf(harness.writes, 0)
  })

  test('keeps review aggregate hash distinct from the review-finalized event hash', async ({
    assert,
  }) => {
    const sourceFact = source({
      reviewHash: hash('9'),
      gateInput: { ...source().gateInput, reviewHash: hash('9') },
    })
    const harness = dependencies(sourceFact)
    const command = new ProjectVerifiedAccomplishmentCommand(harness.dependencies)

    await command.execute(sourceFact.identity)

    const write = harness.writes[0]
    assert.equal(write?.accomplishment.provenance.sourceHashes.review, hash('9'))
    assert.equal(write?.lifecycleRevisions.at(-1)?.sourceFact.hash, hash('5'))
  })

  test('rejects a source bundle whose gate and immutable requirement hashes diverge', async ({
    assert,
  }) => {
    const mismatched = source({
      requirementContext: {
        ...source().requirementContext,
        taskSpecificationHash: hash('f'),
      },
    })
    const harness = dependencies(mismatched)
    const command = new ProjectVerifiedAccomplishmentCommand(harness.dependencies)

    let error: unknown
    try {
      await command.execute(mismatched.identity)
    } catch (cause) {
      error = cause
    }
    assert.instanceOf(error, ProjectVerifiedAccomplishmentBlockedError)
    assert.include(
      (error as ProjectVerifiedAccomplishmentBlockedError).blockerCodes,
      PROJECT_VERIFIED_ACCOMPLISHMENT_CODES.sourceIdentityMismatch
    )
    assert.lengthOf(harness.writes, 0)
  })

  test('rejects a duplicated gate claim that differs from the governed report claim', async ({
    assert,
  }) => {
    const foreignSubject = id(99)
    const gateObservation = {
      ...observation(),
      subjectUserId: foreignSubject,
    }
    const mismatched = source({
      gateInput: {
        ...source().gateInput,
        claim: { ...claim(), userId: foreignSubject },
        observations: [
          {
            observation: gateObservation,
            revisionHash: hash('7'),
            evidenceSufficiency: 'adequate',
          },
        ],
      },
    })
    const harness = dependencies(mismatched)
    const command = new ProjectVerifiedAccomplishmentCommand(harness.dependencies)

    let error: unknown
    try {
      await command.execute(mismatched.identity)
    } catch (cause) {
      error = cause
    }
    assert.instanceOf(error, ProjectVerifiedAccomplishmentBlockedError)
    assert.include(
      (error as ProjectVerifiedAccomplishmentBlockedError).blockerCodes,
      PROJECT_VERIFIED_ACCOMPLISHMENT_CODES.sourceIdentityMismatch
    )
    assert.lengthOf(harness.writes, 0)
  })

  test('rejects normalized observation facts whose content differs from the gated observation', async ({
    assert,
  }) => {
    const mismatched = source({
      observationFacts: [
        {
          observation: {
            ...observation(),
            reviewerId: id(98),
            reviewerType: 'ai_assistant',
          },
          observationRevisionId: IDS.observationRevision,
          observationFactId: IDS.observationFact,
          revisionHash: hash('7'),
        },
      ],
    })
    const harness = dependencies(mismatched)
    const command = new ProjectVerifiedAccomplishmentCommand(harness.dependencies)

    let error: unknown
    try {
      await command.execute(mismatched.identity)
    } catch (cause) {
      error = cause
    }
    assert.instanceOf(error, ProjectVerifiedAccomplishmentBlockedError)
    assert.include(
      (error as ProjectVerifiedAccomplishmentBlockedError).blockerCodes,
      PROJECT_VERIFIED_ACCOMPLISHMENT_CODES.observationProvenanceMismatch
    )
    assert.lengthOf(harness.writes, 0)
  })

  test('preserves structured reported outcomes and truthful criterion result semantics', async ({
    assert,
  }) => {
    const completionClaim = {
      ...claim(),
      outcomeData: {
        productionErrorsBefore: 18,
        productionErrorsAfter: 7,
        observationWindowDays: 14,
      },
    }
    const sourceFact = source({
      gateInput: { ...source().gateInput, claim: completionClaim },
      completionReport: {
        ...source().completionReport,
        claims: [{ claim: completionClaim, claimHash: hash('6') }],
        criterionResults: [
          {
            id: IDS.criterion,
            completionReportId: IDS.report,
            actualOutcome: 'The target error rate was not fully reached.',
            result: 'not_met',
            explanation: 'Errors fell, but remained above the agreed threshold.',
          },
        ],
      },
    })
    const harness = dependencies(sourceFact)
    const command = new ProjectVerifiedAccomplishmentCommand(harness.dependencies)

    await command.execute(sourceFact.identity)

    const accomplishment = harness.writes[0]?.accomplishment as
      | (CreateVerifiedAccomplishmentAggregateInput['accomplishment'] & {
          reportedOutcomeData: Record<string, unknown>
          outcomes: Array<
            CreateVerifiedAccomplishmentAggregateInput['accomplishment']['outcomes'][number] & {
              result: string
              explanation: string
            }
          >
        })
      | undefined
    assert.deepEqual(accomplishment?.reportedOutcomeData, completionClaim.outcomeData)
    assert.equal(accomplishment?.outcomes[0]?.result, 'not_met')
    assert.equal(
      accomplishment?.outcomes[0]?.explanation,
      'Errors fell, but remained above the agreed threshold.'
    )
  })

  test('never widens a confidential claim to internal visibility during projection', async ({
    assert,
  }) => {
    const sourceFact = source({ initialVisibility: 'internal' })
    const harness = dependencies(sourceFact)
    const command = new ProjectVerifiedAccomplishmentCommand(harness.dependencies)

    await command.execute(sourceFact.identity)

    assert.equal(harness.writes[0]?.accomplishment.visibility, 'private')
    assert.isTrue(
      harness.writes[0]?.lifecycleRevisions.every(({ visibility }) => visibility === 'private')
    )
  })

  test('derives verification method, confidence and time from pinned human observations', async ({
    assert,
  }) => {
    const sourceFact = source({
      verification: {
        method: 'untrusted_client_label',
        confidenceScore: 1,
        verifiedAt: '2099-01-01T00:00:00.000Z',
      },
    })
    const harness = dependencies(sourceFact)
    const command = new ProjectVerifiedAccomplishmentCommand(harness.dependencies)

    await command.execute(sourceFact.identity)

    const accomplishment = harness.writes[0]?.accomplishment
    assert.equal(accomplishment?.verification.method, 'governed_human_review')
    assert.equal(accomplishment?.verification.confidenceScore, observation().confidence)
    assert.equal(accomplishment?.verification.verifiedAt, observation().finalizedAt)
    assert.equal(
      harness.writes[0]?.lifecycleRevisions.at(-1)?.occurredAt,
      observation().finalizedAt
    )
  })
})
