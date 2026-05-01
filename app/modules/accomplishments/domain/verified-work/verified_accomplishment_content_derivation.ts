import type {
  VerifiedAccomplishmentGateResult,
  VerifiedAccomplishmentGatePassed,
} from '#modules/accomplishments/domain/verified-work/verified_accomplishment_projection_rules'
import type { CompletionClaimV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import type {
  TvaAutonomyLevel,
  TvaCriterionResult,
  TvaJsonObject,
  TvaJsonValue,
  TvaOwnershipLevel,
  TvaPrivacyClassification,
  TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'

export const VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES = Object.freeze({
  gateNotPassed: 'TVA.ACCOMPLISHMENT.DERIVATION.GATE_NOT_PASSED',
  targetClaimMissing: 'TVA.ACCOMPLISHMENT.DERIVATION.TARGET_CLAIM_MISSING',
  duplicateSourceFact: 'TVA.ACCOMPLISHMENT.DERIVATION.DUPLICATE_SOURCE_FACT',
  sourceProvenanceMismatch: 'TVA.ACCOMPLISHMENT.DERIVATION.SOURCE_PROVENANCE_MISMATCH',
  gateBoundaryMismatch: 'TVA.ACCOMPLISHMENT.DERIVATION.GATE_BOUNDARY_MISMATCH',
  deliverableRefMissing: 'TVA.ACCOMPLISHMENT.DERIVATION.DELIVERABLE_REF_MISSING',
  criterionResultRefMissing:
    'TVA.ACCOMPLISHMENT.DERIVATION.CRITERION_RESULT_REF_MISSING',
  evidenceRefMissing: 'TVA.ACCOMPLISHMENT.DERIVATION.EVIDENCE_REF_MISSING',
  claimEvidenceMappingMissing:
    'TVA.ACCOMPLISHMENT.DERIVATION.CLAIM_EVIDENCE_MAPPING_MISSING',
} as const)

export type VerifiedAccomplishmentDerivationCode =
  (typeof VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES)[keyof typeof VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES]

export interface ImmutableRequirementConstraintContext {
  readonly id: string
  readonly description: string
}

export interface ImmutableRequirementDeliverableContext {
  readonly id: string
  readonly title: string
  readonly kind: string
  readonly summary: string | null
}

export interface ImmutableAccomplishmentRequirementContext {
  readonly taskId: string
  readonly taskAssignmentId: string
  readonly assignmentSnapshotId: string
  readonly assignmentSnapshotHash: TvaSha256
  readonly taskSpecificationVersionId: string
  readonly taskSpecificationHash: TvaSha256
  readonly taskContractVersionId: string
  readonly taskContractHash: TvaSha256
  readonly businessContext: string | null
  readonly systemArea: string | null
  readonly environment: string | null
  readonly scaleSummary: string | null
  readonly constraints: readonly ImmutableRequirementConstraintContext[]
  readonly deliverables: readonly ImmutableRequirementDeliverableContext[]
}

export interface AccomplishmentCompletionClaimFact {
  readonly claim: CompletionClaimV1
  readonly claimHash: TvaSha256
}

export interface AccomplishmentCriterionResultFact {
  readonly id: string
  readonly completionReportId: string
  readonly actualOutcome: string
  readonly result: TvaCriterionResult
  readonly explanation: string
}

export interface AccomplishmentEvidenceFact {
  readonly id: string
  readonly completionReportId: string
  readonly evidenceType: string
  readonly accessClassification: TvaPrivacyClassification
  readonly availability: 'available' | 'partially_available' | 'unavailable' | 'not_disclosed'
  readonly contentHash: TvaSha256 | null
}

export interface AccomplishmentClaimEvidenceMappingFact {
  readonly completionReportId: string
  readonly contributorClaimId: string
  readonly evidenceId: string
}

export interface AccomplishmentCompletionReportFacts {
  readonly id: string
  readonly completionReportHash: TvaSha256
  readonly taskId: string
  readonly taskAssignmentId: string
  readonly assignmentSnapshotId: string
  readonly assignmentSnapshotHash: TvaSha256
  readonly taskContractVersionId: string
  readonly claims: readonly AccomplishmentCompletionClaimFact[]
  readonly criterionResults: readonly AccomplishmentCriterionResultFact[]
  readonly evidence: readonly AccomplishmentEvidenceFact[]
  readonly claimEvidenceMappings: readonly AccomplishmentClaimEvidenceMappingFact[]
}

export interface VerifiedAccomplishmentDerivationInput {
  readonly gate: VerifiedAccomplishmentGateResult
  readonly governedClaimRef: {
    readonly claimId: string
    readonly claimHash: TvaSha256
    readonly subjectUserId: string
  }
  readonly requirementContext: ImmutableAccomplishmentRequirementContext
  readonly report: AccomplishmentCompletionReportFacts
}

export interface DerivedAccomplishmentContent {
  readonly userId: string
  readonly taskId: string
  readonly taskAssignmentId: string
  readonly title: string
  readonly conciseStatement: string
  readonly detailedStatement: string
  readonly action: string
  readonly object: string
  readonly role: string
  readonly ownershipLevel: TvaOwnershipLevel
  readonly autonomyLevel: TvaAutonomyLevel | null
  readonly context: {
    readonly businessContext: string | null
    readonly systemArea: string | null
    readonly environment: string | null
    readonly scaleSummary: string | null
    readonly constraints: readonly string[]
  }
  readonly deliverables: readonly {
    readonly deliverableRef: string
    readonly title: string
    readonly kind: string
    readonly summary: string | null
  }[]
  readonly outcomes: readonly {
    readonly outcomeRef: string
    readonly statement: string
    readonly result: TvaCriterionResult
    readonly explanation: string
  }[]
  readonly reportedOutcomeData: TvaJsonObject
  readonly evidenceReferences: readonly {
    readonly evidenceId: string
    readonly evidenceType: string
    readonly accessClassification: TvaPrivacyClassification
    readonly availability: AccomplishmentEvidenceFact['availability']
    readonly contentHash: TvaSha256 | null
  }[]
  readonly verification: {
    readonly lifecycleState: VerifiedAccomplishmentGatePassed['lifecycleState']
    readonly reviewObservations: readonly {
      readonly observationId: string
      readonly revisionHash: TvaSha256
    }[]
    readonly reviewerReferences: readonly {
      readonly reviewerId: string
      readonly reviewerRole: string
    }[]
  }
  readonly provenance: {
    readonly taskSpecificationVersionId: string
    readonly taskSpecificationHash: TvaSha256
    readonly taskContractVersionId: string
    readonly taskContractHash: TvaSha256
    readonly assignmentSnapshotId: string
    readonly assignmentSnapshotHash: TvaSha256
    readonly completionReportId: string
    readonly completionReportHash: TvaSha256
    readonly completionClaimId: string
    readonly completionClaimHash: TvaSha256
  }
}

export interface VerifiedAccomplishmentDerivationBlocked {
  readonly allowed: false
  readonly blockerCodes: readonly VerifiedAccomplishmentDerivationCode[]
}

export interface VerifiedAccomplishmentDerivationPassed {
  readonly allowed: true
  readonly blockerCodes: readonly []
  readonly content: DerivedAccomplishmentContent
}

export type VerifiedAccomplishmentDerivationResult =
  | VerifiedAccomplishmentDerivationBlocked
  | VerifiedAccomplishmentDerivationPassed

const OWNERSHIP_RANK: Readonly<Record<TvaOwnershipLevel, number>> = {
  contributor: 1,
  shared_owner: 2,
  primary_owner: 3,
  lead: 4,
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length
}

function isSubset(values: readonly string[], allowed: readonly string[]): boolean {
  const allowedSet = new Set(allowed)
  return values.every((value) => allowedSet.has(value))
}

function canonicalizeJson(value: TvaJsonValue): TvaJsonValue {
  if (Array.isArray(value)) return value.map(canonicalizeJson)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalizeJson(child)])
    )
  }
  return value
}

