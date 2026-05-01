import type { GovernedAccomplishmentProjectionSource } from '#modules/accomplishments/actions/ports/outbound/verified-work/governed_accomplishment_projection_source_reader'
import type { CreateVerifiedAccomplishmentAggregateInput } from '#modules/accomplishments/actions/ports/outbound/verified-work/verified_accomplishment_writer'
import {
  deterministicUuidFromSha256,
  hashVerifiedAccomplishmentPayload,
  type AccomplishmentContentHasher,
  type AccomplishmentProjectionIdentity,
} from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import type { GovernedCapabilitySignalProjection } from '#modules/accomplishments/domain/verified-work/capability_signal_projection_rules'
import type { DerivedAccomplishmentContent } from '#modules/accomplishments/domain/verified-work/verified_accomplishment_content_derivation'
import type { VerifiedAccomplishmentGatePassed } from '#modules/accomplishments/domain/verified-work/verified_accomplishment_projection_rules'
import type { AccomplishmentLifecycleRevisionV1 } from '#modules/accomplishments/public_contracts/lifecycle/accomplishment_lifecycle_v1'
import {
  parseVerifiedWorkAccomplishmentV1,
  type VerifiedWorkAccomplishmentV1,
} from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import type { TvaJsonObject } from '#modules/tasks/public_contracts/task-authoring/primitives'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

export interface MapVerifiedAccomplishmentAggregateInput {
  readonly source: GovernedAccomplishmentProjectionSource
  readonly gate: VerifiedAccomplishmentGatePassed
  readonly content: DerivedAccomplishmentContent
  readonly projectionIdentity: AccomplishmentProjectionIdentity
  readonly observationIds: readonly string[]
  readonly observationFacts: GovernedAccomplishmentProjectionSource['observationFacts']
  readonly signals: readonly GovernedCapabilitySignalProjection[]
  readonly hasher: AccomplishmentContentHasher
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort()
}

function confidenceBand(score: number | null): 'low' | 'medium' | 'high' {
  if (score !== null && score >= 0.8) return 'high'
  if (score !== null && score >= 0.5) return 'medium'
  return 'low'
}

function privacyBoundInitialVisibility(
  source: GovernedAccomplishmentProjectionSource
): GovernedAccomplishmentProjectionSource['initialVisibility'] {
  return ['private', 'confidential', 'redacted'].includes(
    source.gateInput.claim.privacyClassification
  )
    ? 'private'
    : source.initialVisibility
}

interface GovernedVerificationFacts {
  readonly method: 'governed_human_review'
  readonly confidenceScore: number | null
  readonly verifiedAt: string
}

function governedVerificationFacts(
  gate: VerifiedAccomplishmentGatePassed,
  source: GovernedAccomplishmentProjectionSource
): GovernedVerificationFacts {
  const verifying = source.observationFacts.filter(({ observation }) =>
    gate.reviewObservationIds.includes(observation.id)
  )
  const finalizedAt = verifying
    .map(({ observation }) => observation.finalizedAt)
    .filter((value): value is string => value !== null)
    .sort()
    .at(-1)
  if (!finalizedAt || verifying.length !== gate.reviewObservationIds.length) {
    throw new InvariantViolationException(
      'Governed accomplishment verification facts are incomplete'
    )
  }
  const confidences = verifying.map(({ observation }) => observation.confidence)
  return {
    method: 'governed_human_review',
    confidenceScore: confidences.some((confidence) => confidence === null)
      ? null
      : Math.min(...(confidences as number[])),
    verifiedAt: finalizedAt,
  }
}

function lifecycleRevisionId(
  projectionKey: string,
  sequence: number,
  hasher: AccomplishmentContentHasher
): string {
  return deterministicUuidFromSha256(
    hasher.hash({
      schemaVersion: 'suar.accomplishment_lifecycle_identity.v1',
      projectionKey,
      sequence,
    })
  )
}

