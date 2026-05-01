import type {
  AccomplishmentLifecycleStateV1,
} from '#modules/accomplishments/public_contracts/verified-work/accomplishment_contract_primitives_v1'
import type { AccomplishmentPublicProjectionV1 } from '#modules/accomplishments/public_contracts/publication/accomplishment_public_projection_v1'
import type { VerifiedWorkAccomplishmentV1 } from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'

export const ACCOMPLISHMENT_PUBLICATION_CODES = Object.freeze({
  consentRequired: 'TVA.ACCOMPLISHMENT.PUBLICATION.CONSENT_REQUIRED',
  sourceNotVerified: 'TVA.ACCOMPLISHMENT.PUBLICATION.SOURCE_NOT_VERIFIED',
  sourceDisputed: 'TVA.ACCOMPLISHMENT.PUBLICATION.SOURCE_DISPUTED',
  disclosureDenied: 'TVA.ACCOMPLISHMENT.PUBLICATION.DISCLOSURE_DENIED',
  decisionBoundaryMismatch: 'TVA.ACCOMPLISHMENT.PUBLICATION.DECISION_BOUNDARY_MISMATCH',
  decisionIntegrityMismatch: 'TVA.ACCOMPLISHMENT.PUBLICATION.DECISION_INTEGRITY_MISMATCH',
  canonicalIntegrityMismatch: 'TVA.ACCOMPLISHMENT.PUBLICATION.CANONICAL_INTEGRITY_MISMATCH',
  actorNotOwner: 'TVA.ACCOMPLISHMENT.PUBLICATION.ACTOR_NOT_OWNER',
  consentIntegrityMismatch: 'TVA.ACCOMPLISHMENT.PUBLICATION.CONSENT_INTEGRITY_MISMATCH',
  sourcePinMismatch: 'TVA.ACCOMPLISHMENT.PUBLICATION.SOURCE_PIN_MISMATCH',
  wordingNotCanonical: 'TVA.ACCOMPLISHMENT.PUBLICATION.WORDING_NOT_CANONICAL',
  fieldNotCanonical: 'TVA.ACCOMPLISHMENT.PUBLICATION.FIELD_NOT_CANONICAL',
  capabilityNotAllowed: 'TVA.ACCOMPLISHMENT.PUBLICATION.CAPABILITY_NOT_ALLOWED',
  contractInvalid: 'TVA.ACCOMPLISHMENT.PUBLICATION.CONTRACT_INVALID',
} as const)

export type AccomplishmentPublicationCode =
  (typeof ACCOMPLISHMENT_PUBLICATION_CODES)[keyof typeof ACCOMPLISHMENT_PUBLICATION_CODES]

export interface PublicCapabilityDisclosure {
  readonly capabilityId: string
  readonly label: string
  readonly confidenceBand: 'low' | 'medium' | 'high'
}

/**
 * The disclosure policy owns every redactable value in this object. The user request is never
 * allowed to provide these values directly.
 */
export interface ApprovedAccomplishmentPublicContent {
  readonly title: string
  readonly conciseStatement: string
  readonly taskType: string | null
  readonly businessDomain: string | null
  readonly problemCategory: string | null
  readonly role: string | null
  readonly autonomyLevel: AccomplishmentPublicProjectionV1['autonomyLevel']
  readonly collaborationType: AccomplishmentPublicProjectionV1['collaborationType']
  readonly environment: string | null
  readonly systemArea: string | null
  readonly scaleSummary: string | null
  readonly deliverableSummaries: readonly string[]
  readonly outcomeSummaries: readonly string[]
  readonly technology: readonly string[]
  readonly capabilities: readonly PublicCapabilityDisclosure[]
  readonly verificationMethodLabel: string
  readonly reviewerRoleLabels: readonly string[]
  readonly evidenceAvailability: AccomplishmentPublicProjectionV1['verification']['evidenceAvailability']
  readonly redactionState: AccomplishmentPublicProjectionV1['disclosure']['redactionState']
  readonly organizationLabel: string | null
  readonly projectLabel: string | null
}

