import { DateTime } from 'luxon'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { isCanonicalTaskType } from '#modules/tasks/domain/task_taxonomy'
import { TaskLabel, TaskPriority, TaskVisibility } from '#modules/tasks/public_contracts/task_constants'

export interface UpdateTaskDTOInput {
  title?: string
  description?: string
  label?: string | null
  priority?: string | null
  task_visibility?: string
  assigned_to?: string | null
  due_date?: string | DateTime | null
  parent_task_id?: string | null
  project_sprint_id?: string | null
  estimated_time?: number
  actual_time?: number
  project_id?: string
  updated_by?: string
  expected_updated_at?: string
  task_type?: string
  acceptance_criteria?: string
  verification_method?: string
  expected_deliverables?: Record<string, unknown>[]
  context_background?: string
  impact_scope?: string
  tech_stack?: string[]
  environment?: string
  collaboration_type?: string
  complexity_notes?: string
  measurable_outcomes?: Record<string, unknown>[]
  learning_objectives?: string[]
  domain_tags?: string[]
  role_in_task?: string
  autonomy_level?: string
  problem_category?: string
  business_domain?: string
  estimated_users_affected?: number
}

export interface UpdateTaskValidatedPayload extends Omit<UpdateTaskDTOInput, 'updated_by'> {
  updated_by?: string
}

export interface UpdateTaskNormalizedPayload {
  title?: string
  description?: string
  label?: string | null
  priority?: string | null
  task_visibility?: string
  assigned_to?: string | null
  due_date?: DateTime | null
  parent_task_id?: string | null
  project_sprint_id?: string | null
  estimated_time?: number
  actual_time?: number
  project_id?: string
  updated_by?: string
  expected_updated_at?: string
  task_type?: string
  acceptance_criteria?: string
  verification_method?: string
  expected_deliverables?: Record<string, unknown>[]
  context_background?: string
  impact_scope?: string
  tech_stack?: string[]
  environment?: string
  collaboration_type?: string
  complexity_notes?: string
  measurable_outcomes?: Record<string, unknown>[]
  learning_objectives?: string[]
  domain_tags?: string[]
  role_in_task?: string
  autonomy_level?: string
  problem_category?: string
  business_domain?: string
  estimated_users_affected?: number
  providedFields: Set<string>
}

function normalizeOptionalTitle(title: string): string {
  const normalizedTitle = title.trim()
  if (normalizedTitle.length === 0) {
    throw new ValidationException('Tiêu đề task không được để trống')
  }

  if (normalizedTitle.length < 3) {
    throw new ValidationException('Tiêu đề task phải có ít nhất 3 ký tự')
  }

  if (normalizedTitle.length > 255) {
    throw new ValidationException('Tiêu đề task không được vượt quá 255 ký tự')
  }

  return normalizedTitle
}

function normalizeOptionalDescription(description: string): string {
  if (description.length > 5000) {
    throw new ValidationException('Mô tả task không được vượt quá 5000 ký tự')
  }

  return description.trim()
}

function normalizeOptionalEnum<T extends string | null>(
  value: T,
  allowedValues: string[],
  message: string
): T {
  if (value === null) {
    return value
  }

  if (!allowedValues.includes(value)) {
    throw new ValidationException(message)
  }

  return value
}

function validateOptionalIdValue(
  value: string | null,
  message: string
): string | null {
  if (value !== null && !value) {
    throw new ValidationException(message)
  }

  return value
}

function normalizeDueDate(value: string | DateTime | null): DateTime | null {
  if (value === null) {
    return value
  }

  if (typeof value === 'string') {
    const parsedDueDate = DateTime.fromISO(value)
    if (!parsedDueDate.isValid) {
      throw new ValidationException('Ngày hết hạn không hợp lệ')
    }

    return parsedDueDate
  }

  return value
}

function validateNonNegativeNumber(value: number, message: string): number {
  if (value < 0) {
    throw new ValidationException(message)
  }

  return value
}

function normalizeOptionalTaskType(taskType: string): string {
  const normalizedTaskType = taskType.trim()
  if (!isCanonicalTaskType(normalizedTaskType)) {
    throw new ValidationException('Loại task không hợp lệ')
  }

  return normalizedTaskType
}

