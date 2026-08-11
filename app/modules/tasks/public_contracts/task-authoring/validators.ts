import {
  TASK_TO_ACCOMPLISHMENT_CONTRACT_LIMITS,
  TVA_AUTONOMY_LEVELS,
  TVA_CHANGE_CLASSES,
  TVA_CLAIM_STATUSES,
  TVA_COLLABORATION_TYPES,
  TVA_CONFIRMATION_STATES,
  TVA_EVIDENCE_MODES,
  TVA_EVIDENCE_READINESS_STATES,
  TVA_GOVERNANCE_STATES,
  TVA_OWNERSHIP_LEVELS,
  TVA_PRIVACY_CLASSIFICATIONS,
  TVA_PROVENANCE_CLASSES,
  TVA_READINESS_SEVERITIES,
  TVA_REFERENCE_ACCESS_STATES,
  TVA_REFERENCE_RELATIONS,
  TVA_REFERENCE_TYPES,
  TVA_REVIEW_DISPOSITIONS,
  TVA_REVIEW_OBSERVATION_TYPES,
  TVA_SCHEMA_VERSIONS,
  TVA_TASK_CONTRACT_READINESS_STATES,
  TVA_WORK_PACKAGE_STATES,
  TVA_WORK_READINESS_STATES,
  type TvaJsonValue,
  type TvaSourceProvenanceV1,
} from './primitives.js'
import type {
  ResolvedTaskContractV1,
  TaskAcceptanceCriterionV1,
  TaskAssignmentSnapshotV1,
  TaskCapabilityRequirementV1,
  TaskContractListItemV1,
  TaskContractVersionV1,
  TaskDeliverableV1,
  TaskDependencyV1,
  TaskEvidenceContractV1,
  TaskEvidenceRequirementV1,
  TaskReadinessFindingV1,
  TaskReadinessResultV1,
  TaskSpecificationSectionV1,
  TaskSpecificationVersionV1,
  TaskSupportingReferenceV1,
  TaskVerifierPolicyV1,
  TaskWorkContractV1,
} from './task_contracts.js'

import type {
  ProjectContextVersionV1,
  WorkPackageV1,
  WorkPackageVersionV1,
} from '#modules/projects/public_contracts/project-context/task_to_accomplishment_project_contracts'
import type {
  CompletionClaimV1,
  LegacyTaskSubmissionV1,
  ReviewObservationV1,
} from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import { METADATA_KNOWLEDGE_STATES } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_diagnostics'
import {
  ASSIGNMENT_PROVENANCE_VALUES,
  ASSIGNMENT_REVIEW_STATES,
} from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_term_contracts'

type UnknownRecord = Record<string, unknown>

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const hasOwn = (value: UnknownRecord, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key)

const isString = (value: unknown): value is string => typeof value === 'string'
const isNonEmptyString = (value: unknown): value is string =>
  isString(value) && value.trim().length > 0
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'
const isNullableString = (value: unknown): value is string | null =>
  value === null || isString(value)
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)
const isPositiveInteger = (value: unknown): value is number =>
  Number.isInteger(value) && isFiniteNumber(value) && value > 0
const isNonNegativeInteger = (value: unknown): value is number =>
  Number.isInteger(value) && isFiniteNumber(value) && value >= 0
const isNullableNonNegativeNumber = (value: unknown): value is number | null =>
  value === null || (isFiniteNumber(value) && value >= 0)
const isNullableConfidence = (value: unknown): value is number | null =>
  value === null || (isFiniteNumber(value) && value >= 0 && value <= 1)

const isOneOf = <T extends string>(value: unknown, allowed: readonly T[]): value is T =>
  isString(value) && allowed.includes(value as T)

const isUuid = (value: unknown): value is string => isString(value) && UUID_PATTERN.test(value)
const isNullableUuid = (value: unknown): value is string | null => value === null || isUuid(value)
const isIsoTimestamp = (value: unknown): value is string =>
  isString(value) && ISO_TIMESTAMP_PATTERN.test(value) && !Number.isNaN(Date.parse(value))
const isNullableIsoTimestamp = (value: unknown): value is string | null =>
  value === null || isIsoTimestamp(value)
const isSha256 = (value: unknown): value is `sha256:${string}` =>
  isString(value) && SHA256_PATTERN.test(value)
const isNullableSha256 = (value: unknown): value is `sha256:${string}` | null =>
  value === null || isSha256(value)

function isArrayOf<T>(
  value: unknown,
  guard: (entry: unknown) => entry is T
): value is readonly T[]
function isArrayOf(value: unknown, guard: (entry: unknown) => boolean): value is readonly unknown[]
function isArrayOf<T>(
  value: unknown,
  guard: (entry: unknown) => boolean
): value is readonly T[] {
  return Array.isArray(value) && value.every((entry) => guard(entry))
}