function indexUnique<T extends { readonly id: string }>(
  values: readonly T[],
  blockers: Set<VerifiedAccomplishmentDerivationCode>
): ReadonlyMap<string, T> {
  const result = new Map<string, T>()
  for (const value of values) {
    if (result.has(value.id)) {
      blockers.add(VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES.duplicateSourceFact)
    } else {
      result.set(value.id, value)
    }
  }
  return result
}

function gateBoundaryMatchesClaim(
  gate: VerifiedAccomplishmentGatePassed,
  claim: CompletionClaimV1
): boolean {
  return (
    gate.action === claim.action &&
    gate.object === claim.object &&
    OWNERSHIP_RANK[gate.ownershipLevel] <= OWNERSHIP_RANK[claim.actualOwnership] &&
    isSubset(gate.deliverableIds, claim.deliverableRefs) &&
    isSubset(gate.criterionResultIds, claim.criterionResultRefs) &&
    isSubset(gate.evidenceIds, claim.evidenceRefs) &&
    !hasDuplicates(gate.deliverableIds) &&
    !hasDuplicates(gate.criterionResultIds) &&
    !hasDuplicates(gate.evidenceIds) &&
    gate.reviewObservationIds.length === gate.reviewObservationHashes.length
  )
}

function sourceProvenanceMatches(
  input: VerifiedAccomplishmentDerivationInput,
  claim: CompletionClaimV1
): boolean {
  const { report, requirementContext: context } = input
  return (
    report.id === claim.completionReportId &&
    report.completionReportHash === claim.completionReportHash &&
    report.taskId === context.taskId &&
    report.taskAssignmentId === context.taskAssignmentId &&
    report.assignmentSnapshotId === context.assignmentSnapshotId &&
    report.assignmentSnapshotHash === context.assignmentSnapshotHash &&
    report.taskContractVersionId === context.taskContractVersionId &&
    claim.assignmentSnapshotId === context.assignmentSnapshotId &&
    claim.taskContractVersionId === context.taskContractVersionId &&
    claim.id === input.governedClaimRef.claimId &&
    claim.userId === input.governedClaimRef.subjectUserId
  )
}

