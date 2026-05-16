import type { AccomplishmentContentHasher } from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import type { GovernedCapabilityObservationSource } from '#modules/accomplishments/domain/verified-work/capability_signal_projection_rules'
import type {
  AccomplishmentCompletionReportFacts,
  ImmutableAccomplishmentRequirementContext,
} from '#modules/accomplishments/domain/verified-work/verified_accomplishment_content_derivation'
import type { VerifiedAccomplishmentGateInput } from '#modules/accomplishments/domain/verified-work/verified_accomplishment_projection_rules'
import type { ReviewObservationV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'

export const GOVERNED_ACCOMPLISHMENT_SOURCE_CODES = Object.freeze({
  identityMismatch: 'TVA.ACCOMPLISHMENT.SOURCE.IDENTITY_MISMATCH',
  observationProvenanceMismatch:
    'TVA.ACCOMPLISHMENT.SOURCE.OBSERVATION_PROVENANCE_MISMATCH',
} as const)

export type GovernedAccomplishmentSourceCode =
  (typeof GOVERNED_ACCOMPLISHMENT_SOURCE_CODES)[keyof typeof GOVERNED_ACCOMPLISHMENT_SOURCE_CODES]

export interface AccomplishmentProjectionSourceIdentity {
  readonly reviewWorkflowId: string
  readonly completionClaimId: string
  readonly reviewFinalizedFactId: string
  readonly reviewFinalizedFactHash: TvaSha256
  readonly projectionPolicyVersion: string
}

export interface GovernedAccomplishmentObservationFact {
  readonly observation: ReviewObservationV1
  readonly observationRevisionId: string
  readonly observationFactId: string
  readonly revisionHash: TvaSha256
}

export interface GovernedAccomplishmentProjectionSourceRuleInput {
  readonly requestedIdentity: AccomplishmentProjectionSourceIdentity
  readonly loadedIdentity: AccomplishmentProjectionSourceIdentity
  readonly reviewHash: TvaSha256
  readonly gate: VerifiedAccomplishmentGateInput
  readonly governedClaimRef: {
    readonly claimId: string
    readonly claimHash: TvaSha256
    readonly subjectUserId: string
  }
  readonly requirementContext: ImmutableAccomplishmentRequirementContext
  readonly completionReport: AccomplishmentCompletionReportFacts
  readonly observationFacts: readonly GovernedAccomplishmentObservationFact[]
  readonly capabilityObservations: readonly GovernedCapabilityObservationSource[]
}

export interface GovernedAccomplishmentProjectionSourcePassed {
  readonly allowed: true
  readonly blockerCodes: readonly []
  readonly observationReferences: readonly { readonly id: string; readonly hash: TvaSha256 }[]
  readonly observationFacts: readonly GovernedAccomplishmentObservationFact[]
}

export interface GovernedAccomplishmentProjectionSourceBlocked {
  readonly allowed: false
  readonly blockerCodes: readonly GovernedAccomplishmentSourceCode[]
}

export type GovernedAccomplishmentProjectionSourceResult =
  | GovernedAccomplishmentProjectionSourcePassed
  | GovernedAccomplishmentProjectionSourceBlocked

function identitiesMatch(
  requested: AccomplishmentProjectionSourceIdentity,
  loaded: AccomplishmentProjectionSourceIdentity
): boolean {
  return (
    requested.reviewWorkflowId === loaded.reviewWorkflowId &&
    requested.completionClaimId === loaded.completionClaimId &&
    requested.reviewFinalizedFactId === loaded.reviewFinalizedFactId &&
    requested.reviewFinalizedFactHash === loaded.reviewFinalizedFactHash &&
    requested.projectionPolicyVersion === loaded.projectionPolicyVersion
  )
}

function immutableBoundaryMatches(
  input: GovernedAccomplishmentProjectionSourceRuleInput,
  hasher: AccomplishmentContentHasher
): boolean {
  const { gate, requirementContext: context, completionReport: report } = input
  const governedClaim = report.claims.find(
    ({ claim }) => claim.id === input.governedClaimRef.claimId
  )
  return (
    identitiesMatch(input.requestedIdentity, input.loadedIdentity) &&
    input.loadedIdentity.reviewWorkflowId === gate.reviewWorkflowId &&
    input.loadedIdentity.completionClaimId === gate.claim.id &&
    gate.reviewHash === input.reviewHash &&
    governedClaim !== undefined &&
    gate.claim.id === governedClaim.claim.id &&
    gate.claimHash === governedClaim.claimHash &&
    gate.claimHash === input.governedClaimRef.claimHash &&
    gate.claim.userId === input.governedClaimRef.subjectUserId &&
    governedClaim.claim.userId === input.governedClaimRef.subjectUserId &&
    hasher.hash({ claim: gate.claim }) === hasher.hash({ claim: governedClaim.claim }) &&
    gate.taskAssignmentId === context.taskAssignmentId &&
    gate.assignmentSnapshotId === context.assignmentSnapshotId &&
    gate.assignmentSnapshotHash === context.assignmentSnapshotHash &&
    gate.taskSpecificationVersionId === context.taskSpecificationVersionId &&
    gate.taskSpecificationHash === context.taskSpecificationHash &&
    gate.taskContractVersionId === context.taskContractVersionId &&
    gate.taskContractHash === context.taskContractHash &&
    gate.completionReportId === report.id &&
    gate.completionReportHash === report.completionReportHash &&
    gate.taskAssignmentId === report.taskAssignmentId &&
    gate.assignmentSnapshotId === report.assignmentSnapshotId &&
    gate.assignmentSnapshotHash === report.assignmentSnapshotHash &&
    gate.taskContractVersionId === report.taskContractVersionId
  )
}

function observationReferences(
  input: GovernedAccomplishmentProjectionSourceRuleInput
): { id: string; hash: TvaSha256 }[] | null {
  const references = input.gate.observations.map(({ observation, revisionHash }) => ({
    id: observation.id,
    hash: revisionHash,
  }))
  for (const capability of input.capabilityObservations) {
    references.push({ id: capability.observation.id, hash: capability.revisionHash })
  }
  const byId = new Map<string, TvaSha256>()
  for (const reference of references) {
    const existing = byId.get(reference.id)
    if (existing && existing !== reference.hash) return null
    byId.set(reference.id, reference.hash)
  }
  return [...byId]
    .map(([id, hash]) => ({ id, hash }))
    .sort((left, right) => left.id.localeCompare(right.id))
}

function exactObservationFacts(
  input: GovernedAccomplishmentProjectionSourceRuleInput,
  references: readonly { readonly id: string; readonly hash: TvaSha256 }[],
  hasher: AccomplishmentContentHasher
): GovernedAccomplishmentObservationFact[] | null {
  const facts = [...input.observationFacts].sort((left, right) =>
    left.observation.id.localeCompare(right.observation.id)
  )
  const sourceObservations = [...input.gate.observations, ...input.capabilityObservations]
  const expectedObservationById = new Map<
    string,
    { observation: ReviewObservationV1; revisionHash: TvaSha256 }
  >()
  for (const candidate of sourceObservations) {
    const existing = expectedObservationById.get(candidate.observation.id)
    if (
      existing &&
      (existing.revisionHash !== candidate.revisionHash ||
        hasher.hash({ observation: existing.observation }) !==
          hasher.hash({ observation: candidate.observation }))
    ) {
      return null
    }
    expectedObservationById.set(candidate.observation.id, candidate)
  }
  if (
    facts.length !== references.length ||
    new Set(facts.map(({ observation }) => observation.id)).size !== facts.length ||
    facts.some((fact, index) => {
      const reference = references[index]
      const expectedObservation = expectedObservationById.get(fact.observation.id)
      return (
        !reference ||
        !expectedObservation ||
        fact.observation.id !== reference.id ||
        fact.revisionHash !== reference.hash ||
        fact.observation.reviewWorkflowId !== input.loadedIdentity.reviewWorkflowId ||
        hasher.hash({ observation: fact.observation }) !==
          hasher.hash({ observation: expectedObservation.observation })
      )
    })
  ) {
    return null
  }
  return facts
}

export function evaluateGovernedAccomplishmentProjectionSource(
  input: GovernedAccomplishmentProjectionSourceRuleInput,
  hasher: AccomplishmentContentHasher
): GovernedAccomplishmentProjectionSourceResult {
  if (!immutableBoundaryMatches(input, hasher)) {
    return {
      allowed: false,
      blockerCodes: [GOVERNED_ACCOMPLISHMENT_SOURCE_CODES.identityMismatch],
    }
  }
  const references = observationReferences(input)
  if (!references) {
    return {
      allowed: false,
      blockerCodes: [GOVERNED_ACCOMPLISHMENT_SOURCE_CODES.observationProvenanceMismatch],
    }
  }
  const facts = exactObservationFacts(input, references, hasher)
  if (!facts) {
    return {
      allowed: false,
      blockerCodes: [GOVERNED_ACCOMPLISHMENT_SOURCE_CODES.observationProvenanceMismatch],
    }
  }
  return {
    allowed: true,
    blockerCodes: [],
    observationReferences: references,
    observationFacts: facts,
  }
}
