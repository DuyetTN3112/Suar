import type { HttpContext } from '@adonisjs/core/http'

import type { GetTasksIndexPageInput } from '#actions/tasks/queries/get_tasks_index_page_query'
import { PAGINATION } from '#constants/common_constants'
import type { DatabaseId } from '#types/database'

const VALID_TASK_SORT_BY = new Set(['due_date', 'created_at', 'updated_at', 'title', 'priority'])

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function toOptionalNullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null
  }

  return toOptionalString(value)
}

function toPositiveNumber(value: unknown, fallback: number): number {
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

function toTaskSortBy(value: unknown): GetTasksIndexPageInput['sort_by'] {
  return typeof value === 'string' && VALID_TASK_SORT_BY.has(value)
    ? (value as GetTasksIndexPageInput['sort_by'])
    : 'due_date'
}

function toSortOrder(value: unknown): GetTasksIndexPageInput['sort_order'] {
  return value === 'desc' ? 'desc' : 'asc'
}

export function buildCurrentOrganizationTasksIndexPageInput(
  request: HttpContext['request'],
  organizationId: DatabaseId,
  defaultLimit: number
): GetTasksIndexPageInput {
  return {
    page: toPositiveNumber(
      request.input('page', PAGINATION.DEFAULT_PAGE) as unknown,
      PAGINATION.DEFAULT_PAGE
    ),
    limit: toPositiveNumber(request.input('limit', defaultLimit) as unknown, defaultLimit),
    task_status_id: toOptionalString(
      (request.input('task_status_id') ?? request.input('status')) as unknown
    ),
    priority: toOptionalString(request.input('priority') as unknown),
    label: toOptionalString(request.input('label') as unknown),
    assigned_to: toOptionalString(request.input('assigned_to') as unknown),
    parent_task_id: toOptionalNullableString(request.input('parent_task_id') as unknown),
    requested_project_id: toOptionalString(request.input('project_id') as unknown),
    search: toOptionalString(request.input('search') as unknown),
    organization_id: organizationId,
    sort_by: toTaskSortBy(request.input('sort_by', 'due_date') as unknown),
    sort_order: toSortOrder(request.input('sort_order', 'asc') as unknown),
  }
}