function lifecycleRevisions(
  input: MapVerifiedAccomplishmentAggregateInput,
  initialVisibility: GovernedAccomplishmentProjectionSource['initialVisibility'],
  verification: GovernedVerificationFacts
): AccomplishmentLifecycleRevisionV1[] {
  const { source, gate, projectionIdentity, observationFacts, hasher } = input
  const claim = source.gateInput.claim
  const decision = observationFacts.find(({ observation }) =>
    gate.reviewObservationIds.includes(observation.id)
  )
  const reviewerId = gate.reviewerReferences[0]?.reviewerId
  if (!decision || !reviewerId) {
    throw new InvariantViolationException(
      'Governed accomplishment lifecycle source facts are incomplete'
    )
  }
  const common = {
    contractVersion: 1 as const,
    accomplishmentId: projectionIdentity.accomplishmentId,
    visibility: initialVisibility,
    policyVersion: source.identity.projectionPolicyVersion,
    supersedesRevisionId: null,
    relatedAccomplishmentId: null,
  }
  return [
    {
      ...common,
      id: lifecycleRevisionId(projectionIdentity.projectionKey, 1, hasher),
      sequence: 1,
      previousState: null,
      nextState: 'candidate',
      reasonCode: 'candidate_created',
      sourceFact: {
        id: claim.id,
        type: 'completion_claim',
        hash: source.governedClaimRef.claimHash,
      },
      actor: { type: 'system', userId: null },
      occurredAt: claim.createdAt,
    },
    {
      ...common,
      id: lifecycleRevisionId(projectionIdentity.projectionKey, 2, hasher),
      sequence: 2,
      previousState: 'candidate',
      nextState: 'under_review',
      reasonCode: 'review_started',
      sourceFact: {
        id: decision.observationFactId,
        type: 'review_observation',
        hash: decision.revisionHash,
      },
      actor: { type: 'user', userId: reviewerId },
      occurredAt: decision.observation.createdAt,
    },
    {
      ...common,
      id: lifecycleRevisionId(projectionIdentity.projectionKey, 3, hasher),
      sequence: 3,
      previousState: 'under_review',
      nextState: gate.lifecycleState,
      reasonCode:
        gate.lifecycleState === 'verified'
          ? 'verification_completed'
          : 'partial_verification_completed',
      sourceFact: {
        id: source.identity.reviewFinalizedFactId,
        type: 'review_finalized',
        hash: source.identity.reviewFinalizedFactHash,
      },
      actor: { type: 'user', userId: reviewerId },
      occurredAt: verification.verifiedAt,
    },
  ]
}

function canonicalAccomplishment(
  input: MapVerifiedAccomplishmentAggregateInput,
  initialVisibility: GovernedAccomplishmentProjectionSource['initialVisibility'],
  verification: GovernedVerificationFacts
): VerifiedWorkAccomplishmentV1 {
  const { source, gate, content, projectionIdentity, observationIds, signals, hasher } = input
  const withoutHash: VerifiedWorkAccomplishmentV1 = {
    contractVersion: 1,
    id: projectionIdentity.accomplishmentId,
    userId: content.userId,
    organizationId: source.organizationId,
    projectId: source.projectId,
    taskId: content.taskId,
    taskAssignmentId: content.taskAssignmentId,
    title: content.title,
    conciseStatement: content.conciseStatement,
    detailedStatement: content.detailedStatement,
    action: content.action,
    object: content.object,
    taskType: source.taskType,
    businessDomain: source.businessDomain,
    problemCategory: source.problemCategory,
    role: content.role,
    ownershipLevel: content.ownershipLevel,
    autonomyLevel: content.autonomyLevel,
    collaborationType: source.collaborationType,
    context: {
      businessContext: content.context.businessContext,
      systemArea: content.context.systemArea,
      environment: content.context.environment,
      scaleSummary: content.context.scaleSummary,
      constraints: [...content.context.constraints],
    },
    complexity: {
      ...source.complexity,
      factors: sortedUnique(source.complexity.factors),
    },
    deliverables: content.deliverables.map((deliverable) => ({ ...deliverable })),
    outcomes: content.outcomes.map((outcome) => ({
      outcomeRef: outcome.outcomeRef,
      statement: outcome.statement,
      result: outcome.result,
      explanation: outcome.explanation,
      metricName: null,
      metricValue: null,
      metricUnit: null,
      observedAt: verification.verifiedAt,
    })),
    reportedOutcomeData: JSON.parse(
      JSON.stringify(content.reportedOutcomeData)
    ) as VerifiedWorkAccomplishmentV1['reportedOutcomeData'],
    keyDecisions: sortedUnique(source.keyDecisions),
    technology: sortedUnique(source.technology),
    verification: {
      status: gate.lifecycleState,
      method: verification.method,
      confidenceScore: verification.confidenceScore,
      confidenceBand: confidenceBand(verification.confidenceScore),
      evidenceSufficiency: 'adequate',
      reviewerReferences: gate.reviewerReferences.map((reviewer) => ({ ...reviewer })),
      verifiedAt: verification.verifiedAt,
    },
    evidenceReferences: content.evidenceReferences.map((evidence) => ({ ...evidence })),
    capabilitySignalIds: signals.map(({ signal }) => signal.id).sort(),
    lifecycleState: gate.lifecycleState,
    visibility: initialVisibility,
    provenance: {
      provenanceClass: source.provenanceClass,
      projectContextVersionId: source.projectContextVersionId,
      workPackageVersionId: source.workPackageVersionId,
      taskSpecificationVersionId: content.provenance.taskSpecificationVersionId,
      taskContractVersionId: content.provenance.taskContractVersionId,
      assignmentSnapshotId: content.provenance.assignmentSnapshotId,
      completionReportId: content.provenance.completionReportId,
      completionClaimIds: [content.provenance.completionClaimId],
      reviewWorkflowId: source.identity.reviewWorkflowId,
      reviewObservationIds: sortedUnique(observationIds),
      sourceHashes: {
        taskSpecification: content.provenance.taskSpecificationHash,
        taskContract: content.provenance.taskContractHash,
        assignmentSnapshot: content.provenance.assignmentSnapshotHash,
        completionReport: content.provenance.completionReportHash,
        review: source.reviewHash,
      },
      policyVersion: source.identity.projectionPolicyVersion,
      reconstruction: source.reconstruction,
    },
    canonicalHash: `sha256:${'0'.repeat(64)}`,
    createdAt: verification.verifiedAt,
    updatedAt: verification.verifiedAt,
  }
  const canonicalHash = hashVerifiedAccomplishmentPayload(withoutHash, hasher)
  return parseVerifiedWorkAccomplishmentV1({ ...withoutHash, canonicalHash })
}