const isStringArray = (value: unknown): value is readonly string[] => isArrayOf(value, isString)
const isUuidArray = (value: unknown): value is readonly string[] => isArrayOf(value, isUuid)

const hasUniqueStrings = (values: readonly string[]): boolean =>
  new Set(values).size === values.length

const hasUniqueIds = (values: readonly { readonly id: string }[]): boolean =>
  hasUniqueStrings(values.map((value) => value.id))

const TAXONOMY_DIAGNOSTIC_SEVERITIES = ['info', 'warning', 'error'] as const
const TAXONOMY_DIAGNOSTIC_CODES = [
  'active_term_has_replacement',
  'alias_collision',
  'ambiguous_alias',
  'canonical_ref_changed',
  'confidence_out_of_range',
  'cross_namespace_parent',
  'cross_namespace_replacement',
  'duplicate_ref',
  'duplicate_term_ref',
  'graph_cycle',
  'invalid_alias',
  'invalid_alias_kind',
  'invalid_alias_review_state',
  'invalid_assignment_provenance',
  'invalid_assignment_review_state',
  'invalid_label',
  'invalid_merge_replacement',
  'invalid_namespace',
  'invalid_term_id',
  'invalid_term_status',
  'invalid_validity_timestamp',
  'invalid_version',
  'merged_identity_reused',
  'missing_assignment_field',
  'missing_label',
  'orphan_parent',
  'orphan_replacement',
  'self_replacement',
  'invalid_replacement_target',
  'retired_identity_reused',
  'validity_window_inverted',
  'version_not_advanced',
] as const

export function isTvaJsonValue(value: unknown): value is TvaJsonValue {
  const seen = new WeakSet<object>()
  let nodes = 0

  const visit = (entry: unknown, depth: number): boolean => {
    nodes += 1
    if (
      nodes > TASK_TO_ACCOMPLISHMENT_CONTRACT_LIMITS.maxJsonNodes ||
      depth > TASK_TO_ACCOMPLISHMENT_CONTRACT_LIMITS.maxJsonDepth
    ) {
      return false
    }

    if (entry === null || typeof entry === 'boolean') {
      return true
    }
    if (typeof entry === 'string') {
      return entry.length <= TASK_TO_ACCOMPLISHMENT_CONTRACT_LIMITS.maxStringLength
    }
    if (typeof entry === 'number') {
      return Number.isFinite(entry)
    }
    if (typeof entry !== 'object') {
      return false
    }
    if (seen.has(entry)) {
      return false
    }
    seen.add(entry)

    if (Array.isArray(entry)) {
      return entry.every((child) => visit(child, depth + 1))
    }
    if (
      Object.getPrototypeOf(entry) !== Object.prototype &&
      Object.getPrototypeOf(entry) !== null
    ) {
      return false
    }
    return Object.values(entry).every((child) => visit(child, depth + 1))
  }

  return visit(value, 0)
}

const isJsonObject = (value: unknown): value is Record<string, TvaJsonValue> =>
  isRecord(value) && isTvaJsonValue(value)

const hasSchemaVersion = (value: UnknownRecord, schemaVersion: string): boolean =>
  value['schemaVersion'] === schemaVersion

const hasOptionalNullableString = (value: UnknownRecord, key: string): boolean =>
  !hasOwn(value, key) || isNullableString(value[key])

const isSourceProvenanceV1 = (value: unknown): value is TvaSourceProvenanceV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    isOneOf(value['class'], TVA_PROVENANCE_CLASSES) &&
    isOneOf(value['sourceType'], [
      'authored',
      'pasted',
      'uploaded',
      'authorized_import',
      'legacy',
    ] as const) &&
    isUuidArray(value['sourceReferenceIds']) &&
    hasUniqueStrings(value['sourceReferenceIds']) &&
    isNullableUuid(value['confirmedBy']) &&
    isNullableIsoTimestamp(value['confirmedAt'])
  )
}

export const isProjectContextVersionV1 = (value: unknown): value is ProjectContextVersionV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    hasSchemaVersion(value, TVA_SCHEMA_VERSIONS.projectContextVersion) &&
    isUuid(value['id']) &&
    isUuid(value['organizationId']) &&
    isUuid(value['projectId']) &&
    isPositiveInteger(value['versionNumber']) &&
    isNonEmptyString(value['title']) &&
    isString(value['summary']) &&
    isTvaJsonValue(value['richContent']) &&
    isString(value['plainTextProjection']) &&
    isJsonObject(value['structuredDefaults']) &&
    isIsoTimestamp(value['activeFrom']) &&
    isNullableIsoTimestamp(value['retiredAt']) &&
    isUuid(value['createdBy']) &&
    isNullableUuid(value['confirmedBy']) &&
    isOneOf(value['changeClass'], TVA_CHANGE_CLASSES) &&
    hasOptionalNullableString(value, 'changeReason') &&
    isOneOf(value['privacyClassification'], TVA_PRIVACY_CLASSIFICATIONS) &&
    isSha256(value['contentHash']) &&
    isSourceProvenanceV1(value['sourceProvenance']) &&
    isIsoTimestamp(value['createdAt'])
  )
}

