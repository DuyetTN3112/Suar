import type {
  CurrentCompletedAssignmentProfileFactV1,
  LegacyUserWorkHistoryRowV1,
} from './compatibility_contracts.js'

import type { TvaJsonObject } from '#modules/tasks/public_contracts/task-authoring/primitives'
import { isTvaJsonValue } from '#modules/tasks/public_contracts/task-authoring/validators'

type UnknownRecord = Record<string, unknown>

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const isString = (value: unknown): value is string => typeof value === 'string'
const isNullableString = (value: unknown): value is string | null =>
  value === null || isString(value)
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'
const isNullableBoolean = (value: unknown): value is boolean | null =>
  value === null || isBoolean(value)
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)
const isNullableFiniteNumber = (value: unknown): value is number | null =>
  value === null || isFiniteNumber(value)
const isUuid = (value: unknown): value is string => isString(value) && UUID_PATTERN.test(value)
const isNullableUuid = (value: unknown): value is string | null => value === null || isUuid(value)
const isIsoTimestamp = (value: unknown): value is string =>
  isString(value) && ISO_TIMESTAMP_PATTERN.test(value) && !Number.isNaN(Date.parse(value))
const isNullableIsoTimestamp = (value: unknown): value is string | null =>
  value === null || isIsoTimestamp(value)
const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every(isString)
const isJsonObjectArray = (value: unknown): value is readonly TvaJsonObject[] =>
  Array.isArray(value) && value.every((entry) => isRecord(entry) && isTvaJsonValue(entry))

export const isCurrentCompletedAssignmentProfileFactV1 = (
  value: unknown
): value is CurrentCompletedAssignmentProfileFactV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    value['contractVersion'] === 1 &&
    isUuid(value['taskAssignmentId']) &&
    isUuid(value['taskId']) &&
    isUuid(value['organizationId']) &&
    isNullableUuid(value['projectId']) &&
    isString(value['taskTitle']) &&
    isNullableString(value['taskType']) &&
    isNullableString(value['businessDomain']) &&
    isNullableString(value['problemCategory']) &&
    isNullableString(value['roleInTask']) &&
    isNullableString(value['autonomyLevel']) &&
    isNullableString(value['collaborationType']) &&
    isStringArray(value['techStack']) &&
    isStringArray(value['domainTags']) &&
    isNullableString(value['difficulty']) &&
    isNullableFiniteNumber(value['estimatedTime']) &&
    isNullableFiniteNumber(value['actualTime']) &&
    isNullableFiniteNumber(value['assignmentEstimatedHours']) &&
    isNullableFiniteNumber(value['assignmentActualHours']) &&
    isNullableIsoTimestamp(value['dueDate']) &&
    isNullableIsoTimestamp(value['completedAt']) &&
    isJsonObjectArray(value['measurableOutcomes']) &&
    isNullableString(value['impactScope'])
  )
}

export const isLegacyUserWorkHistoryRowV1 = (
  value: unknown
): value is LegacyUserWorkHistoryRowV1 => {
  if (!isRecord(value)) {
    return false
  }
  return (
    isUuid(value['id']) &&
    isUuid(value['user_id']) &&
    isUuid(value['task_id']) &&
    isUuid(value['task_assignment_id']) &&
    isNullableUuid(value['organization_id']) &&
    isNullableUuid(value['project_id']) &&
    isString(value['task_title']) &&
    isNullableString(value['task_type']) &&
    isNullableString(value['business_domain']) &&
    isNullableString(value['problem_category']) &&
    isNullableString(value['role_in_task']) &&
    isNullableString(value['autonomy_level']) &&
    isNullableString(value['collaboration_type']) &&
    isStringArray(value['tech_stack']) &&
    isStringArray(value['domain_tags']) &&
    isNullableString(value['difficulty']) &&
    isNullableFiniteNumber(value['estimated_hours']) &&
    isNullableFiniteNumber(value['actual_hours']) &&
    isNullableBoolean(value['was_on_time']) &&
    isNullableFiniteNumber(value['days_early_or_late']) &&
    isJsonObjectArray(value['measurable_outcomes']) &&
    isNullableString(value['estimated_business_value']) &&
    isJsonObjectArray(value['knowledge_artifacts']) &&
    isNullableFiniteNumber(value['overall_quality_score']) &&
    isJsonObjectArray(value['skill_scores']) &&
    isJsonObjectArray(value['evidence_links']) &&
    isBoolean(value['is_featured']) &&
    isBoolean(value['is_public']) &&
    isNullableIsoTimestamp(value['completed_at']) &&
    isIsoTimestamp(value['created_at']) &&
    isIsoTimestamp(value['updated_at'])
  )
}