export interface AuthoritativeAccomplishmentDisclosureDecision {
  readonly decisionId: string
  readonly decisionHash: TvaSha256
  readonly accomplishmentId: string
  readonly subjectUserId: string
  readonly allowed: boolean
  readonly policyVersion: string
  readonly decidedAt: string
  readonly content: ApprovedAccomplishmentPublicContent
}

export interface AuthoritativeAccomplishmentPublicationConsent {
  readonly consentFactId: string
  readonly consentFactHash: TvaSha256
  readonly accomplishmentId: string
  readonly subjectUserId: string
  readonly granted: boolean
  readonly sourceCanonicalHash: TvaSha256
  readonly sourceLifecycleRevisionId: string
  readonly disclosureDecisionId: string
  readonly disclosureDecisionHash: TvaSha256
  readonly disclosurePolicyVersion: string
  readonly consentedAt: string
}

export interface AccomplishmentPublicationGateInput {
  readonly accomplishment: VerifiedWorkAccomplishmentV1
  readonly lifecycleState: AccomplishmentLifecycleStateV1
  readonly hasOpenDispute: boolean
  readonly consent: AuthoritativeAccomplishmentPublicationConsent
  readonly decision: AuthoritativeAccomplishmentDisclosureDecision
  readonly allowedCapabilities: readonly PublicCapabilityDisclosure[]
}

export interface AccomplishmentPublicationGateResult {
  readonly allowed: boolean
  readonly blockerCodes: readonly AccomplishmentPublicationCode[]
}

export type ApprovedPublicProjectionFields = Pick<
  AccomplishmentPublicProjectionV1,
  | 'title'
  | 'conciseStatement'
  | 'action'
  | 'object'
  | 'taskType'
  | 'businessDomain'
  | 'problemCategory'
  | 'role'
  | 'ownershipLevel'
  | 'autonomyLevel'
  | 'collaborationType'
  | 'context'
  | 'deliverableSummaries'
  | 'outcomeSummaries'
  | 'technology'
  | 'capabilities'
>

const VERIFIED_STATES = new Set<AccomplishmentLifecycleStateV1>([
  'verified',
  'partially_verified',
])

