import { createHash } from 'node:crypto'

import type { Client, estypes } from '@elastic/elasticsearch'

import type { FilterContextProvider } from '#modules/filtering/public_contracts/filter_context_provider'
import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { FilterDiagnostic } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { FilterFacetGroup } from '#modules/filtering/public_contracts/filter_facets'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import {
  type ElasticsearchCursorCodec,
  type ElasticsearchCursorIdentity,
  type ElasticsearchCursorSort,
} from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_cursor_codec'
import {
  compileElasticsearchFacets,
  parseElasticsearchFacetResponse,
  type ElasticsearchFacetPlan,
} from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_facet_compiler'
import {
  compileElasticsearchFilter,
  elasticsearchOperatorsForBindings,
  type ElasticsearchSemanticBindings,
} from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_compiler'
import { compileElasticsearchPreferences } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_preference_compiler'

type FilterContextDefinition = Awaited<ReturnType<FilterContextProvider['getEffectiveDefinition']>>
type FilterExpression = NonNullable<QueryCriteriaRequest['filter']>
type SearchHitSort = string | number | boolean | null

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

interface ResolvedSort {
  readonly identity: readonly ElasticsearchCursorSort[]
  readonly elasticsearch: readonly estypes.SortCombinations[]
  readonly explicit: boolean
}

