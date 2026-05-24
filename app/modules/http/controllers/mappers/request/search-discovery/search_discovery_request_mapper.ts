import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import type {
  SearchDiscoveryRequest,
  SearchDiscoveryScope,
  SearchRetrievalMode,
} from '#modules/search/public_contracts/search_discovery_contract'

const SCOPES = new Set<SearchDiscoveryScope>([
  'all',
  'talent',
  'task',
  'project',
  'skill',
  'organization',
  'comment',
])

const RETRIEVAL_MODES = new Set<SearchRetrievalMode>([
  'auto',
  'exact',
  'lexical',
  'semantic',
  'hybrid',
])

export function buildSearchDiscoveryRequest(body: unknown): SearchDiscoveryRequest {
  if (!isRecord(body)) return invalidRequest()
  if (body['principal'] !== undefined) return invalidRequest()
  const criteria = body['criteria']
  const search = body['search']
  if (!isRecord(criteria) || !isRecord(search)) return invalidRequest()

  if (
    !isBoundedString(criteria['context']) ||
    !isSchemaVersion(criteria['schemaVersion']) ||
    (criteria['sort'] !== undefined && !Array.isArray(criteria['sort'])) ||
    !isRecord(criteria['page']) ||
    !isPageSize(criteria['page']['size']) ||
    !isBoundedScope(search['scope'])
  ) {
    return invalidRequest()
  }

  if (
    criteria['text'] !== undefined &&
    (!isRecord(criteria['text']) || !isBoundedString(criteria['text']['value'], 512))
  ) {
    return invalidRequest()
  }
  if (criteria['preferences'] !== undefined && !Array.isArray(criteria['preferences'])) {
    return invalidRequest()
  }
  if (criteria['projection'] !== undefined && !Array.isArray(criteria['projection'])) {
    return invalidRequest()
  }
  if (criteria['requestedFacets'] !== undefined && !Array.isArray(criteria['requestedFacets'])) {
    return invalidRequest()
  }
  if (
    criteria['page']['cursor'] !== undefined &&
    !isBoundedString(criteria['page']['cursor'], 8_192)
  ) {
    return invalidRequest()
  }
  if (
    criteria['page']['offset'] !== undefined &&
    !isSafeNonNegativeInteger(criteria['page']['offset'])
  ) {
    return invalidRequest()
  }
  if (search['retrievalMode'] !== undefined && !isRetrievalMode(search['retrievalMode'])) {
    return invalidRequest()
  }

  return {
    criteria: {
      ...criteria,
      sort: criteria['sort'] ?? [],
    } as unknown as QueryCriteriaRequest,
    search: {
      scope: search['scope'],
      ...(search['retrievalMode'] === undefined ? {} : { retrievalMode: search['retrievalMode'] }),
    },
  }
}

function invalidRequest(): never {
  throw ValidationException.field('request', 'Search discovery request is invalid.')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isBoundedString(value: unknown, maxLength = 256): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
}

function isSchemaVersion(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1 && Number(value) <= 100
}

function isPageSize(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1 && Number(value) <= 500
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function isBoundedScope(value: unknown): value is SearchDiscoveryScope {
  return typeof value === 'string' && SCOPES.has(value as SearchDiscoveryScope)
}

function isRetrievalMode(value: unknown): value is SearchRetrievalMode {
  return typeof value === 'string' && RETRIEVAL_MODES.has(value as SearchRetrievalMode)
}