export const isWorkPackageV1 = (value: unknown): value is WorkPackageV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    hasSchemaVersion(value, TVA_SCHEMA_VERSIONS.workPackage) &&
    isUuid(value['id']) &&
    isUuid(value['organizationId']) &&
    isUuid(value['projectId']) &&
    isNonEmptyString(value['key']) &&
    isNonEmptyString(value['title']) &&
    isString(value['summary']) &&
    isOneOf(value['state'], TVA_WORK_PACKAGE_STATES) &&
    isNullableUuid(value['activeVersionId']) &&
    isUuid(value['createdBy']) &&
    isIsoTimestamp(value['createdAt']) &&
    isNullableIsoTimestamp(value['archivedAt'])
  )
}

export const isWorkPackageVersionV1 = (value: unknown): value is WorkPackageVersionV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    hasSchemaVersion(value, TVA_SCHEMA_VERSIONS.workPackageVersion) &&
    isUuid(value['id']) &&
    isUuid(value['workPackageId']) &&
    isUuid(value['projectId']) &&
    isNullableUuid(value['projectContextVersionId']) &&
    isPositiveInteger(value['versionNumber']) &&
    isNonEmptyString(value['title']) &&
    isString(value['summary']) &&
    isTvaJsonValue(value['richContent']) &&
    isString(value['plainTextProjection']) &&
    isJsonObject(value['structuredOverrides']) &&
    isUuid(value['authorId']) &&
    isNullableUuid(value['confirmedBy']) &&
    isOneOf(value['changeClass'], TVA_CHANGE_CLASSES) &&
    hasOptionalNullableString(value, 'changeReason') &&
    isOneOf(value['privacyClassification'], TVA_PRIVACY_CLASSIFICATIONS) &&
    isSha256(value['contentHash']) &&
    isSourceProvenanceV1(value['sourceProvenance']) &&
    isIsoTimestamp(value['createdAt'])
  )
}

const isTaskSpecificationSectionV1 = (value: unknown): value is TaskSpecificationSectionV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    isUuid(value['id']) &&
    isNonEmptyString(value['key']) &&
    isNonEmptyString(value['title']) &&
    isString(value['plainText']) &&
    isBoolean(value['critical']) &&
    isBoolean(value['hasTextEquivalent'])
  )
}

export const isTaskSpecificationVersionV1 = (
  value: unknown
): value is TaskSpecificationVersionV1 => {
  if (!isRecord(value)) {
    return false
  }
  if (!isArrayOf(value['sectionIndex'], isTaskSpecificationSectionV1)) {
    return false
  }
  return (
    hasSchemaVersion(value, TVA_SCHEMA_VERSIONS.taskSpecificationVersion) &&
    isUuid(value['id']) &&
    isUuid(value['taskId']) &&
    isPositiveInteger(value['versionNumber']) &&
    isTvaJsonValue(value['richContent']) &&
    isString(value['plainTextProjection']) &&
    hasUniqueIds(value['sectionIndex']) &&
    isNullableUuid(value['projectContextVersionId']) &&
    isNullableUuid(value['workPackageVersionId']) &&
    isUuid(value['authorId']) &&
    isOneOf(value['confirmationState'], TVA_CONFIRMATION_STATES) &&
    isSha256(value['contentHash']) &&
    isOneOf(value['changeClass'], TVA_CHANGE_CLASSES) &&
    hasOptionalNullableString(value, 'changeReason') &&
    isSourceProvenanceV1(value['sourceProvenance']) &&
    isIsoTimestamp(value['createdAt'])
  )
}

const isTaskContractListItemV1 = (value: unknown): value is TaskContractListItemV1 => {
  if (!isRecord(value)) {
    return false
  }
  return isUuid(value['id']) && isNonEmptyString(value['title']) && isString(value['description'])
}

const isTaskDeliverableV1 = (value: unknown): value is TaskDeliverableV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    isTaskContractListItemV1(value) &&
    isNullableString(value['expectedFormat']) &&
    isNullableString(value['expectedLocation'])
  )
}

const isTaskAcceptanceCriterionV1 = (value: unknown): value is TaskAcceptanceCriterionV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    isUuid(value['id']) &&
    isNonEmptyString(value['statement']) &&
    isNonEmptyString(value['verificationMethod']) &&
    isBoolean(value['critical'])
  )
}

