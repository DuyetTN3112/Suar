import type {
  SearchDiscoveryExecutionInput,
  SearchDiscoveryVertical,
} from './search_discovery_query.js'

import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type {
  QueryCriteriaRequest,
  QueryCriteriaResponse,
} from '#modules/filtering/public_contracts/filter_query'
import { buildSearchDiscoveryExplanation } from '#modules/search/domain/search-discovery/search_assistance'
import {
  SearchDiscoveryError,
  type SearchDiscoveryHit,
  type SearchDiscoveryInputMode,
} from '#modules/search/public_contracts/search_discovery_contract'

export async function executeVertical<TDocument>(
  vertical: SearchDiscoveryVertical<TDocument>,
  input: SearchDiscoveryExecutionInput
): Promise<QueryCriteriaResponse<SearchDiscoveryHit<TDocument>>> {
  try {
    return await vertical.execute(input)
  } catch (error) {
    if (error instanceof SearchDiscoveryError) throw error
    if (error instanceof FilterExecutionError) {
      if (error.code === 'FILTER_REQUEST_ABORTED') {
        throw new SearchDiscoveryError('SEARCH_REQUEST_ABORTED')
      }
      if (error.code === 'FILTER_PROVIDER_TIMED_OUT') {
        throw new SearchDiscoveryError('SEARCH_SOURCE_TIMED_OUT')
      }
      if (error.code === 'FILTER_CURSOR_INVALID') {
        throw new SearchDiscoveryError('SEARCH_CURSOR_INVALID')
      }
      if (error.code === 'FILTER_CURSOR_EXPIRED') {
        throw new SearchDiscoveryError('SEARCH_CURSOR_EXPIRED')
      }
      if (error.code === 'FILTER_CURSOR_STALE') {
        throw new SearchDiscoveryError('SEARCH_CURSOR_STALE')
      }
      if (error.code === 'FILTER_EXECUTOR_CAPABILITY_MISMATCH') {
        throw new SearchDiscoveryError('SEARCH_INDEX_STALE')
      }
      if (
        error.code === 'FILTER_EXECUTOR_UNAVAILABLE' ||
        error.code === 'FILTER_DEGRADED_NOT_ALLOWED'
      ) {
        throw new SearchDiscoveryError('SEARCH_SOURCE_UNAVAILABLE')
      }
      throw error
    }
    throw new SearchDiscoveryError('SEARCH_SOURCE_UNAVAILABLE')
  }
}

export function normalizeVerticalHits<TDocument>(
  hits: readonly SearchDiscoveryHit<TDocument>[],
  vertical: Pick<SearchDiscoveryVertical<TDocument>, 'scope' | 'source' | 'rankingVersion'>
): readonly SearchDiscoveryHit<TDocument>[] {
  const identities = new Set<string>()
  return hits.map((hit, index) => {
    if (
      !isBoundedIdentifier(hit.id) ||
      !isBoundedIdentifier(hit.entityId) ||
      hit.entityType !== vertical.scope ||
      hit.source !== vertical.source ||
      identities.has(hit.id) ||
      (hit.score !== undefined && hit.score !== null && !Number.isFinite(hit.score))
    ) {
      throw new SearchDiscoveryError('SEARCH_SOURCE_UNAVAILABLE')
    }
    identities.add(hit.id)
    if (hit.explanation !== undefined) {
      try {
        const explanation = buildSearchDiscoveryExplanation(hit.explanation)
        if (explanation.rankingVersion !== vertical.rankingVersion) {
          throw new SearchDiscoveryError('SEARCH_SOURCE_UNAVAILABLE')
        }
        return { ...hit, rank: index + 1, explanation }
      } catch (error) {
        if (error instanceof SearchDiscoveryError) throw error
        throw new SearchDiscoveryError('SEARCH_SOURCE_UNAVAILABLE')
      }
    }
    return { ...hit, rank: index + 1 }
  })
}

export function resolveInputMode(
  criteria: QueryCriteriaRequest,
  normalizedQuery: string
): SearchDiscoveryInputMode {
  const hasQuery = normalizedQuery.length > 0
  const hasFilter = criteria.filter !== undefined
  if (hasQuery && hasFilter) return 'combined'
  if (hasQuery) return 'query'
  if (hasFilter) return 'filter'
  return 'browse'
}

export function normalizeQuery(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, 512)
}

export function generateSearchSessionId(): string {
  if (typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export function isBoundedIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 256
}

export function isOpaqueIdentifier(value: unknown): value is string {
  return isBoundedIdentifier(value) && value.length >= 16 && /^[A-Za-z0-9._~-]+$/.test(value)
}
