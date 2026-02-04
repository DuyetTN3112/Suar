import { DateTime } from 'luxon'

import type { GetProjectsListDTO } from '#actions/projects/queries/get_projects_list_query'
import { PAGINATION } from '#modules/common/constants/common_constants'
import type { ProjectVisibility } from '#modules/projects/constants/project_constants'

export const PROJECTS_DEFAULT_LIMIT = 20

const VALID_PROJECT_VISIBILITIES = new Set<string>(['public', 'private', 'team'])
const VALID_PROJECT_SORT_BY = new Set(['created_at', 'name', 'start_date', 'end_date'])

export function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

export function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

export function toOptionalDateTime(value: unknown): DateTime | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined
  }

  const parsed = DateTime.fromISO(value)
  return parsed.isValid ? parsed : undefined
}

export function toDateTimeOrNull(value: unknown): DateTime | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null
  }

  return DateTime.fromISO(value)
}

export function toOptionalVisibility(value: unknown): ProjectVisibility | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  return VALID_PROJECT_VISIBILITIES.has(value) ? (value as ProjectVisibility) : undefined
}

export function toPositiveNumber(
  value: unknown,
  fallback: number = PAGINATION.DEFAULT_PAGE
): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.trunc(value))
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : fallback
  }

  return fallback
}

export function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    if (value === 'true') return true
    if (value === 'false') return false
  }

  return fallback
}

export function toProjectSortBy(value: unknown): GetProjectsListDTO['sort_by'] {
  const rawValue = typeof value === 'string' && value.trim().length > 0 ? value : 'created_at'
  return VALID_PROJECT_SORT_BY.has(rawValue)
    ? (rawValue as GetProjectsListDTO['sort_by'])
    : 'created_at'
}

export function toProjectSortOrder(value: unknown): GetProjectsListDTO['sort_order'] {
  return value === 'asc' || value === 'desc' ? value : 'desc'
}

export { PAGINATION }
