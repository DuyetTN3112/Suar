export const TASK_TO_ACCOMPLISHMENT_CONTRACT_LIMITS = Object.freeze({
  maxJsonDepth: 24,
  maxJsonNodes: 20_000,
  maxStringLength: 262_144,
})

export const TVA_SCHEMA_VERSIONS = Object.freeze({
  projectContextVersion: 'suar.project_context_version.v1',
  workPackage: 'suar.work_package.v1',
  workPackageVersion: 'suar.work_package_version.v1',
  taskSpecificationVersion: 'suar.task_specification_version.v1',
  taskContractVersion: 'suar.task_contract_version.v1',
  resolvedTaskContract: 'suar.resolved_task_contract.v1',
  taskAssignmentSnapshot: 'suar.task_assignment_snapshot.v1',
  completionClaim: 'suar.completion_claim.v1',
  reviewObservation: 'suar.review_observation.v1',
  legacyTaskSubmission: 'suar.legacy_task_submission.v1',
} as const)

export const TVA_PRIVACY_CLASSIFICATIONS = [
  'private',
  'internal',
  'confidential',
  'redacted',
  'public_safe',
  'public',
] as const

export const TVA_CHANGE_CLASSES = [
  'initial',
  'editorial',
  'clarification',
  'material_scope',
  'acceptance',
  'evidence',
  'ownership',
  'deadline_priority',
  'retrospective',
] as const

export const TVA_CONFIRMATION_STATES = ['draft', 'creator_confirmed'] as const
export const TVA_WORK_PACKAGE_STATES = ['active', 'archived'] as const

export const TVA_WORK_READINESS_STATES = [
  'draft',
  'needs_clarification',
  'ready_to_assign',
  'locked_at_assignment',
  'change_pending_acknowledgement',
] as const

export const TVA_EVIDENCE_READINESS_STATES = [
  'not_configured',
  'not_applicable',
  'needs_clarification',
  'evidence_ready',
  'locked_at_assignment',
  'retrospective',
  'frozen',
  'verified',
] as const

export const TVA_TASK_CONTRACT_READINESS_STATES = [
  'draft',
  'needs_clarification',
  'ready_to_assign',
  'locked_at_assignment',
  'change_pending_acknowledgement',
] as const

export const TVA_READINESS_SEVERITIES = ['warning', 'blocker'] as const
export const TVA_EVIDENCE_MODES = ['operational_only', 'evidence_enabled'] as const

export const TVA_REFERENCE_TYPES = [
  'url',
  'file',
  'image',
  'diagram',
  'document',
  'repository',
  'design',
  'other',
] as const

export const TVA_REFERENCE_ACCESS_STATES = [
  'available',
  'authenticated',
  'restricted',
  'unavailable',
  'unknown',
] as const

export const TVA_REFERENCE_RELATIONS = [
  'background',
  'requirement_source',
  'design_asset',
  'delivery_target',
  'evidence',
] as const

export const TVA_OWNERSHIP_LEVELS = [
  'contributor',
  'shared_owner',
  'primary_owner',
  'lead',
] as const

export const TVA_AUTONOMY_LEVELS = ['guided', 'supervised', 'independent', 'leads_others'] as const
export const TVA_COLLABORATION_TYPES = ['individual', 'pair', 'team', 'cross_functional'] as const

export const TVA_CRITERION_RESULTS = ['met', 'partially_met', 'not_met', 'not_applicable'] as const

export const TVA_CLAIM_STATUSES = [
  'candidate',
  'under_review',
  'partially_verified',
  'verified',
  'rejected',
  'frozen',
  'superseded',
  'revoked',
] as const

export const TVA_REVIEW_OBSERVATION_TYPES = [
  'contract_fulfillment',
  'accomplishment_claim',
  'ownership',
  'capability',
  'quality',
  'delivery',
] as const

export const TVA_REVIEW_DISPOSITIONS = [
  'confirm',
  'refine',
  'narrow',
  'partially_verify',
  'reject',
  'request_evidence',
  'flag_conflict',
] as const

export const TVA_GOVERNANCE_STATES = [
  'draft',
  'final',
  'disputed',
  'frozen',
  'superseded',
  'revoked',
] as const

export const TVA_PROVENANCE_CLASSES = [
  'native_prework',
  'retrospective',
  'legacy_unverified',
] as const

export type TvaSchemaVersion = (typeof TVA_SCHEMA_VERSIONS)[keyof typeof TVA_SCHEMA_VERSIONS]
export type TvaPrivacyClassification = (typeof TVA_PRIVACY_CLASSIFICATIONS)[number]
export type TvaChangeClass = (typeof TVA_CHANGE_CLASSES)[number]
export type TvaConfirmationState = (typeof TVA_CONFIRMATION_STATES)[number]
export type TvaWorkPackageState = (typeof TVA_WORK_PACKAGE_STATES)[number]
export type TvaWorkReadinessState = (typeof TVA_WORK_READINESS_STATES)[number]
export type TvaEvidenceReadinessState = (typeof TVA_EVIDENCE_READINESS_STATES)[number]
export type TvaTaskContractReadinessState = (typeof TVA_TASK_CONTRACT_READINESS_STATES)[number]
export type TvaReadinessSeverity = (typeof TVA_READINESS_SEVERITIES)[number]
export type TvaEvidenceMode = (typeof TVA_EVIDENCE_MODES)[number]
export type TvaReferenceType = (typeof TVA_REFERENCE_TYPES)[number]
export type TvaReferenceAccessState = (typeof TVA_REFERENCE_ACCESS_STATES)[number]
export type TvaReferenceRelation = (typeof TVA_REFERENCE_RELATIONS)[number]
export type TvaOwnershipLevel = (typeof TVA_OWNERSHIP_LEVELS)[number]
export type TvaAutonomyLevel = (typeof TVA_AUTONOMY_LEVELS)[number]
export type TvaCollaborationType = (typeof TVA_COLLABORATION_TYPES)[number]
export type TvaCriterionResult = (typeof TVA_CRITERION_RESULTS)[number]
export type TvaClaimStatus = (typeof TVA_CLAIM_STATUSES)[number]
export type TvaReviewObservationType = (typeof TVA_REVIEW_OBSERVATION_TYPES)[number]
export type TvaReviewDisposition = (typeof TVA_REVIEW_DISPOSITIONS)[number]
export type TvaGovernanceState = (typeof TVA_GOVERNANCE_STATES)[number]
export type TvaProvenanceClass = (typeof TVA_PROVENANCE_CLASSES)[number]

export type TvaUuid = string
export type TvaIsoTimestamp = string
export type TvaSha256 = `sha256:${string}`

export type TvaJsonPrimitive = string | number | boolean | null
export type TvaJsonValue =
  | TvaJsonPrimitive
  | readonly TvaJsonValue[]
  | { readonly [key: string]: TvaJsonValue }
export type TvaJsonObject = { readonly [key: string]: TvaJsonValue }

export interface TvaSourceProvenanceV1 {
  readonly class: TvaProvenanceClass
  readonly sourceType: 'authored' | 'pasted' | 'uploaded' | 'authorized_import' | 'legacy'
  readonly sourceReferenceIds: readonly TvaUuid[]
  readonly confirmedBy: TvaUuid | null
  readonly confirmedAt: TvaIsoTimestamp | null
}
