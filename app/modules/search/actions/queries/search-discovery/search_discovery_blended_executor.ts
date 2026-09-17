import type {
  QueryCriteriaRequest,
  QueryCriteriaResponse,
} from '#modules/filtering/public_contracts/filter_query'
import type {
  GlobalSearchEntityType,
  GlobalSearchResult,
  GlobalSearchSourceName,
  GlobalSearchSourceStatus,
} from '#modules/search/public_contracts/global_search_contract'
import {
  SEARCH_BLENDED_SOURCE_CAPABILITIES,
  type SearchAuthorityState,
  type SearchDiscoveryDiagnostic,
  type SearchDiscoveryInputMode,
  type SearchDiscoveryRequest,
  type SearchDiscoveryResponse,
  type SearchDiscoverySourceContribution,
  type SearchRetrievalMode,
} from '#modules/search/public_contracts/search_discovery_contract'

const SOURCE_BY_ENTITY: Readonly<Record<GlobalSearchEntityType, GlobalSearchSourceName>> = {
  talent: 'talents',
  task: 'tasks',
  project: 'projects',
  skill: 'skills',
  organization: 'organizations',
  comment: 'comments',
}

export function authority(
  state: SearchAuthorityState,
  sources: readonly SearchDiscoverySourceContribution[]
) {
  return { state, sources: sources.map(({ source }) => source) }
}

export function authorityForResult(response: QueryCriteriaResponse<unknown>): SearchAuthorityState {
  return response.execution.partial || response.execution.degraded ? 'partial' : 'authoritative'
}

export function authorityForTotal(response: QueryCriteriaResponse<unknown>): SearchAuthorityState {
  if (response.execution.partial || response.execution.degraded) return 'partial'
  if (response.total.relation === 'eq') return 'authoritative'
  return response.total.relation === 'gte' ? 'partial' : 'unavailable'
}

export function hasStructuredCriteria(criteria: QueryCriteriaRequest): boolean {
  return (
    criteria.filter !== undefined ||
    (criteria.preferences?.length ?? 0) > 0 ||
    criteria.sort.length > 0 ||
    (criteria.projection?.length ?? 0) > 0 ||
    (criteria.requestedFacets?.length ?? 0) > 0
  )
}

export function legacySourceContribution(
  status: GlobalSearchSourceStatus
): SearchDiscoverySourceContribution {
  const state =
    status.status === 'timed_out'
      ? 'timed_out'
      : status.status === 'failed'
        ? 'failed'
        : status.status
  const diagnosticCodes =
    status.status === 'timed_out'
      ? (['SEARCH_SOURCE_TIMED_OUT'] as const)
      : status.status === 'failed'
        ? (['SEARCH_SOURCE_UNAVAILABLE'] as const)
        : ([] as const)
  return {
    source: status.source,
    state,
    authority: 'partial',
    resultCount: status.resultCount,
    diagnosticCodes,
  }
}