const isTaskDependencyV1 = (value: unknown): value is TaskDependencyV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    isTaskContractListItemV1(value) &&
    isNullableUuid(value['ownerId']) &&
    isNonEmptyString(value['state'])
  )
}

const isTaskWorkContractV1 = (value: unknown): value is TaskWorkContractV1 => {
  if (!isRecord(value)) {
    return false
  }
  const itemCollections: Array<readonly TaskContractListItemV1[]> = []
  for (const key of ['scope', 'outOfScope', 'qualityRequirements', 'constraints'] as const) {
    const collection = value[key]
    if (!isArrayOf(collection, isTaskContractListItemV1) || !hasUniqueIds(collection)) {
      return false
    }
    itemCollections.push(collection)
  }
  if (
    !isArrayOf(value['deliverables'], isTaskDeliverableV1) ||
    !hasUniqueIds(value['deliverables'])
  ) {
    return false
  }
  if (
    !isArrayOf(value['acceptanceCriteria'], isTaskAcceptanceCriterionV1) ||
    !hasUniqueIds(value['acceptanceCriteria'])
  ) {
    return false
  }
  if (
    !isArrayOf(value['dependencies'], isTaskDependencyV1) ||
    !hasUniqueIds(value['dependencies'])
  ) {
    return false
  }
  return (
    isNonEmptyString(value['action']) &&
    isNonEmptyString(value['object']) &&
    isString(value['problemStatement']) &&
    isString(value['desiredOutcome']) &&
    itemCollections.length === 4 &&
    isNonEmptyString(value['roleInTask']) &&
    isOneOf(value['ownershipLevel'], TVA_OWNERSHIP_LEVELS) &&
    (value['autonomyLevel'] === null || isOneOf(value['autonomyLevel'], TVA_AUTONOMY_LEVELS)) &&
    (value['collaborationType'] === null ||
      isOneOf(value['collaborationType'], TVA_COLLABORATION_TYPES)) &&
    isNullableString(value['environment']) &&
    isJsonObject(value['complexityContext']) &&
    isJsonObject(value['impactScope']) &&
    isNullableNonNegativeNumber(value['estimatedUsersAffected']) &&
    isNullableIsoTimestamp(value['dueAt'])
  )
}

const isTaskEvidenceRequirementV1 = (value: unknown): value is TaskEvidenceRequirementV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    isUuid(value['id']) &&
    isNonEmptyString(value['type']) &&
    isNonEmptyString(value['title']) &&
    isString(value['description']) &&
    isUuidArray(value['criterionIds']) &&
    hasUniqueStrings(value['criterionIds']) &&
    isUuidArray(value['deliverableIds']) &&
    hasUniqueStrings(value['deliverableIds']) &&
    isBoolean(value['required']) &&
    isOneOf(value['privacyClassification'], TVA_PRIVACY_CLASSIFICATIONS)
  )
}

const isTaskVerifierPolicyV1 = (value: unknown): value is TaskVerifierPolicyV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    isUuidArray(value['reviewerIds']) &&
    hasUniqueStrings(value['reviewerIds']) &&
    isStringArray(value['reviewerRoleCodes']) &&
    hasUniqueStrings(value['reviewerRoleCodes']) &&
    isNonNegativeInteger(value['minimumReviewers']) &&
    isBoolean(value['disallowSelfReview'])
  )
}

const isReviewerVisibility = (value: unknown): value is 'project' | 'internal' | 'external' | 'all' =>
  value === undefined || value === 'project' || value === 'internal' || value === 'external' || value === 'all'

const isTaskCapabilityRequirementV1 = (value: unknown): value is TaskCapabilityRequirementV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    isUuid(value['id']) &&
    isUuid(value['capabilityId']) &&
    isNonEmptyString(value['capabilityName']) &&
    isNullableNonNegativeNumber(value['minimumLevel']) &&
    isNullableNonNegativeNumber(value['targetLevel']) &&
    isNullableNonNegativeNumber(value['assessmentCeiling']) &&
    isNullableUuid(value['rubricVersionId']) &&
    isStringArray(value['observableBehaviours'])
  )
}

