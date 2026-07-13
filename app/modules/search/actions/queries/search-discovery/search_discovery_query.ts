import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'
import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type {
  QueryCriteriaRequest,
  QueryCriteriaResponse,
} from '#modules/filtering/public_contracts/filter_query'
import { buildSearchDiscoveryExplanation } from '#modules/search/domain/search-discovery/search_assistance'
import type {
  GlobalSearchEntityType,
  GlobalSearchQueryOptions,
  GlobalSearchResult,
  GlobalSearchSourceName,
  GlobalSearchSourceStatus,
} from '#modules/search/public_contracts/global_search_contract'
import {
  SEARCH_BLENDED_CONTEXT,
  SEARCH_BLENDED_SOURCE_CAPABILITIES,
  SearchDiscoveryError,
  type SearchAuthorityState,
  type SearchDiscoveryDiagnostic,
  type SearchDiscoveryHit,
  type SearchDiscoveryInputMode,
  type SearchDiscoveryRequest,
  type SearchDiscoveryResponse,
  type SearchDiscoveryScope,
  type SearchDiscoverySourceContribution,
  type SearchRetrievalMode,
} from '#modules/search/public_contracts/search_discovery_contract'

type VerticalScope = Exclude<SearchDiscoveryScope, 'all'>

export interface SearchDiscoveryExecutionInput {
  readonly criteria: QueryCriteriaRequest
  readonly principal: FilterPrincipal
  readonly requestId: string
  readonly signal?: AbortSignal
}

export interface SearchDiscoveryVertical<TDocument = Readonly<Record<string, unknown>>> {
  readonly scope: VerticalScope
  readonly source: GlobalSearchSourceName
  readonly contexts: readonly string[]
  readonly rankingVersion: string
  readonly supportedRetrievalModes: readonly SearchRetrievalMode[]
  execute(
    input: SearchDiscoveryExecutionInput
  ): Promise<QueryCriteriaResponse<SearchDiscoveryHit<TDocument>>>
}

export interface SearchDiscoveryQueryDependencies<TDocument = Readonly<Record<string, unknown>>> {
  readonly verticals: readonly SearchDiscoveryVertical<TDocument>[]
  readonly legacyGlobalSearch?: (
    query: string,
    options?: GlobalSearchQueryOptions
  ) => Promise<GlobalSearchResult>
  readonly sessionIdGenerator?: () => string
}

export interface SearchDiscoveryQueryInput {
  readonly request: SearchDiscoveryRequest
  readonly principal: FilterPrincipal
  readonly requestId: string
  readonly searchSessionId?: string
  readonly signal?: AbortSignal
}

const SOURCE_BY_ENTITY: Readonly<Record<GlobalSearchEntityType, GlobalSearchSourceName>> = {
  talent: 'talents',
  task: 'tasks',
  project: 'projects',
  skill: 'skills',
  organization: 'organizations',
  comment: 'comments',
}

export class SearchDiscoveryQuery<TDocument = Readonly<Record<string, unknown>>> {
  readonly #verticals: ReadonlyMap<VerticalScope, SearchDiscoveryVertical<TDocument>>
  readonly #legacyGlobalSearch?: SearchDiscoveryQueryDependencies<TDocument>['legacyGlobalSearch']
  readonly #sessionIdGenerator: () => string

  constructor(dependencies: SearchDiscoveryQueryDependencies<TDocument>) {
    const verticals = new Map<VerticalScope, SearchDiscoveryVertical<TDocument>>()
    for (const vertical of dependencies.verticals) {
      if (
        verticals.has(vertical.scope) ||
        vertical.contexts.length === 0 ||
        vertical.contexts.some((context) => !isBoundedIdentifier(context)) ||
        !isBoundedIdentifier(vertical.rankingVersion) ||
        vertical.supportedRetrievalModes.length === 0
      ) {
        throw new TypeError('Invalid Search discovery vertical')
      }
      verticals.set(vertical.scope, vertical)
    }
    this.#verticals = verticals
    this.#legacyGlobalSearch = dependencies.legacyGlobalSearch
    this.#sessionIdGenerator = dependencies.sessionIdGenerator ?? generateSearchSessionId
  }

