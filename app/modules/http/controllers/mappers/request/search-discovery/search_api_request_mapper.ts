import ValidationException from '#modules/errors/public_contracts/validation_exception'

export interface SearchApiRequest {
  readonly query: string
}

/**
 * Maps the legacy global-search query parameter without changing blank-query
 * compatibility. Missing q is the same as the existing empty search, while
 * present malformed values fail at the transport boundary instead of being
 * silently coerced to an empty query.
 */
export function buildSearchApiRequest(value: unknown): SearchApiRequest {
  if (value === undefined) return { query: '' }
  if (typeof value !== 'string') throw ValidationException.field('q', 'q must be a string')

  return { query: value }
}
