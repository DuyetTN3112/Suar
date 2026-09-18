import {
  TVA_CHANGE_CLASSES,
  TVA_EVIDENCE_MODES,
  TVA_EVIDENCE_READINESS_STATES,
  TVA_PRIVACY_CLASSIFICATIONS,
  TVA_READINESS_SEVERITIES,
  TVA_REFERENCE_ACCESS_STATES,
  TVA_REFERENCE_RELATIONS,
  TVA_REFERENCE_TYPES,
  TVA_SCHEMA_VERSIONS,
  TVA_TASK_CONTRACT_READINESS_STATES,
  TVA_WORK_READINESS_STATES,
} from './primitives.js'
import type {
  ResolvedTaskContractV1,
  TaskCapabilityRequirementV1,
  TaskContractVersionV1,
  TaskEvidenceContractV1,
  TaskEvidenceRequirementV1,
  TaskReadinessFindingV1,
  TaskReadinessResultV1,
  TaskSupportingReferenceV1,
  TaskVerifierPolicyV1,
} from './task_contracts.js'
import {
  hasOptionalNullableString,
  hasSchemaVersion,
  hasUniqueIds,
  hasUniqueStrings,
  isArrayOf,
  isBoolean,
  isIsoTimestamp,
  isNonEmptyString,
  isNonNegativeInteger,
  isNullableIsoTimestamp,
  isNullableNonNegativeNumber,
  isNullableSha256,
  isNullableString,
  isNullableUuid,
  isOneOf,
  isPositiveInteger,
  isRecord,
  isSha256,
  isString,
  isStringArray,
  isTvaJsonValue,
  isUuid,
  isUuidArray,
} from './task_primitive_validators.js'
import {
  isTaskSpecificationSectionV1,
  isTaskWorkContractV1,
} from './task_specification_validators.js'

export const isTaskEvidenceRequirementV1 = (value: unknown): value is TaskEvidenceRequirementV1 => {
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

export const isTaskVerifierPolicyV1 = (value: unknown): value is TaskVerifierPolicyV1 => {
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

export const isReviewerVisibility = (value: unknown): value is 'project' | 'internal' | 'external' | 'all' =>
  value === undefined || value === 'project' || value === 'internal' || value === 'external' || value === 'all'

export const isTaskCapabilityRequirementV1 = (value: unknown): value is TaskCapabilityRequirementV1 => {
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

export const isTaskEvidenceContractV1 = (value: unknown): value is TaskEvidenceContractV1 => {
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

export const isTaskSupportingReferenceV1 = (value: unknown): value is TaskSupportingReferenceV1 => {
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

export const isTaskReadinessFindingV1 = (value: unknown): value is TaskReadinessFindingV1 => {
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

export const isTaskReadinessResultV1 = (value: unknown): value is TaskReadinessResultV1 => {
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