export function evaluateAccomplishmentPublicationGate(
  input: AccomplishmentPublicationGateInput
): AccomplishmentPublicationGateResult {
  const blockers = new Set<AccomplishmentPublicationCode>()
  if (!input.consent.granted) {
    blockers.add(ACCOMPLISHMENT_PUBLICATION_CODES.consentRequired)
  }
  if (
    !VERIFIED_STATES.has(input.accomplishment.lifecycleState) ||
    !VERIFIED_STATES.has(input.lifecycleState) ||
    input.accomplishment.lifecycleState !== input.lifecycleState
  ) {
    blockers.add(ACCOMPLISHMENT_PUBLICATION_CODES.sourceNotVerified)
  }
  if (input.hasOpenDispute || input.lifecycleState === 'frozen') {
    blockers.add(ACCOMPLISHMENT_PUBLICATION_CODES.sourceDisputed)
  }
  if (!input.decision.allowed) {
    blockers.add(ACCOMPLISHMENT_PUBLICATION_CODES.disclosureDenied)
  }
  if (
    input.decision.accomplishmentId !== input.accomplishment.id ||
    input.decision.subjectUserId !== input.accomplishment.userId
  ) {
    blockers.add(ACCOMPLISHMENT_PUBLICATION_CODES.decisionBoundaryMismatch)
  }
  if (
    input.consent.accomplishmentId !== input.accomplishment.id ||
    input.consent.subjectUserId !== input.accomplishment.userId ||
    input.consent.sourceCanonicalHash !== input.accomplishment.canonicalHash ||
    input.consent.disclosureDecisionId !== input.decision.decisionId ||
    input.consent.disclosureDecisionHash !== input.decision.decisionHash ||
    input.consent.disclosurePolicyVersion !== input.decision.policyVersion
  ) {
    blockers.add(ACCOMPLISHMENT_PUBLICATION_CODES.consentIntegrityMismatch)
  }
  if (
    input.decision.content.title !== input.accomplishment.title ||
    input.decision.content.conciseStatement !== input.accomplishment.conciseStatement
  ) {
    blockers.add(ACCOMPLISHMENT_PUBLICATION_CODES.wordingNotCanonical)
  }

  const exactOrRedacted = <T>(approved: T | null, canonical: T | null): boolean =>
    approved === null || approved === canonical
  const content = input.decision.content
  if (
    !exactOrRedacted(content.taskType, input.accomplishment.taskType) ||
    !exactOrRedacted(content.businessDomain, input.accomplishment.businessDomain) ||
    !exactOrRedacted(content.problemCategory, input.accomplishment.problemCategory) ||
    !exactOrRedacted(content.role, input.accomplishment.role) ||
    !exactOrRedacted(content.autonomyLevel, input.accomplishment.autonomyLevel) ||
    !exactOrRedacted(content.collaborationType, input.accomplishment.collaborationType) ||
    !exactOrRedacted(content.environment, input.accomplishment.context.environment) ||
    !exactOrRedacted(content.systemArea, input.accomplishment.context.systemArea) ||
    !exactOrRedacted(content.scaleSummary, input.accomplishment.context.scaleSummary) ||
    !content.technology.every((technology) => input.accomplishment.technology.includes(technology)) ||
    !content.deliverableSummaries.every((summary) =>
      input.accomplishment.deliverables.some(
        (deliverable) => deliverable.title === summary || deliverable.summary === summary
      )
    ) ||
    !content.outcomeSummaries.every((summary) =>
      input.accomplishment.outcomes.some((outcome) => outcome.statement === summary)
    )
  ) {
    blockers.add(ACCOMPLISHMENT_PUBLICATION_CODES.fieldNotCanonical)
  }
  const allowedCapabilities = new Map(
    input.allowedCapabilities.map((capability) => [capability.capabilityId, capability])
  )
  if (
    content.capabilities.some((capability) => {
      const allowed = allowedCapabilities.get(capability.capabilityId)
      return (
        !allowed ||
        allowed.label !== capability.label ||
        allowed.confidenceBand !== capability.confidenceBand
      )
    })
  ) {
    blockers.add(ACCOMPLISHMENT_PUBLICATION_CODES.capabilityNotAllowed)
  }
  return { allowed: blockers.size === 0, blockerCodes: [...blockers].sort() }
}

/** Strict allowlist: semantic identity always comes from the canonical verified fact. */
export function deriveApprovedPublicProjectionFields(
  accomplishment: VerifiedWorkAccomplishmentV1,
  decision: AuthoritativeAccomplishmentDisclosureDecision
): ApprovedPublicProjectionFields {
  return {
    title: decision.content.title,
    conciseStatement: decision.content.conciseStatement,
    action: accomplishment.action,
    object: accomplishment.object,
    taskType: decision.content.taskType,
    businessDomain: decision.content.businessDomain,
    problemCategory: decision.content.problemCategory,
    role: decision.content.role,
    ownershipLevel: accomplishment.ownershipLevel,
    autonomyLevel: decision.content.autonomyLevel,
    collaborationType: decision.content.collaborationType,
    context: {
      environment: decision.content.environment,
      systemArea: decision.content.systemArea,
      scaleSummary: decision.content.scaleSummary,
    },
    deliverableSummaries: [...decision.content.deliverableSummaries],
    outcomeSummaries: [...decision.content.outcomeSummaries],
    technology: [...decision.content.technology],
    capabilities: decision.content.capabilities.map((capability) => ({ ...capability })),
  }
}