  async execute(input: SearchDiscoveryQueryInput): Promise<SearchDiscoveryResponse<TDocument>> {
    if (input.signal?.aborted) throw new SearchDiscoveryError('SEARCH_REQUEST_ABORTED')
    if (!isBoundedIdentifier(input.requestId)) {
      throw new TypeError('Invalid Search discovery request identifier')
    }
    const searchSessionId = input.searchSessionId ?? this.#sessionIdGenerator()
    if (!isOpaqueIdentifier(searchSessionId)) {
      throw new TypeError('Invalid Search discovery session identifier')
    }

    const submittedQuery = input.request.criteria.text?.value ?? ''
    const normalizedQuery = normalizeQuery(submittedQuery)
    const inputMode = resolveInputMode(input.request.criteria, normalizedQuery)
    const retrievalMode = input.request.search.retrievalMode ?? 'auto'

    if (input.request.search.scope === 'all') {
      if (input.request.criteria.context !== SEARCH_BLENDED_CONTEXT) {
        throw new SearchDiscoveryError('SEARCH_SCOPE_CONTEXT_MISMATCH')
      }
      return this.#executeBlended({
        input,
        inputMode,
        submittedQuery,
        normalizedQuery,
        retrievalMode,
        searchSessionId,
      })
    }

    const vertical = this.#verticals.get(input.request.search.scope)
    if (vertical === undefined) throw new SearchDiscoveryError('SEARCH_SCOPE_UNSUPPORTED')
    if (!vertical.contexts.includes(input.request.criteria.context)) {
      throw new SearchDiscoveryError('SEARCH_SCOPE_CONTEXT_MISMATCH')
    }
    if (!vertical.supportedRetrievalModes.includes(retrievalMode)) {
      throw new SearchDiscoveryError('SEARCH_RETRIEVAL_UNSUPPORTED')
    }

    const result = await executeVertical(vertical, {
      criteria: input.request.criteria,
      principal: input.principal,
      requestId: input.requestId,
      ...(input.signal === undefined ? {} : { signal: input.signal }),
    })
    if (input.signal?.aborted) throw new SearchDiscoveryError('SEARCH_REQUEST_ABORTED')
    const hits = normalizeVerticalHits(result.hits, vertical)

    const authorityState = authorityForResult(result)
    const degraded = result.execution.partial || result.execution.degraded
    const diagnostics: SearchDiscoveryDiagnostic[] = [
      ...(degraded
        ? [
            {
              code: 'SEARCH_PARTIAL_RESULTS' as const,
              severity: 'warning' as const,
              source: vertical.source,
            },
          ]
        : []),
      ...result.diagnostics.flatMap(({ field }) =>
        field === undefined
          ? []
          : [
              {
                code: 'SEARCH_PARTIAL_RESULTS' as const,
                severity: 'warning' as const,
                source: vertical.source,
                field,
              },
            ]
      ),
    ]
    const returnedFacetFields = new Set(result.facets.map(({ field }) => field))
    const contribution: SearchDiscoverySourceContribution = {
      source: vertical.source,
      state: degraded ? 'partial' : 'ok',
      authority: authorityState,
      resultCount: hits.length,
      total: result.total,
      facets: result.facets,
      diagnosticCodes: diagnostics.map(({ code }) => code),
    }

    return {
      ...result,
      hits,
      search: {
        scope: vertical.scope,
        inputMode,
        submittedQuery,
        normalizedQuery: normalizeQuery(result.canonicalCriteria.text?.value ?? ''),
        retrievalMode,
        rankingVersion: vertical.rankingVersion,
        searchSessionId,
        requestId: input.requestId,
        diagnostics,
        sources: [contribution],
      },
      authority: {
        hits: { state: authorityState, sources: [vertical.source] },
        total: { state: authorityForTotal(result), sources: [vertical.source] },
        facets: [
          ...result.facets.map(({ field }) => ({
            field,
            state: authorityState,
            sources: [vertical.source],
          })),
          ...(input.request.criteria.requestedFacets ?? [])
            .filter(({ field }) => !returnedFacetFields.has(field))
            .map(({ field }) => ({
              field,
              state: 'partial' as const,
              sources: [vertical.source],
            })),
        ],
      },
    }
  }

  async #executeBlended(input: {
    readonly input: SearchDiscoveryQueryInput
    readonly inputMode: SearchDiscoveryInputMode
    readonly submittedQuery: string
    readonly normalizedQuery: string
    readonly retrievalMode: SearchRetrievalMode
    readonly searchSessionId: string
  }): Promise<SearchDiscoveryResponse<TDocument>> {
    if (input.retrievalMode !== 'auto' && input.retrievalMode !== 'lexical') {
      throw new SearchDiscoveryError('SEARCH_RETRIEVAL_UNSUPPORTED')
    }
    if (
      input.normalizedQuery === '' ||
      hasStructuredCriteria(input.input.request.criteria) ||
      input.input.request.criteria.page.cursor !== undefined ||
      this.#legacyGlobalSearch === undefined
    ) {
      return failClosedBlendedResponse<TDocument>({
        request: input.input.request,
        requestId: input.input.requestId,
        searchSessionId: input.searchSessionId,
        submittedQuery: input.submittedQuery,
        normalizedQuery: input.normalizedQuery,
        inputMode: input.inputMode,
        retrievalMode: input.retrievalMode,
      })
    }

    if (input.input.signal?.aborted) {
      throw new SearchDiscoveryError('SEARCH_REQUEST_ABORTED')
    }
    const legacy = await this.#legacyGlobalSearch(input.normalizedQuery)
    if (input.input.signal?.aborted) {
      throw new SearchDiscoveryError('SEARCH_REQUEST_ABORTED')
    }
    return legacyBlendedResponse({
      request: input.input.request,
      legacy,
      requestId: input.input.requestId,
      searchSessionId: input.searchSessionId,
      submittedQuery: input.submittedQuery,
      normalizedQuery: legacy.query,
      inputMode: input.inputMode,
      retrievalMode: input.retrievalMode,
    }) as SearchDiscoveryResponse<TDocument>
  }
}