export function failClosedBlendedResponse<TDocument>(input: {
  readonly request: SearchDiscoveryRequest
  readonly requestId: string
  readonly searchSessionId: string
  readonly submittedQuery: string
  readonly normalizedQuery: string
  readonly inputMode: SearchDiscoveryInputMode
  readonly retrievalMode: SearchRetrievalMode
}): SearchDiscoveryResponse<TDocument> {
  const diagnostics: readonly SearchDiscoveryDiagnostic[] = [
    { code: 'SEARCH_BLENDED_CAPABILITY_UNSUPPORTED', severity: 'error' },
    { code: 'SEARCH_FALLBACK_UNSAFE', severity: 'error' },
  ]
  const unsupportedSources = SEARCH_BLENDED_SOURCE_CAPABILITIES.map(({ source }) => source)
  const sources: readonly SearchDiscoverySourceContribution[] =
    SEARCH_BLENDED_SOURCE_CAPABILITIES.map(({ source }) => ({
      source,
      state: 'skipped',
      authority: 'unsupported',
      resultCount: 0,
      diagnosticCodes: ['SEARCH_BLENDED_CAPABILITY_UNSUPPORTED'],
    }))
  return {
    context: input.request.criteria.context,
    schemaVersion: input.request.criteria.schemaVersion,
    canonicalCriteria: structuredClone(input.request.criteria),
    hits: [],
    total: { value: 0, relation: 'unknown' },
    facets: [],
    suggestions: [],
    diagnostics: [],
    page: {},
    execution: {
      provider: 'search.blended.fail_closed',
      degraded: true,
      partial: true,
      requestId: input.requestId,
    },
    search: {
      scope: 'all',
      inputMode: input.inputMode,
      submittedQuery: input.submittedQuery,
      normalizedQuery: input.normalizedQuery,
      retrievalMode: input.retrievalMode,
      rankingVersion: 'search.blended.unsupported.v1',
      searchSessionId: input.searchSessionId,
      requestId: input.requestId,
      diagnostics,
      sources,
    },
    authority: {
      hits: { state: 'unsupported', sources: [], unsupportedSources },
      total: { state: 'unsupported', sources: [], unsupportedSources },
      facets: (input.request.criteria.requestedFacets ?? []).map(({ field }) => ({
        field,
        state: 'unsupported',
        sources: [],
        unsupportedSources,
      })),
    },
  }
}

export function legacyBlendedResponse(input: {
  readonly request: SearchDiscoveryRequest
  readonly legacy: GlobalSearchResult
  readonly requestId: string
  readonly searchSessionId: string
  readonly submittedQuery: string
  readonly normalizedQuery: string
  readonly inputMode: SearchDiscoveryInputMode
  readonly retrievalMode: SearchRetrievalMode
}): SearchDiscoveryResponse<GlobalSearchResult['results'][number]> {
  const hits = input.legacy.results.map((result) => ({
    id: result.id,
    entityType: result.entityType,
    entityId: result.entityId,
    source: SOURCE_BY_ENTITY[result.entityType],
    rank: result.rank,
    ...(result.score === undefined ? {} : { score: result.score }),
    presentation: {
      title: result.title,
      url: result.url,
      sourceLabel: result.sourceLabel,
      snippets: result.snippets,
      breadcrumbs: result.breadcrumbs,
      primaryActionLabel: result.primaryActionLabel,
    },
    document: result,
  }))
  const sources = input.legacy.sourceStatuses.map(legacySourceContribution)
  const diagnostics: readonly SearchDiscoveryDiagnostic[] = [
    { code: 'SEARCH_PARTIAL_RESULTS', severity: 'warning' },
    { code: 'SEARCH_BLENDED_CAPABILITY_UNSUPPORTED', severity: 'warning' },
  ]

  return {
    context: input.request.criteria.context,
    schemaVersion: input.request.criteria.schemaVersion,
    canonicalCriteria: {
      ...structuredClone(input.request.criteria),
      ...(input.legacy.query === '' ? {} : { text: { value: input.legacy.query } }),
    },
    hits,
    total: { value: input.legacy.candidateResultCount, relation: 'gte' },
    facets: [],
    suggestions: [],
    diagnostics: [],
    page: {},
    execution: {
      provider: 'legacy.global_search',
      degraded: true,
      partial: true,
      requestId: input.requestId,
    },
    search: {
      scope: 'all',
      inputMode: input.inputMode,
      submittedQuery: input.submittedQuery,
      normalizedQuery: input.normalizedQuery,
      retrievalMode: input.retrievalMode,
      rankingVersion: 'weighted_rrf_v1',
      searchSessionId: input.searchSessionId,
      requestId: input.requestId,
      diagnostics,
      sources,
    },
    authority: {
      hits: authority('partial', sources),
      total: authority('partial', sources),
      facets: [],
    },
    compatibility: { globalSearch: input.legacy },
  }
}
