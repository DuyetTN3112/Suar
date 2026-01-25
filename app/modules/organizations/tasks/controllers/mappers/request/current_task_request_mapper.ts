import type { HttpContext } from '@adonisjs/core/http'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { ORGANIZATION_PAGINATION as PAGINATION } from '#modules/organizations/tasks/actions/dtos/common/organization_pagination'
import type { OrganizationTasksIndexPageInput } from '#modules/organizations/tasks/actions/dtos/request/organization_tasks_index_page_input'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'

const VALID_TASK_SORT_BY = new Set(['due_date', 'created_at', 'updated_at', 'title', 'priority'])

function readAliasedInput(
  request: HttpContext['request'],
  camelKey: string,
  snakeKey: string,
  fallback?: unknown
): unknown {
  return request.input(camelKey, request.input(snakeKey, fallback))
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function toOptionalStringArray(value: unknown): string[] | undefined {
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

function toOptionalNullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null
  }

  return toOptionalString(value)
}

function toTaskSortBy(value: unknown): OrganizationTasksIndexPageInput['sort_by'] {
  return typeof value === 'string' && VALID_TASK_SORT_BY.has(value)
    ? (value as OrganizationTasksIndexPageInput['sort_by'])
    : 'due_date'
}

function toSortOrder(value: unknown): OrganizationTasksIndexPageInput['sort_order'] {
  return value === 'desc' ? 'desc' : 'asc'
}

export function buildCurrentOrganizationTasksIndexPageInput(
  request: HttpContext['request'],
  defaultLimit: number
): OrganizationTasksIndexPageInput {
  const pagination = normalizePagination(
    {
      page: request.input('page', PAGINATION.DEFAULT_PAGE),
      limit: request.input('limit', defaultLimit),
    },
    PAGINATION,
    { perPage: defaultLimit }
  )

  return omitUndefined({
    page: pagination.page,
    limit: pagination.perPage,
    task_status_id: toOptionalStringArray(
      readAliasedInput(request, 'taskStatusId', 'task_status_id') ?? request.input('status')
    ),
    priority: toOptionalStringArray(request.input('priority') as unknown),
    label: toOptionalStringArray(request.input('label') as unknown),
    assigned_to: toOptionalStringArray(readAliasedInput(request, 'assignedTo', 'assigned_to')),
    parent_task_id: toOptionalNullableString(
      readAliasedInput(request, 'parentTaskId', 'parent_task_id')
    ),
    requested_project_id: toOptionalString(
      readAliasedInput(request, 'projectId', 'project_id')
    ),
    search: toOptionalString(request.input('search') as unknown),
    sort_by: toTaskSortBy(readAliasedInput(request, 'sortBy', 'sort_by', 'due_date')),
    sort_order: toSortOrder(readAliasedInput(request, 'sortOrder', 'sort_order', 'asc')),
  })
}
