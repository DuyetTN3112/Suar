import type { GetPublicTasksDTO } from '#actions/tasks/dtos/request/task_application_dtos'
import type { GetTasksIndexPageInput } from '#actions/tasks/queries/get_tasks_index_page_query'
import ValidationException from '#exceptions/validation_exception'
import { PAGINATION } from '#modules/common/constants/common_constants'
import { ApplicationStatus } from '#modules/tasks/constants/task_constants'

export const TASKS_DEFAULT_LIMIT = 10

const VALID_TASK_SORT_BY = new Set(['due_date', 'created_at', 'updated_at', 'title', 'priority'])
const VALID_PUBLIC_TASK_SORT_BY = new Set(['created_at', 'budget', 'due_date'])
const VALID_APPLICATION_STATUSES = new Set<string>([...Object.values(ApplicationStatus), 'all'])

export function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

export function toOptionalNullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null
  }

  return toOptionalString(value)
}

export function toPositiveNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.trunc(value))
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return Math.max(1, Math.trunc(parsed))
    }
  }

  return fallback
}

export function toTaskSortBy(value: unknown): GetTasksIndexPageInput['sort_by'] {
  return typeof value === 'string' && VALID_TASK_SORT_BY.has(value)
    ? (value as GetTasksIndexPageInput['sort_by'])
    : 'due_date'
}

export function toSortOrder(value: unknown): GetTasksIndexPageInput['sort_order'] {
  return value === 'desc' ? 'desc' : 'asc'
}

export function toOptionalNumericValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

export function toOptionalStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const normalized = value.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0
    )
    return normalized.length > 0 ? normalized : undefined
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const normalized = value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
    return normalized.length > 0 ? normalized : undefined
  }

  return undefined
}

export function toApplicationStatusFilter(value: unknown): ApplicationStatus | 'all' {
  return typeof value === 'string' && VALID_APPLICATION_STATUSES.has(value)
    ? (value as ApplicationStatus | 'all')
    : 'all'
}

export function toPublicTaskSortBy(value: unknown): GetPublicTasksDTO['sort_by'] {
  return typeof value === 'string' && VALID_PUBLIC_TASK_SORT_BY.has(value)
    ? (value as GetPublicTasksDTO['sort_by'])
    : 'created_at'
}

export function toPublicTaskSortOrder(value: unknown): GetPublicTasksDTO['sort_order'] {
  return value === 'asc' ? 'asc' : 'desc'
}

export function toOptionalRecordArray(
  value: unknown,
  fieldName: string
): Record<string, unknown>[] | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  if (!Array.isArray(value)) {
    throw new ValidationException(`${fieldName} phải là mảng object`)
  }

  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new ValidationException(`${fieldName}[${String(index)}] phải là object`)
    }

    return entry as Record<string, unknown>
  })
}

export { PAGINATION }
