import {
  authorityForResult,
  authorityForTotal,
  failClosedBlendedResponse,
  hasStructuredCriteria,
  legacyBlendedResponse,
} from './search_discovery_blended_executor.js'
import {
  executeVertical,
  generateSearchSessionId,
  isBoundedIdentifier,
  isOpaqueIdentifier,
  normalizeQuery,
  normalizeVerticalHits,
  resolveInputMode,
} from './search_discovery_vertical_normalizer.js'

import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'
import type {
  QueryCriteriaRequest,
  QueryCriteriaResponse,
} from '#modules/filtering/public_contracts/filter_query'
import type {
  GlobalSearchQueryOptions,
  GlobalSearchResult,
  GlobalSearchSourceName,
} from '#modules/search/public_contracts/global_search_contract'
import {
  SEARCH_BLENDED_CONTEXT,
  SearchDiscoveryError,
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