type FacetSearchResponse = estypes.SearchResponse<Record<string, never>>
type FacetExecution =
  | { readonly plan: ElasticsearchFacetPlan; readonly response: FacetSearchResponse }
  | { readonly plan: ElasticsearchFacetPlan; readonly failed: true }

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
      await this.#assertMappingsReady(indexTarget)
      throwIfAborted(input.signal)
      const sort = this.#resolveSort(input)
      const identity = this.#cursorIdentity(input, sort.identity, indexTarget.generation)
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
      const textQuery = this.#compileTextQuery(input.criteria.text?.value)
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

      const facetResponses: FacetExecution[] = await Promise.all(
        facetCompilation.plans.map(async (plan): Promise<FacetExecution> => {
          try {
            const facetResponse = await this.#client.search<Record<string, never>>(
              {
                pit: { id: pitId, keep_alive: this.#pitKeepAlive },
                query: plan.query,
                aggregations: plan.aggregations,
                ...(plan.runtimeMappings === undefined
                  ? {}
                  : { runtime_mappings: plan.runtimeMappings }),
                size: 0,
                track_total_hits: true,
                allow_partial_search_results:
                  input.definition.degradationPolicy === 'explicit_partial',
                timeout: `${this.#requestTimeoutMs}ms`,
              },
              input.signal === undefined ? undefined : { signal: input.signal }
            )
            if (facetResponse.timed_out) timeoutError()
            return { plan, response: facetResponse }
          } catch (error) {
            if (input.signal?.aborted || isAbortError(error)) {
              throw new FilterExecutionError('FILTER_REQUEST_ABORTED')
            }
            if (error instanceof FilterExecutionError) {
              if (
                error.code === 'FILTER_CURSOR_INVALID' ||
                error.code === 'FILTER_CURSOR_EXPIRED' ||
                error.code === 'FILTER_CURSOR_STALE'
              ) {
                throw error
              }
            }
            if (input.definition.degradationPolicy !== 'explicit_partial') throw error
            return { plan, failed: true }
          }
        })
      )
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

      if (nextCursor === undefined) await this.#closePit(responsePitId)
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
      if (openedPitId !== undefined) await this.#closePit(openedPitId)
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

  #resolveSort<TAuthorization extends object>(
    input: ElasticsearchFilterExecutorInput<TAuthorization>
  ): ResolvedSort {
    const requested = input.criteria.sort
    const explicit = requested.length > 0
    const identity: ElasticsearchCursorSort[] = []
    const elasticsearch: estypes.SortCombinations[] = []
    if (!explicit) {
      identity.push({ field: '_score', direction: 'desc' })
      elasticsearch.push({ _score: { order: 'desc' } })
    } else {
      for (const requestedSort of requested) {
        const binding = this.#bindings[requestedSort.field]
        if (binding === undefined || binding.sortable !== true) {
          capabilityError()
        }
        identity.push(requestedSort)
        elasticsearch.push({ [binding.path]: { order: requestedSort.direction } })
      }
    }
    if (!identity.some(({ field }) => field === this.#idField)) {
      identity.push({ field: this.#idField, direction: 'asc' })
      elasticsearch.push({ [this.#idPath]: { order: 'asc' } })
    }
    return { identity, elasticsearch, explicit }
  }

  #compileTextQuery(text: string | undefined): estypes.QueryDslQueryContainer | undefined {
    if (text === undefined || text.trim().length === 0) return undefined
    if (this.#textFields.length === 0) capabilityError()
    return {
      bool: {
        should: [
          {
            multi_match: {
              query: text,
              fields: [...this.#textFields],
              type: 'best_fields',
              ...(shouldUseFuzzyMatching(text) ? { fuzziness: 'AUTO' } : {}),
            },
          },
          {
            multi_match: {
              query: text,
              fields: [...this.#textFields],
              type: 'phrase_prefix',
            },
          },
        ],
        minimum_should_match: 1,
      },
    }
  }

  #cursorIdentity<TAuthorization extends object>(
    input: ElasticsearchFilterExecutorInput<TAuthorization>,
    sort: readonly ElasticsearchCursorSort[],
    generation: string
  ): ElasticsearchCursorIdentity {
    return {
      context: input.criteria.context,
      schemaVersion: input.criteria.schemaVersion,
      criteriaHash: hashValue(criteriaWithoutCursor(input.criteria)),
      authorizationHash: hashValue(input.authorizationBinding),
      sort,
      rankingVersion: this.#rankingVersion,
      indexGeneration: generation,
    }
  }

  async #closePit(pitId: string): Promise<void> {
    await this.#client.closePointInTime({ id: pitId }).catch(() => undefined)
  }

  async #assertMappingsReady(indexTarget: ElasticsearchResolvedIndexTarget): Promise<void> {
    const cacheKey = `${indexTarget.physicalIndexName}\u0000${indexTarget.generation}`
    if (this.#validatedIndexTargets.has(cacheKey)) return
    const requiredPaths = collectRequiredMappingPaths(this.#bindings)
    const response = await this.#client.fieldCaps({
      index: indexTarget.physicalIndexName,
      fields: requiredPaths,
      include_unmapped: true,
    })
    const missing = requiredPaths.filter((path) => {
      const capabilities = response.fields[path]
      return (
        capabilities === undefined ||
        Object.values(capabilities).every((capability) => capability.type === 'unmapped')
      )
    })
    if (missing.length > 0) capabilityError()
    this.#validatedIndexTargets.add(cacheKey)
  }
}

function shouldUseFuzzyMatching(query: string): boolean {
  return Array.from(query.trim()).length >= 4
}

function collectRequiredMappingPaths(bindings: ElasticsearchSemanticBindings): string[] {
  const paths = new Set<string>()
  for (const binding of Object.values(bindings)) {
    if (binding.type === 'relation') {
      for (const path of collectRequiredMappingPaths(binding.relationBindings ?? {}))
        paths.add(path)
    } else {
      paths.add(binding.path)
    }
    if (binding.presencePath !== undefined) paths.add(binding.presencePath)
    if (binding.cardinalityPath !== undefined) paths.add(binding.cardinalityPath)
    if (binding.ancestorPath !== undefined) paths.add(binding.ancestorPath)
  }
  return [...paths]
}

function criteriaWithoutCursor(criteria: QueryCriteriaRequest): unknown {
  return {
    ...criteria,
    page: {
      size: criteria.page.size,
      ...(criteria.page.offset === undefined ? {} : { offset: criteria.page.offset }),
    },
  }
}

function hashValue(value: unknown): string {
  return createHash('sha256').update(stableStringify(value), 'utf8').digest('base64url')
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  return `{${Object.entries(value)
    .filter(([, child]) => child !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
    .join(',')}}`
}

function normalizeSearchAfter(sort: readonly unknown[]): SearchHitSort[] {
  return sort.map((value) => {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value
    }
    return responseError()
  })
}

function resolveTotal(
  total: number | estypes.SearchTotalHits | undefined,
  partial: boolean
): { value: number; relation: 'eq' | 'gte' | 'unknown' } {
  if (total === undefined) return responseError()
  const value = typeof total === 'number' ? total : total.value
  const relation = typeof total === 'number' ? 'eq' : total.relation === 'eq' ? 'eq' : 'gte'
  if (!Number.isSafeInteger(value) || value < 0) return responseError()
  return partial ? { value, relation: 'gte' } : { value, relation }
}

function countConditions(expression: FilterExpression | undefined): number {
  if (expression === undefined) return 0
  if (expression.kind === 'condition') return 1
  return expression.children.reduce((total, child) => total + countConditions(child), 0)
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new FilterExecutionError('FILTER_REQUEST_ABORTED')
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error && (error.name === 'AbortError' || error.name === 'RequestAbortedError')
  )
}

function isExpiredSearchContext(error: unknown): boolean {
  if (error === null || typeof error !== 'object') return false
  const serialized = JSON.stringify(error)
  return serialized.includes('search_context_missing_exception') || serialized.includes('404')
}

function capabilityError(): never {
  throw new FilterExecutionError('FILTER_EXECUTOR_CAPABILITY_MISMATCH')
}

function criteriaError(): never {
  throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
}

function responseError(): never {
  throw new FilterExecutionError('FILTER_EXECUTOR_RESPONSE_INVALID')
}

function unavailableError(): never {
  throw new FilterExecutionError('FILTER_EXECUTOR_UNAVAILABLE')
}

function timeoutError(): never {
  throw new FilterExecutionError('FILTER_PROVIDER_TIMED_OUT')
}
