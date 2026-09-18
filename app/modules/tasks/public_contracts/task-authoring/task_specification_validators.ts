import {
  TVA_AUTONOMY_LEVELS,
  TVA_CHANGE_CLASSES,
  TVA_COLLABORATION_TYPES,
  TVA_CONFIRMATION_STATES,
  TVA_OWNERSHIP_LEVELS,
  TVA_SCHEMA_VERSIONS,
} from './primitives.js'
import type {
  TaskAcceptanceCriterionV1,
  TaskContractListItemV1,
  TaskDeliverableV1,
  TaskDependencyV1,
  TaskSpecificationSectionV1,
  TaskSpecificationVersionV1,
  TaskWorkContractV1,
} from './task_contracts.js'
import {
  hasOptionalNullableString,
  hasSchemaVersion,
  hasUniqueIds,
  isArrayOf,
  isBoolean,
  isIsoTimestamp,
  isJsonObject,
  isNonEmptyString,
  isNullableIsoTimestamp,
  isNullableNonNegativeNumber,
  isNullableString,
  isNullableUuid,
  isOneOf,
  isPositiveInteger,
  isRecord,
  isSha256,
  isSourceProvenanceV1,
  isString,
  isTvaJsonValue,
  isUuid,
} from './task_primitive_validators.js'

export const isTaskSpecificationSectionV1 = (value: unknown): value is TaskSpecificationSectionV1 => {
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

export const isTaskContractListItemV1 = (value: unknown): value is TaskContractListItemV1 => {
  if (!isRecord(value)) {
    return false
  }
  return isUuid(value['id']) && isNonEmptyString(value['title']) && isString(value['description'])
}

export const isTaskDeliverableV1 = (value: unknown): value is TaskDeliverableV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    isTaskContractListItemV1(value) &&
    isNullableString(value['expectedFormat']) &&
    isNullableString(value['expectedLocation'])
  )
}

export const isTaskAcceptanceCriterionV1 = (value: unknown): value is TaskAcceptanceCriterionV1 => {
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

export const isTaskDependencyV1 = (value: unknown): value is TaskDependencyV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    isTaskContractListItemV1(value) &&
    isNullableUuid(value['ownerId']) &&
    isNonEmptyString(value['state'])
  )
}

export const isTaskWorkContractV1 = (value: unknown): value is TaskWorkContractV1 => {
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
