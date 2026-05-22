import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { readCriteria } from '#modules/filtering/controllers/saved-filter-views/filter_saved_views_http_helpers'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'

export function buildFilterCriteriaRequest(payload: unknown): QueryCriteriaRequest {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw ValidationException.field('body', 'Request body must be an object')
  const body = payload as Record<string, unknown>
  if (body['principal'] !== undefined) throw ValidationException.field('principal', 'Principal is server-resolved')
  const criteria = readCriteria(body['criteria'], true)
  return criteria as unknown as QueryCriteriaRequest
}
