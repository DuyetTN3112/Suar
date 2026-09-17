import type { Client, estypes } from '@elastic/elasticsearch'

import {
  countConditions,
  criteriaError,
  isAbortError,
  isExpiredSearchContext,
  normalizeSearchAfter,
  resolveTotal,
  responseError,
  throwIfAborted,
  timeoutError,
  unavailableError,
  type FilterExpression,
} from './elasticsearch_filter_executor_helpers.js'
import {
  executeElasticsearchFacets,
  type FacetExecution,
  type FacetSearchResponse,
} from './elasticsearch_filter_facet_runner.js'
import {
  assertMappingsReady,
  closePit,
  compileTextQuery,
  createCursorIdentity,
  resolveSort,
} from './elasticsearch_filter_query_builder.js'

import type { FilterContextProvider } from '#modules/filtering/public_contracts/filter_context_provider'
import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { FilterDiagnostic } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { FilterFacetGroup } from '#modules/filtering/public_contracts/filter_facets'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import {
  type ElasticsearchCursorCodec,
} from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_cursor_codec'
import {
  compileElasticsearchFacets,
  parseElasticsearchFacetResponse,
} from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_facet_compiler'
import {
  compileElasticsearchFilter,
  elasticsearchOperatorsForBindings,
  type ElasticsearchSemanticBindings,
} from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_compiler'
import { compileElasticsearchPreferences } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_preference_compiler'

type FilterContextDefinition = Awaited<ReturnType<FilterContextProvider['getEffectiveDefinition']>>

export interface ElasticsearchFilterExecutorInput<TAuthorization extends object> {
  readonly definition: FilterContextDefinition
  readonly criteria: QueryCriteriaRequest
  readonly mandatoryFilter?: FilterExpression
  readonly eligibilityFilter?: FilterExpression
  readonly authorizationBinding: TAuthorization
  readonly requestId: string
  readonly signal?: AbortSignal
}

export interface ElasticsearchFilterExecutorResult<TDocument, TAuthorization extends object> {
  readonly hits: readonly TDocument[]
  readonly total: { readonly value: number; readonly relation: 'eq' | 'gte' | 'unknown' }
  readonly facets: readonly FilterFacetGroup[]
  readonly suggestions: readonly string[]
  readonly diagnostics: readonly FilterDiagnostic[]
  readonly page: { readonly nextCursor?: string; readonly previousCursor?: string }
  readonly provider: string
  readonly degraded: boolean
  readonly partial: boolean
  readonly authorizationEvidence: {
    readonly hits: TAuthorization
    readonly total: TAuthorization
    readonly facets: TAuthorization
    readonly suggestions: TAuthorization
    readonly page: TAuthorization
  }
}

export interface ElasticsearchFilterHitMapperInput {
  readonly id: string
  readonly source: Readonly<Record<string, unknown>>
  readonly score: number | null
}

export interface ElasticsearchResolvedIndexTarget {
  readonly physicalIndexName: string
  readonly generation: string
}

export interface ElasticsearchFilterQueryExecutorOptions<TDocument extends object> {
  readonly client: Client
  readonly indexName: string
  readonly profile: string
  readonly bindings: ElasticsearchSemanticBindings
  readonly idField: string
  readonly textFields?: readonly string[]
  readonly cursorCodec: ElasticsearchCursorCodec
  readonly rankingVersion: string
  readonly resolveIndexTarget?: () => Promise<ElasticsearchResolvedIndexTarget>
  /** Compatibility path for callers whose indexName is already a stable physical index. */
  readonly resolveIndexGeneration?: () => Promise<string>
  readonly mapHit: (input: ElasticsearchFilterHitMapperInput) => TDocument
  readonly requestTimeoutMs?: number
  readonly pitKeepAlive?: string
  readonly maxFacetValues?: number
  readonly clock?: () => Date
}

