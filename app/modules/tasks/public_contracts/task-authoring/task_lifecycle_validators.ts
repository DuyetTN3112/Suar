import {
  TVA_AUTONOMY_LEVELS,
  TVA_CLAIM_STATUSES,
  TVA_GOVERNANCE_STATES,
  TVA_OWNERSHIP_LEVELS,
  TVA_PRIVACY_CLASSIFICATIONS,
  TVA_REVIEW_DISPOSITIONS,
  TVA_REVIEW_OBSERVATION_TYPES,
  TVA_SCHEMA_VERSIONS,
} from './primitives.js'
import { isResolvedTaskContractV1 } from './task_contract_validators.js'
import type { TaskAssignmentSnapshotV1 } from './task_contracts.js'
import {
  hasOwn,
  hasSchemaVersion,
  hasUniqueStrings,
  isArrayOf,
  isBoolean,
  isFiniteNumber,
  isIsoTimestamp,
  isJsonObject,
  isNonEmptyString,
  isNonNegativeInteger,
  isNullableConfidence,
  isNullableIsoTimestamp,
  isNullableNonNegativeNumber,
  isNullableString,
  isNullableUuid,
  isOneOf,
  isPositiveInteger,
  isRecord,
  isSha256,
  isString,
  isStringArray,
  isUuid,
  isUuidArray,
} from './task_primitive_validators.js'

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