export function deriveVerifiedAccomplishmentContent(
  input: VerifiedAccomplishmentDerivationInput
): VerifiedAccomplishmentDerivationResult {
  const blockers = new Set<VerifiedAccomplishmentDerivationCode>()
  if (!input.gate.allowed) {
    return {
      allowed: false,
      blockerCodes: [VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES.gateNotPassed],
    }
  }
  const gate = input.gate
  const claimFacts = input.report.claims.filter(
    ({ claim }) => claim.id === input.governedClaimRef.claimId
  )
  if (claimFacts.length === 0) {
    blockers.add(VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES.targetClaimMissing)
  }
  if (claimFacts.length > 1) {
    blockers.add(VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES.duplicateSourceFact)
  }
  const claimFact = claimFacts[0]
  if (!claimFact) {
    return { allowed: false, blockerCodes: [...blockers].sort() }
  }
  const targetClaim = claimFact.claim

  if (
    !sourceProvenanceMatches(input, targetClaim) ||
    claimFact.claimHash !== input.governedClaimRef.claimHash
  ) {
    blockers.add(VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES.sourceProvenanceMismatch)
  }
  if (!gateBoundaryMatchesClaim(gate, targetClaim)) {
    blockers.add(VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES.gateBoundaryMismatch)
  }

  const deliverablesById = indexUnique(input.requirementContext.deliverables, blockers)
  indexUnique(input.requirementContext.constraints, blockers)
  const criterionResultsById = indexUnique(input.report.criterionResults, blockers)
  const evidenceById = indexUnique(input.report.evidence, blockers)

  const deliverables = [...gate.deliverableIds]
    .sort()
    .map((deliverableId) => {
      const deliverable = deliverablesById.get(deliverableId)
      if (!deliverable) {
        blockers.add(VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES.deliverableRefMissing)
      }
      return deliverable
    })
    .filter((value): value is ImmutableRequirementDeliverableContext => value !== undefined)

  const criterionResults = [...gate.criterionResultIds]
    .sort()
    .map((criterionResultId) => {
      const result = criterionResultsById.get(criterionResultId)
      if (!result) {
        blockers.add(VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES.criterionResultRefMissing)
      } else if (result.completionReportId !== input.report.id) {
        blockers.add(VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES.sourceProvenanceMismatch)
      }
      return result
    })
    .filter((value): value is AccomplishmentCriterionResultFact => value !== undefined)

  const evidence = [...gate.evidenceIds]
    .sort()
    .map((evidenceId) => {
      const fact = evidenceById.get(evidenceId)
      if (!fact) {
        blockers.add(VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES.evidenceRefMissing)
      } else if (fact.completionReportId !== input.report.id) {
        blockers.add(VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES.sourceProvenanceMismatch)
      }
      const mappings = input.report.claimEvidenceMappings.filter(
        (mapping) =>
          mapping.contributorClaimId === targetClaim.id && mapping.evidenceId === evidenceId
      )
      if (mappings.length === 0) {
        blockers.add(VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES.claimEvidenceMappingMissing)
      }
      if (mappings.length > 1) {
        blockers.add(VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES.duplicateSourceFact)
      }
      if (mappings.some((mapping) => mapping.completionReportId !== input.report.id)) {
        blockers.add(VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES.sourceProvenanceMismatch)
      }
      return fact
    })
    .filter((value): value is AccomplishmentEvidenceFact => value !== undefined)

  if (blockers.size > 0) {
    return { allowed: false, blockerCodes: [...blockers].sort() }
  }

  const reviewObservations = gate.reviewObservationIds
    .flatMap((observationId, index) => {
      const revisionHash = gate.reviewObservationHashes[index]
      return revisionHash ? [{ observationId, revisionHash }] : []
    })
    .sort((left, right) => left.observationId.localeCompare(right.observationId))
  const reviewerReferences = [...gate.reviewerReferences].sort(
    (left, right) =>
      left.reviewerId.localeCompare(right.reviewerId) ||
      left.reviewerRole.localeCompare(right.reviewerRole)
  )

  return {
    allowed: true,
    blockerCodes: [],
    content: {
      userId: targetClaim.userId,
      taskId: input.requirementContext.taskId,
      taskAssignmentId: input.requirementContext.taskAssignmentId,
      title: targetClaim.proposedTitle,
      conciseStatement: targetClaim.proposedStatement,
      detailedStatement: targetClaim.contributionStatement,
      action: gate.action,
      object: gate.object,
      role: targetClaim.actualRole,
      ownershipLevel: gate.ownershipLevel,
      autonomyLevel: targetClaim.actualAutonomy,
      context: {
        businessContext: input.requirementContext.businessContext,
        systemArea: input.requirementContext.systemArea,
        environment: input.requirementContext.environment,
        scaleSummary: input.requirementContext.scaleSummary,
        constraints: [...input.requirementContext.constraints]
          .sort((left, right) => left.id.localeCompare(right.id))
          .map(({ description }) => description),
      },
      deliverables: deliverables.map((deliverable) => ({
        deliverableRef: deliverable.id,
        title: deliverable.title,
        kind: deliverable.kind,
        summary: deliverable.summary,
      })),
      outcomes: criterionResults.map((result) => ({
        outcomeRef: result.id,
        statement: result.actualOutcome,
        result: result.result,
        explanation: result.explanation,
      })),
      reportedOutcomeData: canonicalizeJson(targetClaim.outcomeData) as TvaJsonObject,
      evidenceReferences: evidence.map((fact) => ({
        evidenceId: fact.id,
        evidenceType: fact.evidenceType,
        accessClassification: fact.accessClassification,
        availability: fact.availability,
        contentHash: fact.contentHash,
      })),
      verification: {
        lifecycleState: gate.lifecycleState,
        reviewObservations,
        reviewerReferences,
      },
      provenance: {
        taskSpecificationVersionId: input.requirementContext.taskSpecificationVersionId,
        taskSpecificationHash: input.requirementContext.taskSpecificationHash,
        taskContractVersionId: input.requirementContext.taskContractVersionId,
        taskContractHash: input.requirementContext.taskContractHash,
        assignmentSnapshotId: input.requirementContext.assignmentSnapshotId,
        assignmentSnapshotHash: input.requirementContext.assignmentSnapshotHash,
        completionReportId: input.report.id,
        completionReportHash: input.report.completionReportHash,
        completionClaimId: targetClaim.id,
        completionClaimHash: claimFact.claimHash,
      },
    },
  }
}