export class ElasticsearchFilterQueryExecutor<TDocument extends object = Record<string, unknown>> {
  readonly profile: string
  readonly #client: Client
  readonly #indexName: string
  readonly #bindings: ElasticsearchSemanticBindings
  readonly #idField: string
  readonly #idPath: string
  readonly #textFields: readonly string[]
  readonly #cursorCodec: ElasticsearchCursorCodec
  readonly #rankingVersion: string
  readonly #resolveIndexTarget: () => Promise<ElasticsearchResolvedIndexTarget>
  readonly #mapHit: (input: ElasticsearchFilterHitMapperInput) => TDocument
  readonly #requestTimeoutMs: number
  readonly #pitKeepAlive: string
  readonly #maxFacetValues: number
  readonly #clock: () => Date
  readonly #validatedIndexTargets = new Set<string>()

  constructor(options: ElasticsearchFilterQueryExecutorOptions<TDocument>) {
    const idBinding = options.bindings[options.idField]
    if (
      options.indexName.length === 0 ||
      options.profile.length === 0 ||
      idBinding === undefined ||
      idBinding.type !== 'scalar' ||
      options.rankingVersion.length === 0 ||
      (options.resolveIndexTarget === undefined && options.resolveIndexGeneration === undefined) ||
      (options.requestTimeoutMs !== undefined &&
        (!Number.isSafeInteger(options.requestTimeoutMs) || options.requestTimeoutMs < 1)) ||
      (options.maxFacetValues !== undefined &&
        (!Number.isSafeInteger(options.maxFacetValues) || options.maxFacetValues < 1))
    ) {
      throw new TypeError('Invalid Elasticsearch filter executor options')
    }
    this.profile = options.profile
    this.#client = options.client
    this.#indexName = options.indexName
    this.#bindings = options.bindings
    this.#idField = options.idField
    this.#idPath = idBinding.path
    this.#textFields = options.textFields ?? []
    this.#cursorCodec = options.cursorCodec
    this.#rankingVersion = options.rankingVersion
    if (options.resolveIndexTarget !== undefined) {
      this.#resolveIndexTarget = options.resolveIndexTarget
    } else {
      const resolveIndexGeneration = options.resolveIndexGeneration
      if (resolveIndexGeneration === undefined) {
        throw new TypeError('Invalid Elasticsearch filter executor options')
      }
      this.#resolveIndexTarget = async () => ({
        physicalIndexName: this.#indexName,
        generation: await resolveIndexGeneration(),
      })
    }
    this.#mapHit = options.mapHit
    this.#requestTimeoutMs = options.requestTimeoutMs ?? 10_000
    this.#pitKeepAlive = options.pitKeepAlive ?? `${Math.ceil(this.#cursorCodec.ttlMs / 1_000)}s`
    this.#maxFacetValues = options.maxFacetValues ?? 100
    this.#clock = options.clock ?? (() => new Date())
  }

  describeCapabilities() {
    return {
      text: this.#textFields.length > 0,
      facets: true,
      nestedGroups: true,
      preferences: true,
      relativeTime: true,
      relations: Object.values(this.#bindings).some(({ type }) => type === 'relation'),
      pagination: ['cursor'],
      facetCountModes: ['constrained', 'self_excluding'],
      totalRelations: ['eq', 'gte', 'unknown'],
      maxDepth: 8,
      maxConditions: 200,
      maxPageSize: 500,
      maxFacetRequests: 50,
      maxProjectionFields: 100,
      maxSorts: 8,
      maxCost: 10_000,
      fieldOperators: elasticsearchOperatorsForBindings(this.#bindings),
    } as const
  }

  estimateCost<TAuthorization extends object>(
    input: ElasticsearchFilterExecutorInput<TAuthorization>
  ): Promise<number> {
    return Promise.resolve(
      countConditions(input.eligibilityFilter ?? input.criteria.filter) +
        (input.criteria.requestedFacets?.length ?? 0) * 4 +
        Math.ceil(input.criteria.page.size / 10)
    )
  }

  async execute<TAuthorization extends object>(
    input: ElasticsearchFilterExecutorInput<TAuthorization>
  ): Promise<ElasticsearchFilterExecutorResult<TDocument, TAuthorization>> {
    throwIfAborted(input.signal)
    const now = this.#clock()
    if (!Number.isFinite(now.getTime())) criteriaError()

    let openedPitId: string | undefined
    let activePitId: string | undefined
    try {
      const indexTarget = await this.#resolveIndexTarget()
      if (indexTarget.physicalIndexName.length === 0 || indexTarget.generation.length === 0) {
        unavailableError()
      }
      await assertMappingsReady(this.#client, this.#bindings, indexTarget, this.#validatedIndexTargets)
      throwIfAborted(input.signal)
      const sort = resolveSort(input, this.#bindings, this.#idField, this.#idPath)
      const identity = createCursorIdentity(input, sort.identity, this.#rankingVersion, indexTarget.generation)
      const cursor =
        input.criteria.page.cursor === undefined
          ? undefined
          : this.#cursorCodec.decode(input.criteria.page.cursor, identity)
      const searchAfter = cursor?.searchAfter
      const alreadyConsumed = cursor?.consumed ?? 0

      if (cursor?.pitId !== undefined) {
        activePitId = cursor.pitId
      } else {
        const pit = await this.#client.openPointInTime(
          { index: indexTarget.physicalIndexName, keep_alive: this.#pitKeepAlive },
          input.signal === undefined ? undefined : { signal: input.signal }
        )
        activePitId = pit.id
        openedPitId = pit.id
      }
      throwIfAborted(input.signal)
      const pitId = activePitId

      const eligibilityQuery: estypes.QueryDslQueryContainer =
        input.eligibilityFilter === undefined
          ? { match_all: {} }
          : compileElasticsearchFilter(input.eligibilityFilter, this.#bindings, now)
      const textQuery = compileTextQuery(input.criteria.text?.value, this.#textFields)
      const baseQuery: estypes.QueryDslQueryContainer =
        textQuery === undefined
          ? eligibilityQuery
          : {
              bool: { filter: [eligibilityQuery], must: [textQuery] },
            }
      const query = compileElasticsearchPreferences({
        baseQuery,
        preferences: input.criteria.preferences ?? [],
        bindings: this.#bindings,
        now,
        explicitSort: sort.explicit,
        minWeight: 0,
        maxWeight: 10,
        maxBoost: 20,
      })
      const facetCompilation = compileElasticsearchFacets({
        requests: input.criteria.requestedFacets ?? [],
        ...(input.mandatoryFilter === undefined ? {} : { mandatoryFilter: input.mandatoryFilter }),
        ...(input.criteria.filter === undefined ? {} : { userFilter: input.criteria.filter }),
        ...(textQuery === undefined ? {} : { textQuery }),
        bindings: this.#bindings,
        now,
        maxValues: this.#maxFacetValues,
      })
      const parameters: estypes.SearchRequest = {
        pit: { id: pitId, keep_alive: this.#pitKeepAlive },
        query,
        size: input.criteria.page.size,
        sort: [...sort.elasticsearch],
        ...(searchAfter === undefined ? {} : { search_after: [...searchAfter] }),
        track_total_hits: true,
        allow_partial_search_results: input.definition.degradationPolicy === 'explicit_partial',
        timeout: `${this.#requestTimeoutMs}ms`,
      }
      const response = await this.#client.search<Record<string, unknown>>(
        parameters,
        input.signal === undefined ? undefined : { signal: input.signal }
      )
      throwIfAborted(input.signal)
      if (response.timed_out) timeoutError()

      const facetResponses = await executeElasticsearchFacets({
        client: this.#client,
        plans: facetCompilation.plans,
        pitId,
        pitKeepAlive: this.#pitKeepAlive,
        requestTimeoutMs: this.#requestTimeoutMs,
        degradationPolicy: input.definition.degradationPolicy,
        ...(input.signal !== undefined ? { signal: input.signal } : {}),
      })
      throwIfAborted(input.signal)

      const successfulFacetResponses = facetResponses.filter(
        (item): item is Extract<FacetExecution, { response: FacetSearchResponse }> =>
          'response' in item
      )
      const failedFacetPlans = facetResponses
        .filter((item): item is Extract<FacetExecution, { failed: true }> => 'failed' in item)
        .map(({ plan }) => plan)

      const shardFailures =
        response._shards.failed +
        successfulFacetResponses.reduce((total, item) => total + item.response._shards.failed, 0)
      const partial = shardFailures > 0 || failedFacetPlans.length > 0
      if (partial && input.definition.degradationPolicy === 'fail_closed') unavailableError()
      const total = resolveTotal(response.hits.total, response._shards.failed > 0)
      const hits = response.hits.hits.map((hit) => {
        if (hit._source === undefined || hit._id === undefined) responseError()
        return this.#mapHit({ id: hit._id, source: hit._source, score: hit._score ?? null })
      })
      const facetAggregations = Object.fromEntries(
        successfulFacetResponses.map(({ plan, response: facetResponse }) => [
          plan.aggregationName,
          {
            scope: {
              ...(facetResponse.aggregations ?? {}),
              doc_count: resolveTotal(facetResponse.hits.total, false).value,
            },
          },
        ])
      )
      const facets = parseElasticsearchFacetResponse(
        successfulFacetResponses.map(({ plan }) => plan),
        facetAggregations,
        partial ? 'approximate' : 'exact'
      )
      const consumed = alreadyConsumed + hits.length
      const lastHit = response.hits.hits.at(-1)
      const responsePitId =
        successfulFacetResponses.reduce<string | undefined>(
          (latest, item) => item.response.pit_id ?? latest,
          response.pit_id
        ) ?? pitId
      let nextCursor: string | undefined
      if (lastHit?.sort !== undefined && total.relation !== 'unknown' && consumed < total.value) {
        const tieBreakId = lastHit._id
        if (tieBreakId === undefined) responseError()
        nextCursor = this.#cursorCodec.encode({
          ...identity,
          searchAfter: normalizeSearchAfter(lastHit.sort),
          tieBreakId,
          consumed,
          pitId: responsePitId,
        })
      }

      if (nextCursor === undefined) await closePit(this.#client, responsePitId)
      return {
        hits,
        total,
        facets,
        suggestions: [],
        diagnostics: [
          ...(partial
            ? [{ code: 'FILTER_PROVIDER_DEGRADED' as const, severity: 'warning' as const }]
            : []),
          ...failedFacetPlans.map(({ field }) => ({
            code: 'FILTER_PROVIDER_DEGRADED' as const,
            severity: 'warning' as const,
            field,
          })),
        ],
        page: nextCursor === undefined ? {} : { nextCursor },
        provider: this.profile,
        degraded: partial,
        partial,
        authorizationEvidence: {
          hits: input.authorizationBinding,
          total: input.authorizationBinding,
          facets: input.authorizationBinding,
          suggestions: input.authorizationBinding,
          page: input.authorizationBinding,
        },
      }
    } catch (error) {
      if (openedPitId !== undefined) await closePit(this.#client, openedPitId)
      if (error instanceof FilterExecutionError) throw error
      if (input.signal?.aborted || isAbortError(error)) {
        throw new FilterExecutionError('FILTER_REQUEST_ABORTED')
      }
      if (input.criteria.page.cursor !== undefined && isExpiredSearchContext(error)) {
        throw new FilterExecutionError('FILTER_CURSOR_EXPIRED')
      }
      unavailableError()
    }
  }
}