export function buildUpdateTaskPayload(data: UpdateTaskDTOInput): UpdateTaskNormalizedPayload {
  const payload: UpdateTaskNormalizedPayload = {
    providedFields: new Set(),
  }

  const assignRichField = <K extends RichFieldName>(field: K, value: UpdateTaskDTOInput[K]) => {
    payload[field] = value as UpdateTaskNormalizedPayload[K]
    payload.providedFields.add(field)
  }

  if (data.title !== undefined) {
    payload.title = normalizeOptionalTitle(data.title)
    payload.providedFields.add('title')
  }

  if (data.description !== undefined) {
    payload.description = normalizeOptionalDescription(data.description)
    payload.providedFields.add('description')
  }

  if (data.label !== undefined) {
    payload.label = normalizeOptionalEnum(
      data.label,
      Object.values(TaskLabel),
      'Nhãn không hợp lệ'
    )
    payload.providedFields.add('label')
  }

  if (data.priority !== undefined) {
    payload.priority = normalizeOptionalEnum(
      data.priority,
      Object.values(TaskPriority),
      'Mức độ ưu tiên không hợp lệ'
    )
    payload.providedFields.add('priority')
  }

  if (data.task_visibility !== undefined) {
    payload.task_visibility = normalizeOptionalEnum(
      data.task_visibility,
      Object.values(TaskVisibility),
      'Phạm vi task không hợp lệ'
    )
    payload.providedFields.add('task_visibility')
  }

  if (data.assigned_to !== undefined) {
    payload.assigned_to = validateOptionalIdValue(
      data.assigned_to,
      'ID người được giao không hợp lệ'
    )
    payload.providedFields.add('assigned_to')
  }

  if (data.parent_task_id !== undefined) {
    payload.parent_task_id = validateOptionalIdValue(
      data.parent_task_id,
      'ID task cha không hợp lệ'
    )
    payload.providedFields.add('parent_task_id')
  }

  if (data.project_id !== undefined) {
    if (!data.project_id) {
      throw new ValidationException('ID dự án không hợp lệ')
    }

    payload.project_id = data.project_id.trim()
    payload.providedFields.add('project_id')
  }

  if (data.project_sprint_id !== undefined) {
    payload.project_sprint_id = validateOptionalIdValue(
      data.project_sprint_id,
      'ID sprint không hợp lệ'
    )
    payload.providedFields.add('project_sprint_id')
  }

  if (data.estimated_time !== undefined) {
    payload.estimated_time = validateNonNegativeNumber(
      data.estimated_time,
      'Thời gian ước tính không được âm'
    )
    payload.providedFields.add('estimated_time')
  }

  if (data.actual_time !== undefined) {
    payload.actual_time = validateNonNegativeNumber(
      data.actual_time,
      'Thời gian thực tế không được âm'
    )
    payload.providedFields.add('actual_time')
  }

  if (data.due_date !== undefined) {
    payload.due_date = normalizeDueDate(data.due_date)
    payload.providedFields.add('due_date')
  }

  if (data.updated_by !== undefined) {
    if (!data.updated_by) {
      throw new ValidationException('ID người cập nhật không hợp lệ')
    }

    payload.updated_by = data.updated_by
    payload.providedFields.add('updated_by')
  }

  if (data.expected_updated_at !== undefined) {
    const expectedUpdatedAt = data.expected_updated_at.trim()
    if (!DateTime.fromISO(expectedUpdatedAt).isValid) {
      throw new ValidationException('Phiên bản task không hợp lệ')
    }

    payload.expected_updated_at = expectedUpdatedAt
    payload.providedFields.add('expected_updated_at')
  }

  if (data.task_type !== undefined) {
    payload.task_type = normalizeOptionalTaskType(data.task_type)
    payload.providedFields.add('task_type')
  }

  // Map rich metadata fields
  const richFields = [
    'acceptance_criteria',
    'verification_method',
    'expected_deliverables',
    'context_background',
    'impact_scope',
    'tech_stack',
    'environment',
    'collaboration_type',
    'complexity_notes',
    'measurable_outcomes',
    'learning_objectives',
    'domain_tags',
    'role_in_task',
    'autonomy_level',
    'problem_category',
    'business_domain',
    'estimated_users_affected',
  ] as const
  type RichFieldName = (typeof richFields)[number]

  for (const field of richFields) {
    if (data[field] !== undefined) {
      assignRichField(field, data[field])
    }
  }

  return payload
}
