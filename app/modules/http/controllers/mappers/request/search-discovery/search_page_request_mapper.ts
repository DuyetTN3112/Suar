import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type { HttpGlobalSearchEntityType } from '#modules/http/actions/dtos/global_search'

export type SearchPageFilterType = 'all' | HttpGlobalSearchEntityType

export interface SearchPageRequest {
  readonly query: string
  readonly activeType: SearchPageFilterType
  readonly requestedField: string | null
  readonly cursor: string | null
  readonly previousCursor: string | null
}

const SEARCH_PAGE_TYPES = new Set<SearchPageFilterType>([
  'all',
  'talent',
  'task',
  'project',
  'skill',
  'organization',
  'comment',
])

export function buildSearchPageRequest(input: Record<string, unknown>): SearchPageRequest {
  return {
    query: readQuery(input['q']),
    activeType: readType(input['type']),
    requestedField: readOptionalField(input['field']),
    cursor: readOptionalCursor(input['cursor']),
    previousCursor: readOptionalCursor(input['previousCursor']),
  }
}

function readQuery(value: unknown): string {
  if (value === undefined) return ''
  if (typeof value !== 'string') throw ValidationException.field('q', 'q must be a string')
  return value.trim()
}

function readType(value: unknown): SearchPageFilterType {
  if (value === undefined || value === '') return 'all'
  if (typeof value !== 'string' || !SEARCH_PAGE_TYPES.has(value as SearchPageFilterType)) {
    throw ValidationException.field('type', 'type must be a supported search filter')
  }
  return value as SearchPageFilterType
}

function readOptionalField(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') throw ValidationException.field('field', 'field must be a string')
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function readOptionalCursor(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string')
    throw ValidationException.field('cursor', 'cursor must be a string')
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  if (trimmed.length > 8_192) {
    throw ValidationException.field('cursor', 'cursor is too long')
  }
  return trimmed
}
