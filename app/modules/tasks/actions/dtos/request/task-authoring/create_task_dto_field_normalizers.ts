import { DateTime } from 'luxon'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { isCanonicalTaskType } from '#modules/tasks/domain/task-authoring/task_taxonomy'
import { normalizeTaskVerificationMethod } from '#modules/tasks/domain/task-authoring/task_verification_methods'
import {
  TaskLabel,
  TaskPriority,
  TaskVisibility,
} from '#modules/tasks/public_contracts/task_constants'

export function normalizeRequiredTitle(title: string): string {
  if (!title || title.trim().length === 0) {
    throw new ValidationException('Tiêu đề task là bắt buộc')
  }

  if (title.trim().length < 3) {
    throw new ValidationException('Tiêu đề task phải có ít nhất 3 ký tự')
  }

  if (title.length > 255) {
    throw new ValidationException('Tiêu đề task không được vượt quá 255 ký tự')
  }

  return title.trim()
}

export function normalizeOptionalDescription(description?: string): string | undefined {
  if (description && description.length > 5000) {
    throw new ValidationException('Mô tả task không được vượt quá 5000 ký tự')
  }

  return description?.trim()
}

export function normalizeRequiredTaskStatusId(taskStatusId: string): string {
  if (!taskStatusId || taskStatusId.trim().length === 0) {
    throw new ValidationException('task_status_id là bắt buộc')
  }

  return taskStatusId.trim()
}

export function validateOptionalLabel(label?: string): string | undefined {
  if (label === undefined) {
    return undefined
  }

  const validLabels = Object.values(TaskLabel) as string[]
  if (!validLabels.includes(label)) {
    throw new ValidationException('Nhãn task không hợp lệ')
  }

  return label
}

export function validateOptionalPriority(priority?: string): string | undefined {
  if (priority === undefined) {
    return undefined
  }

  const validPriorities = Object.values(TaskPriority) as string[]
  if (!validPriorities.includes(priority)) {
    throw new ValidationException('Mức độ ưu tiên không hợp lệ')
  }

  return priority
}

export function normalizeTaskVisibility(taskVisibility?: string): string {
  if (taskVisibility === undefined) {
    return TaskVisibility.INTERNAL
  }

  const validVisibilities = Object.values(TaskVisibility) as string[]
  if (!validVisibilities.includes(taskVisibility)) {
    throw new ValidationException('Phạm vi task không hợp lệ')
  }

  return taskVisibility
}

export function normalizeTaskType(taskType?: string): string {
  const normalizedTaskType = (taskType ?? 'feature_development').trim()
  if (!isCanonicalTaskType(normalizedTaskType)) {
    throw new ValidationException('Loại task không hợp lệ')
  }

  return normalizedTaskType
}

export function normalizeAcceptanceCriteria(value: string | undefined, allowIncompleteDraft: boolean): string {
  const acceptanceCriteria = value?.trim() ?? ''
  if (!allowIncompleteDraft && acceptanceCriteria.length === 0) {
    throw new ValidationException('Acceptance criteria là bắt buộc')
  }

  return acceptanceCriteria
}

export function normalizeVerificationMethod(value?: string): string {
  return normalizeTaskVerificationMethod(value)
}

export function validateOptionalNonNegativeNumber(
  value: number | undefined,
  message: string
): number | undefined {
  if (value !== undefined && value < 0) {
    throw new ValidationException(message)
  }

  return value
}

export function validateOptionalId(value: string | undefined, message: string): string | undefined {
  if (value !== undefined && !value) {
    throw new ValidationException(message)
  }

  return value
}

export function normalizeRequiredProjectId(projectId: string): string {
  if (!projectId || projectId.trim().length === 0) {
    throw new ValidationException('ID dự án là bắt buộc')
  }

  return projectId.trim()
}

export function validateRequiredOrganizationId(organizationId: string): string {
  if (!organizationId) {
    throw new ValidationException('ID tổ chức là bắt buộc')
  }

  return organizationId
}

export function normalizeDueDate(dueDate?: string | DateTime): DateTime | undefined {
  if (!dueDate) {
    return undefined
  }

  if (typeof dueDate === 'string') {
    const parsedDueDate = DateTime.fromISO(dueDate)
    if (!parsedDueDate.isValid) {
      throw new ValidationException('Ngày hết hạn không hợp lệ')
    }

    return parsedDueDate
  }

  return dueDate
}

export function normalizeOptionalText(value?: string): string | undefined {
  return value?.trim()
}