async function executeVertical<TDocument>(
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

function normalizeVerticalHits<TDocument>(
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

function failClosedBlendedResponse<TDocument>(input: {
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

function legacyBlendedResponse(input: {
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

function legacySourceContribution(
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

function authority(
  state: SearchAuthorityState,
  sources: readonly SearchDiscoverySourceContribution[]
) {
  return { state, sources: sources.map(({ source }) => source) }
}

function authorityForResult(response: QueryCriteriaResponse<unknown>): SearchAuthorityState {
  return response.execution.partial || response.execution.degraded ? 'partial' : 'authoritative'
}

function authorityForTotal(response: QueryCriteriaResponse<unknown>): SearchAuthorityState {
  if (response.execution.partial || response.execution.degraded) return 'partial'
  if (response.total.relation === 'eq') return 'authoritative'
  return response.total.relation === 'gte' ? 'partial' : 'unavailable'
}

function hasStructuredCriteria(criteria: QueryCriteriaRequest): boolean {
  return (
    criteria.filter !== undefined ||
    (criteria.preferences?.length ?? 0) > 0 ||
    criteria.sort.length > 0 ||
    (criteria.projection?.length ?? 0) > 0 ||
    (criteria.requestedFacets?.length ?? 0) > 0
  )
}

function resolveInputMode(
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

function normalizeQuery(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, 512)
}

function generateSearchSessionId(): string {
  if (typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function isBoundedIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 256
}

function isOpaqueIdentifier(value: unknown): value is string {
  return isBoundedIdentifier(value) && value.length >= 16 && /^[A-Za-z0-9._~-]+$/.test(value)
}