const isTaskEvidenceContractV1 = (value: unknown): value is TaskEvidenceContractV1 => {
  if (!isRecord(value)) {
    return false
  }
  if (
    !isArrayOf(value['requirements'], isTaskEvidenceRequirementV1) ||
    !hasUniqueIds(value['requirements']) ||
    !isArrayOf(value['capabilities'], isTaskCapabilityRequirementV1) ||
    !hasUniqueIds(value['capabilities'])
  ) {
    return false
  }
  return (
    isOneOf(value['mode'], TVA_EVIDENCE_MODES) &&
    isStringArray(value['verificationMethods']) &&
    hasUniqueStrings(value['verificationMethods']) &&
    isTaskVerifierPolicyV1(value['verifierPolicy']) &&
    isReviewerVisibility(value['reviewerVisibility']) &&
    isBoolean(value['profileEligibility']) &&
    isOneOf(value['privacyClassification'], TVA_PRIVACY_CLASSIFICATIONS)
  )
}

const isTaskSupportingReferenceV1 = (value: unknown): value is TaskSupportingReferenceV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    isUuid(value['id']) &&
    isOneOf(value['type'], TVA_REFERENCE_TYPES) &&
    isNonEmptyString(value['uri']) &&
    isNonEmptyString(value['title']) &&
    isString(value['relevantSection']) &&
    isOneOf(value['relation'], TVA_REFERENCE_RELATIONS) &&
    isOneOf(value['accessState'], TVA_REFERENCE_ACCESS_STATES) &&
    isOneOf(value['privacyClassification'], TVA_PRIVACY_CLASSIFICATIONS) &&
    isNullableString(value['externalVersion']) &&
    isNullableSha256(value['externalContentHash']) &&
    isUuid(value['addedBy']) &&
    isIsoTimestamp(value['addedAt'])
  )
}

const isTaskReadinessFindingV1 = (value: unknown): value is TaskReadinessFindingV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    isNonEmptyString(value['code']) &&
    isOneOf(value['severity'], TVA_READINESS_SEVERITIES) &&
    isNonEmptyString(value['fieldPath']) &&
    isNullableString(value['sourcePath']) &&
    isNonEmptyString(value['message']) &&
    isNonEmptyString(value['remediationHint'])
  )
}

const isTaskReadinessResultV1 = (value: unknown): value is TaskReadinessResultV1 => {
  if (!isRecord(value)) {
    return false
  }
  if (
    !isArrayOf(value['blockers'], isTaskReadinessFindingV1) ||
    !isArrayOf(value['warnings'], isTaskReadinessFindingV1)
  ) {
    return false
  }
  return (
    isNonEmptyString(value['policyVersion']) &&
    isOneOf(value['workState'], TVA_WORK_READINESS_STATES) &&
    isOneOf(value['evidenceState'], TVA_EVIDENCE_READINESS_STATES) &&
    isBoolean(value['assignmentReady']) &&
    isBoolean(value['evidenceReady']) &&
    hasUniqueStrings(value['blockers'].map((finding) => finding.code)) &&
    hasUniqueStrings(value['warnings'].map((finding) => finding.code)) &&
    isIsoTimestamp(value['assessedAt'])
  )
}

export const isResolvedTaskContractV1 = (value: unknown): value is ResolvedTaskContractV1 => {
  if (!isRecord(value) || !isRecord(value['specification']) || !isRecord(value['inheritedFrom'])) {
    return false
  }
  const specification = value['specification']
  const inheritedFrom = value['inheritedFrom']
  if (!isArrayOf(specification['sections'], isTaskSpecificationSectionV1)) {
    return false
  }
  if (
    !isArrayOf(value['supportingReferences'], isTaskSupportingReferenceV1) ||
    !hasUniqueIds(value['supportingReferences'])
  ) {
    return false
  }
  return (
    hasSchemaVersion(value, TVA_SCHEMA_VERSIONS.resolvedTaskContract) &&
    isUuid(value['taskId']) &&
    isUuid(value['versionId']) &&
    isNonEmptyString(value['title']) &&
    isUuid(specification['versionId']) &&
    isTvaJsonValue(specification['richContent']) &&
    isString(specification['plainText']) &&
    hasUniqueIds(specification['sections']) &&
    isTaskWorkContractV1(value['work']) &&
    isTaskEvidenceContractV1(value['evidence']) &&
    isNullableUuid(inheritedFrom['projectContextVersionId']) &&
    isNullableUuid(inheritedFrom['workPackageVersionId']) &&
    isTaskReadinessResultV1(value['readiness']) &&
    isSha256(value['resolvedContentHash'])
  )
}