function observationLinkPayload(
  fact: GovernedAccomplishmentProjectionSource['observationFacts'][number]
): TvaJsonObject {
  return {
    reviewWorkflowId: fact.observation.reviewWorkflowId,
    reviewSessionId: fact.observation.reviewSessionId,
    targetRef: fact.observation.targetRef,
    reviewerId: fact.observation.reviewerId,
    reviewPolicyVersion: fact.observation.reviewPolicyVersion,
  }
}

export function mapVerifiedAccomplishmentAggregate(
  input: MapVerifiedAccomplishmentAggregateInput
): CreateVerifiedAccomplishmentAggregateInput {
  const { source, gate, content, projectionIdentity, signals } = input
  const initialVisibility = privacyBoundInitialVisibility(source)
  const verification = governedVerificationFacts(gate, source)
  const accomplishment = canonicalAccomplishment(input, initialVisibility, verification)
  const claimFact = source.completionReport.claims.find(
    ({ claim }) => claim.id === source.governedClaimRef.claimId
  )
  if (!claimFact) {
    throw new InvariantViolationException('Governed accomplishment claim fact is missing')
  }

  return {
    projectionKey: projectionIdentity.projectionKey,
    accomplishment,
    claimLinks: [
      {
        claim: claimFact.claim,
        projectedClaimStatus: gate.lifecycleState,
        projectedOwnershipLevel: gate.ownershipLevel,
        sourceClaimHash: claimFact.claimHash,
      },
    ],
    evidenceLinks: content.evidenceReferences.map((evidence) => ({
      ...evidence,
      completionClaimId: source.governedClaimRef.claimId,
      evidencePayload: {
        completionReportId: source.completionReport.id,
        completionClaimId: source.governedClaimRef.claimId,
      },
    })),
    reviewObservationLinks: input.observationFacts.map((fact) => ({
      reviewObservationId: fact.observation.id,
      observationRevisionId: fact.observationRevisionId,
      observationFactId: fact.observationFactId,
      observationType: fact.observation.observationType,
      sourceObservationHash: fact.revisionHash,
      disposition: fact.observation.disposition,
      governanceState: fact.observation.governanceState,
      linkPayload: observationLinkPayload(fact),
    })),
    capabilitySignals: signals.map((signal) => ({
      projectionKey: signal.projectionKey,
      signal: signal.signal,
      sourceObservationHash: signal.provenance.observation.revisionHash,
    })),
    lifecycleRevisions: lifecycleRevisions(input, initialVisibility, verification),
  }
}
