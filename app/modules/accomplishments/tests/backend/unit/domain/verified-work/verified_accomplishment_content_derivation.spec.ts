import { test } from '@japa/runner'

import {
  VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES,
  deriveVerifiedAccomplishmentContent,
  type VerifiedAccomplishmentDerivationInput,
} from '#modules/accomplishments/domain/verified-work/verified_accomplishment_content_derivation'
import type { VerifiedAccomplishmentGatePassed } from '#modules/accomplishments/domain/verified-work/verified_accomplishment_projection_rules'
import type { CompletionClaimV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'

const id = (suffix: number) => `30000000-0000-4000-8000-${suffix.toString().padStart(12, '0')}`
const hash = (character: string) => `sha256:${character.repeat(64)}` as const

const IDS = {
  task: id(1),
  assignment: id(2),
  snapshot: id(3),
  specification: id(4),
  contract: id(5),
  report: id(6),
  subject: id(7),
  otherContributor: id(8),
  claim: id(9),
  otherClaim: id(10),
  deliverable: id(11),
  otherDeliverable: id(12),
  criterionResult: id(13),
  otherCriterionResult: id(14),
  evidence: id(15),
  otherEvidence: id(16),
  observation: id(17),
  reviewer: id(18),
} as const

function claim(overrides: Partial<CompletionClaimV1> = {}): CompletionClaimV1 {
  return {
    schemaVersion: 'suar.completion_claim.v1',
    id: IDS.claim,
    completionReportId: IDS.report,
    completionReportRevision: 2,
    completionReportHash: hash('4'),
    assignmentSnapshotId: IDS.snapshot,
    taskContractVersionId: IDS.contract,
    userId: IDS.subject,
    action: 'designed',
    object: 'pre-order-api',
    proposedTitle: 'Designed a pre-order API',
    proposedStatement: 'Designed the pre-order API and its failure semantics.',
    actualRole: 'backend-engineer',
    actualOwnership: 'primary_owner',
    actualAutonomy: 'independent',
    contributionStatement: 'Owned the API contract and incorporated review feedback.',
    deliverableRefs: [IDS.deliverable],
    criterionResultRefs: [IDS.criterionResult],
    evidenceRefs: [IDS.evidence],
    outcomeData: { acceptanceScenariosPassed: 12, rollout: { status: 'stable' } },
    publicClaimDraft: null,
    privacyClassification: 'internal',
    status: 'under_review',
    createdAt: '2026-08-01T08:00:00.000Z',
    ...overrides,
  }
}

function gate(overrides: Partial<VerifiedAccomplishmentGatePassed> = {}): VerifiedAccomplishmentGatePassed {
  return {
    allowed: true,
    blockerCodes: [],
    lifecycleState: 'verified',
    action: 'designed',
    object: 'pre-order-api',
    ownershipLevel: 'primary_owner',
    deliverableIds: [IDS.deliverable],
    criterionResultIds: [IDS.criterionResult],
    evidenceIds: [IDS.evidence],
    reviewObservationIds: [IDS.observation],
    reviewObservationHashes: [hash('7')],
    reviewerReferences: [{ reviewerId: IDS.reviewer, reviewerRole: 'backend-lead' }],
    ...overrides,
  }
}

function input(
  overrides: Partial<VerifiedAccomplishmentDerivationInput> = {}
): VerifiedAccomplishmentDerivationInput {
  const targetClaim = claim()
  const otherClaim = claim({
    id: IDS.otherClaim,
    userId: IDS.otherContributor,
    proposedTitle: 'Implemented the pre-order UI',
    proposedStatement: 'Implemented a different contributor\'s UI work.',
    contributionStatement: 'Implemented the UI.',
    deliverableRefs: [IDS.otherDeliverable],
    criterionResultRefs: [IDS.otherCriterionResult],
    evidenceRefs: [IDS.otherEvidence],
    outcomeData: { uiReleased: true },
  })

  return {
    gate: gate(),
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
      systemArea: 'order-service',
      environment: 'production',
      scaleSummary: 'Multi-service transaction flow',
      constraints: [
        { id: id(51), description: 'payment callback idempotency' },
        { id: id(50), description: 'inventory reservation consistency' },
      ],
      deliverables: [
        {
          id: IDS.otherDeliverable,
          title: 'Pre-order UI',
          kind: 'frontend-implementation',
          summary: 'Requirement context for the UI deliverable.',
        },
        {
          id: IDS.deliverable,
          title: 'OpenAPI specification',
          kind: 'design-specification',
          summary: 'Requirement context used only to label the claimed deliverable.',
        },
      ],
    },
    report: {
      id: IDS.report,
      completionReportHash: hash('4'),
      taskId: IDS.task,
      taskAssignmentId: IDS.assignment,
      assignmentSnapshotId: IDS.snapshot,
      assignmentSnapshotHash: hash('3'),
      taskContractVersionId: IDS.contract,
      claims: [
        { claim: otherClaim, claimHash: hash('9') },
        { claim: targetClaim, claimHash: hash('6') },
      ],
      criterionResults: [
        {
          id: IDS.otherCriterionResult,
          completionReportId: IDS.report,
          actualOutcome: 'The other contributor completed the UI flow.',
          result: 'met',
          explanation: 'Separate contribution.',
        },
        {
          id: IDS.criterionResult,
          completionReportId: IDS.report,
          actualOutcome: 'Twelve idempotency and failure-path scenarios passed.',
          result: 'met',
          explanation: 'Verified by integration and contract review.',
        },
      ],
      evidence: [
        {
          id: IDS.otherEvidence,
          completionReportId: IDS.report,
          evidenceType: 'ui-screenshot',
          accessClassification: 'internal',
          availability: 'available',
          contentHash: hash('b'),
        },
        {
          id: IDS.evidence,
          completionReportId: IDS.report,
          evidenceType: 'design-specification',
          accessClassification: 'confidential',
          availability: 'available',
          contentHash: hash('a'),
        },
      ],
      claimEvidenceMappings: [
        {
          completionReportId: IDS.report,
          contributorClaimId: IDS.otherClaim,
          evidenceId: IDS.otherEvidence,
        },
        {
          completionReportId: IDS.report,
          contributorClaimId: IDS.claim,
          evidenceId: IDS.evidence,
        },
      ],
    },
    ...overrides,
  }
}