export const isTaskContractVersionV1 = (value: unknown): value is TaskContractVersionV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    hasSchemaVersion(value, TVA_SCHEMA_VERSIONS.taskContractVersion) &&
    isUuid(value['id']) &&
    isUuid(value['taskId']) &&
    isUuid(value['taskSpecificationVersionId']) &&
    isPositiveInteger(value['versionNumber']) &&
    isTaskWorkContractV1(value['workContract']) &&
    isTaskEvidenceContractV1(value['evidenceContract']) &&
    isResolvedTaskContractV1(value['resolvedContract']) &&
    isOneOf(value['readinessState'], TVA_TASK_CONTRACT_READINESS_STATES) &&
    isNullableUuid(value['creatorConfirmedBy']) &&
    isNullableIsoTimestamp(value['creatorConfirmedAt']) &&
    isSha256(value['contentHash']) &&
    isOneOf(value['changeClass'], TVA_CHANGE_CLASSES) &&
    hasOptionalNullableString(value, 'changeReason') &&
    isIsoTimestamp(value['effectiveFrom']) &&
    isIsoTimestamp(value['createdAt'])
  )
}

/**
 * Returns stable top-level diagnostics for a rejected versioned Task Contract.
 * This intentionally reports shape boundaries only; field-level validation
 * remains owned by the individual contract validators above.
 */
export const explainTaskContractVersionV1 = (value: unknown): readonly string[] => {
  if (!isRecord(value)) return ['contract']

  const failures: string[] = []
  if (!hasSchemaVersion(value, TVA_SCHEMA_VERSIONS.taskContractVersion)) failures.push('schemaVersion')
  if (!isUuid(value['id'])) failures.push('id')
  if (!isUuid(value['taskId'])) failures.push('taskId')
  if (!isUuid(value['taskSpecificationVersionId'])) failures.push('taskSpecificationVersionId')
  if (!isPositiveInteger(value['versionNumber'])) failures.push('versionNumber')
  if (!isTaskWorkContractV1(value['workContract'])) failures.push('workContract')
  if (!isTaskEvidenceContractV1(value['evidenceContract'])) failures.push('evidenceContract')
  if (!isResolvedTaskContractV1(value['resolvedContract'])) failures.push('resolvedContract')
  if (!isOneOf(value['readinessState'], TVA_TASK_CONTRACT_READINESS_STATES)) failures.push('readinessState')
  if (!isNullableUuid(value['creatorConfirmedBy'])) failures.push('creatorConfirmedBy')
  if (!isNullableIsoTimestamp(value['creatorConfirmedAt'])) failures.push('creatorConfirmedAt')
  if (!isSha256(value['contentHash'])) failures.push('contentHash')
  if (!isOneOf(value['changeClass'], TVA_CHANGE_CLASSES)) failures.push('changeClass')
  if (!hasOptionalNullableString(value, 'changeReason')) failures.push('changeReason')
  if (!isIsoTimestamp(value['effectiveFrom'])) failures.push('effectiveFrom')
  if (!isIsoTimestamp(value['createdAt'])) failures.push('createdAt')
  return failures
}

const isPositiveIntegerRecord = (value: unknown): boolean =>
  isRecord(value) && Object.values(value).every(isPositiveInteger)

const isTaskTaxonomyAssignmentV1 = (value: unknown, entityId: string): boolean => {
  if (!isRecord(value) || !isRecord(value['term'])) {
    return false
  }
  const term = value['term']
  const evidenceRefs = value['evidenceRefs']
  return (
    value['resource'] === 'task' &&
    value['entityId'] === entityId &&
    isNonEmptyString(term['namespace']) &&
    isNonEmptyString(term['termId']) &&
    isOneOf(value['provenance'], ASSIGNMENT_PROVENANCE_VALUES) &&
    isOneOf(value['reviewState'], ASSIGNMENT_REVIEW_STATES) &&
    isNonEmptyString(value['sourceType']) &&
    (!hasOwn(value, 'confidence') ||
      (isFiniteNumber(value['confidence']) && value['confidence'] >= 0 && value['confidence'] <= 1)) &&
    (!hasOwn(value, 'sourceId') || isNonEmptyString(value['sourceId'])) &&
    (!hasOwn(value, 'evidenceRefs') ||
      (isStringArray(evidenceRefs) && hasUniqueStrings(evidenceRefs))) &&
    (!hasOwn(value, 'validFrom') || isIsoTimestamp(value['validFrom'])) &&
    (!hasOwn(value, 'validUntil') || isIsoTimestamp(value['validUntil'])) &&
    isPositiveInteger(value['taxonomyVersion']) &&
    (!hasOwn(value, 'enrichmentVersion') || isPositiveInteger(value['enrichmentVersion']))
  )
}

const isTaskTaxonomyFreeFormTagV1 = (value: unknown, entityId: string): boolean => {
  if (!isRecord(value)) {
    return false
  }
  return (
    value['resource'] === 'task' &&
    value['entityId'] === entityId &&
    isNonEmptyString(value['tagSpace']) &&
    isNonEmptyString(value['sourceType']) &&
    isNonEmptyString(value['displayValue']) &&
    isNonEmptyString(value['normalizedValue']) &&
    (!hasOwn(value, 'sourceId') || isNonEmptyString(value['sourceId']))
  )
}

const isTaskTaxonomyDiagnosticV1 = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false
  }
  return (
    isOneOf(value['code'], TAXONOMY_DIAGNOSTIC_CODES) &&
    isOneOf(value['severity'], TAXONOMY_DIAGNOSTIC_SEVERITIES) &&
    isNonEmptyString(value['path']) &&
    isNonEmptyString(value['message']) &&
    (!hasOwn(value, 'repairHint') || isNonEmptyString(value['repairHint']))
  )
}

const isTaskTaxonomyCompletenessV1 = (value: unknown, entityId: string): boolean => {
  if (!isRecord(value)) {
    return false
  }
  return (
    value['resource'] === 'task' &&
    value['entityId'] === entityId &&
    isNonEmptyString(value['namespace']) &&
    isOneOf(value['state'], METADATA_KNOWLEDGE_STATES) &&
    isPositiveInteger(value['taxonomyVersion']) &&
    (!hasOwn(value, 'enrichmentVersion') || isPositiveInteger(value['enrichmentVersion'])) &&
    isIsoTimestamp(value['projectedAt']) &&
    isNonNegativeInteger(value['unresolvedCount']) &&
    isNonNegativeInteger(value['belowThresholdCount'])
  )
}

const isTaskTaxonomyProviderVersionsV1 = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false
  }
  const sourceRevisions = value['sourceRevisions']
  const enrichmentVersions = value['enrichmentVersions']
  return (
    isPositiveInteger(value['assignmentSchemaVersion']) &&
    isRecord(sourceRevisions) &&
    Object.values(sourceRevisions).every(isNonEmptyString) &&
    isPositiveIntegerRecord(enrichmentVersions)
  )
}

const isTaskAssignmentTaxonomyMetadataV1 = (value: unknown, taskId: string): boolean => {
  if (!isRecord(value) || !isUuid(value['entityId'])) {
    return false
  }
  const entityId = value['entityId']
  const providerVersions = value['providerVersions']
  return (
    hasSchemaVersion(value, 'suar.task_assignment_taxonomy_metadata.v1') &&
    entityId === taskId &&
    isNullableString(value['sourceRevision']) &&
    isNullableIsoTimestamp(value['projectedAt']) &&
    isArrayOf(value['assignments'], (assignment) =>
      isTaskTaxonomyAssignmentV1(assignment, entityId)
    ) &&
    isArrayOf(value['freeFormTags'], (tag) => isTaskTaxonomyFreeFormTagV1(tag, entityId)) &&
    isPositiveIntegerRecord(value['taxonomyVersions']) &&
    isArrayOf(value['diagnostics'], isTaskTaxonomyDiagnosticV1) &&
    isArrayOf(value['completeness'], (report) =>
      isTaskTaxonomyCompletenessV1(report, entityId)
    ) &&
    (providerVersions === null || isTaskTaxonomyProviderVersionsV1(providerVersions))
  )
}

export const isTaskAssignmentSnapshotV1 = (value: unknown): value is TaskAssignmentSnapshotV1 => {
  if (
    !isRecord(value) ||
    !isRecord(value['provenance']) ||
    !isRecord(value['creatorConfirmation'])
  ) {
    return false
  }
  const provenance = value['provenance']
  const confirmation = value['creatorConfirmation']
  return (
    hasSchemaVersion(value, TVA_SCHEMA_VERSIONS.taskAssignmentSnapshot) &&
    isUuid(value['id']) &&
    isUuid(value['assignmentId']) &&
    isUuid(value['taskId']) &&
    isUuid(value['organizationId']) &&
    isUuid(value['projectId']) &&
    isUuid(value['assigneeId']) &&
    isUuid(value['assignedBy']) &&
    isNonEmptyString(value['roleInTask']) &&
    isOneOf(value['ownershipLevel'], TVA_OWNERSHIP_LEVELS) &&
    isResolvedTaskContractV1(value['resolvedContract']) &&
    (!hasOwn(value, 'projectBusinessDomains') ||
      (isStringArray(value['projectBusinessDomains']) &&
        hasUniqueStrings(value['projectBusinessDomains']))) &&
    (!hasOwn(value, 'taxonomyMetadata') ||
      value['taxonomyMetadata'] === null ||
      isTaskAssignmentTaxonomyMetadataV1(value['taxonomyMetadata'], value['taskId'])) &&
    hasOwn(provenance, 'projectContextVersionId') &&
    hasOwn(provenance, 'workPackageVersionId') &&
    isNullableUuid(provenance['projectContextVersionId']) &&
    isNullableUuid(provenance['workPackageVersionId']) &&
    isUuid(provenance['taskSpecificationVersionId']) &&
    isUuid(provenance['taskContractVersionId']) &&
    isUuidArray(provenance['capabilityRubricVersionIds']) &&
    hasUniqueStrings(provenance['capabilityRubricVersionIds']) &&
    isStringArray(value['readinessFindingCodesResolved']) &&
    hasUniqueStrings(value['readinessFindingCodesResolved']) &&
    isUuid(confirmation['confirmedBy']) &&
    isIsoTimestamp(confirmation['confirmedAt']) &&
    isBoolean(value['acknowledgementRequired']) &&
    isSha256(value['snapshotHash']) &&
    isIsoTimestamp(value['createdAt'])
  )
}