test.group('Unit | Verified accomplishment content derivation', () => {
  test('derives asserted work only from the governed claim and actual report facts', ({ assert }) => {
    const result = deriveVerifiedAccomplishmentContent(input())

    assert.isTrue(result.allowed)
    if (!result.allowed) return
    assert.equal(result.content.action, 'designed')
    assert.equal(result.content.object, 'pre-order-api')
    assert.equal(result.content.ownershipLevel, 'primary_owner')
    assert.equal(result.content.title, 'Designed a pre-order API')
    assert.equal(
      result.content.outcomes[0]?.statement,
      'Twelve idempotency and failure-path scenarios passed.'
    )
    assert.notInclude(result.content.conciseStatement, 'desired outcome')
    assert.deepEqual(result.content.reportedOutcomeData, {
      acceptanceScenariosPassed: 12,
      rollout: { status: 'stable' },
    })
  })

  test('isolates one contributor and excludes facts claimed by another contributor', ({ assert }) => {
    const result = deriveVerifiedAccomplishmentContent(input())

    assert.isTrue(result.allowed)
    if (!result.allowed) return
    assert.equal(result.content.userId, IDS.subject)
    assert.deepEqual(
      result.content.deliverables.map((deliverable) => deliverable.deliverableRef),
      [IDS.deliverable]
    )
    assert.deepEqual(
      result.content.outcomes.map((outcome) => outcome.outcomeRef),
      [IDS.criterionResult]
    )
    assert.deepEqual(
      result.content.evidenceReferences.map((evidence) => evidence.evidenceId),
      [IDS.evidence]
    )
    assert.notInclude(JSON.stringify(result.content), IDS.otherContributor)
    assert.notInclude(JSON.stringify(result.content), 'different contributor')
  })

  test('does not read a mutable current task title into accomplishment content', ({ assert }) => {
    const firstInput: VerifiedAccomplishmentDerivationInput & { currentTaskTitle: string } = {
      ...input(),
      currentTaskTitle: 'Old mutable task title',
    }
    const secondInput: VerifiedAccomplishmentDerivationInput & { currentTaskTitle: string } = {
      ...input(),
      currentTaskTitle: 'Renamed mutable task title after completion',
    }
    const first = deriveVerifiedAccomplishmentContent(firstInput)
    const second = deriveVerifiedAccomplishmentContent(secondInput)

    assert.deepEqual(first, second)
    assert.isTrue(first.allowed)
    if (!first.allowed) return
    assert.equal(first.content.title, 'Designed a pre-order API')
    assert.notInclude(JSON.stringify(first.content), 'mutable task title')
  })

  test('returns deterministic arrays and canonical JSON regardless of source row order', ({
    assert,
  }) => {
    const original = input({
      gate: gate({
        reviewObservationIds: [id(30), IDS.observation],
        reviewObservationHashes: [hash('8'), hash('7')],
        reviewerReferences: [
          { reviewerId: id(31), reviewerRole: 'architect' },
          { reviewerId: IDS.reviewer, reviewerRole: 'backend-lead' },
        ],
      }),
    })
    const reversed = {
      ...original,
      requirementContext: {
        ...original.requirementContext,
        constraints: [...original.requirementContext.constraints].reverse(),
        deliverables: [...original.requirementContext.deliverables].reverse(),
      },
      report: {
        ...original.report,
        claims: [...original.report.claims].reverse(),
        criterionResults: [...original.report.criterionResults].reverse(),
        evidence: [...original.report.evidence].reverse(),
        claimEvidenceMappings: [...original.report.claimEvidenceMappings].reverse(),
      },
    }

    assert.deepEqual(
      deriveVerifiedAccomplishmentContent(original),
      deriveVerifiedAccomplishmentContent(reversed)
    )
  })

  test('blocks missing exact claim child refs instead of silently dropping them', ({ assert }) => {
    const base = input()
    const result = deriveVerifiedAccomplishmentContent({
      ...base,
      report: { ...base.report, criterionResults: [] },
    })

    assert.isFalse(result.allowed)
    if (result.allowed) return
    assert.include(
      result.blockerCodes,
      VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES.criterionResultRefMissing
    )
  })

  test('blocks missing deliverable definitions and evidence facts independently', ({ assert }) => {
    const base = input()
    const result = deriveVerifiedAccomplishmentContent({
      ...base,
      requirementContext: { ...base.requirementContext, deliverables: [] },
      report: { ...base.report, evidence: [] },
    })

    assert.isFalse(result.allowed)
    if (result.allowed) return
    assert.include(
      result.blockerCodes,
      VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES.deliverableRefMissing
    )
    assert.include(
      result.blockerCodes,
      VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES.evidenceRefMissing
    )
  })

  test('blocks foreign report children and missing contributor evidence attribution', ({ assert }) => {
    const base = input()
    const result = deriveVerifiedAccomplishmentContent({
      ...base,
      report: {
        ...base.report,
        evidence: base.report.evidence.map((evidence) =>
          evidence.id === IDS.evidence ? { ...evidence, completionReportId: id(99) } : evidence
        ),
        claimEvidenceMappings: base.report.claimEvidenceMappings.filter(
          (mapping) => mapping.contributorClaimId !== IDS.claim
        ),
      },
    })

    assert.isFalse(result.allowed)
    if (result.allowed) return
    assert.include(
      result.blockerCodes,
      VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES.sourceProvenanceMismatch
    )
    assert.include(
      result.blockerCodes,
      VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES.claimEvidenceMappingMissing
    )
  })

  test('blocks a forged gate boundary that widens the exact target claim', ({ assert }) => {
    const result = deriveVerifiedAccomplishmentContent(
      input({
        gate: gate({
          action: 'implemented-and-operated',
          deliverableIds: [IDS.deliverable, IDS.otherDeliverable],
        }),
      })
    )

    assert.isFalse(result.allowed)
    if (result.allowed) return
    assert.include(
      result.blockerCodes,
      VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES.gateBoundaryMismatch
    )
  })

  test('binds the gate to the exact claim hash and contributor identity', ({ assert }) => {
    const result = deriveVerifiedAccomplishmentContent(
      input({
        governedClaimRef: {
          claimId: IDS.claim,
          claimHash: hash('f'),
          subjectUserId: IDS.otherContributor,
        },
      })
    )

    assert.isFalse(result.allowed)
    if (result.allowed) return
    assert.include(
      result.blockerCodes,
      VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES.sourceProvenanceMismatch
    )
  })
})