export const isCompletionClaimV1 = (value: unknown): value is CompletionClaimV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    hasSchemaVersion(value, TVA_SCHEMA_VERSIONS.completionClaim) &&
    isUuid(value['id']) &&
    isUuid(value['completionReportId']) &&
    isPositiveInteger(value['completionReportRevision']) &&
    isSha256(value['completionReportHash']) &&
    isUuid(value['assignmentSnapshotId']) &&
    isUuid(value['taskContractVersionId']) &&
    isUuid(value['userId']) &&
    isNonEmptyString(value['action']) &&
    isNonEmptyString(value['object']) &&
    isNonEmptyString(value['proposedTitle']) &&
    isNonEmptyString(value['proposedStatement']) &&
    isNonEmptyString(value['actualRole']) &&
    isOneOf(value['actualOwnership'], TVA_OWNERSHIP_LEVELS) &&
    (value['actualAutonomy'] === null || isOneOf(value['actualAutonomy'], TVA_AUTONOMY_LEVELS)) &&
    isNonEmptyString(value['contributionStatement']) &&
    isUuidArray(value['deliverableRefs']) &&
    hasUniqueStrings(value['deliverableRefs']) &&
    isUuidArray(value['criterionResultRefs']) &&
    hasUniqueStrings(value['criterionResultRefs']) &&
    isUuidArray(value['evidenceRefs']) &&
    hasUniqueStrings(value['evidenceRefs']) &&
    isJsonObject(value['outcomeData']) &&
    isNullableString(value['publicClaimDraft']) &&
    isOneOf(value['privacyClassification'], TVA_PRIVACY_CLASSIFICATIONS) &&
    isOneOf(value['status'], TVA_CLAIM_STATUSES) &&
    isIsoTimestamp(value['createdAt'])
  )
}

export const isReviewObservationV1 = (value: unknown): value is ReviewObservationV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    hasSchemaVersion(value, TVA_SCHEMA_VERSIONS.reviewObservation) &&
    isUuid(value['id']) &&
    isUuid(value['reviewWorkflowId']) &&
    isUuid(value['reviewSessionId']) &&
    isPositiveInteger(value['reviewRevision']) &&
    isNonEmptyString(value['reviewPolicyVersion']) &&
    isNullableString(value['capabilityTaxonomyVersion']) &&
    isUuid(value['assignmentSnapshotId']) &&
    isSha256(value['sourceSnapshotHash']) &&
    isUuid(value['taskAssignmentId']) &&
    isUuid(value['subjectUserId']) &&
    isOneOf(value['observationType'], TVA_REVIEW_OBSERVATION_TYPES) &&
    isUuid(value['targetRef']) &&
    isOneOf(value['disposition'], TVA_REVIEW_DISPOSITIONS) &&
    isJsonObject(value['structuredValue']) &&
    isNonEmptyString(value['rationale']) &&
    isUuidArray(value['evidenceRefs']) &&
    hasUniqueStrings(value['evidenceRefs']) &&
    isUuid(value['reviewerId']) &&
    isNonEmptyString(value['reviewerType']) &&
    isNullableConfidence(value['confidence']) &&
    isNullableNonNegativeNumber(value['assessmentCeiling']) &&
    isOneOf(value['governanceState'], TVA_GOVERNANCE_STATES) &&
    isNullableUuid(value['supersedesObservationId']) &&
    isIsoTimestamp(value['createdAt']) &&
    isNullableIsoTimestamp(value['finalizedAt'])
  )
}

export const isLegacyTaskSubmission = (value: unknown): value is LegacyTaskSubmissionV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    hasSchemaVersion(value, TVA_SCHEMA_VERSIONS.legacyTaskSubmission) &&
    isUuid(value['submissionId']) &&
    isUuid(value['taskId']) &&
    isUuid(value['userId']) &&
    isString(value['summary']) &&
    isNullableString(value['implementationNotes']) &&
    isNullableString(value['limitations']) &&
    isNullableString(value['testNotes']) &&
    isNullableIsoTimestamp(value['submittedAt']) &&
    value['provenanceClass'] === 'legacy_unverified'
  )
}
