import type { Client, estypes } from '@elastic/elasticsearch'

import { isAbortError, timeoutError } from './elasticsearch_filter_executor_helpers.js'

import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { ElasticsearchFacetPlan } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_facet_compiler'


export type FacetSearchResponse = estypes.SearchResponse<Record<string, never>>

export type FacetExecution =
  | { readonly plan: ElasticsearchFacetPlan; readonly response: FacetSearchResponse }
  | { readonly plan: ElasticsearchFacetPlan; readonly failed: true }

export interface ExecuteFacetsOptions {
  readonly client: Client
  readonly plans: readonly ElasticsearchFacetPlan[]
  readonly pitId: string
  readonly pitKeepAlive: string
  readonly requestTimeoutMs: number
  readonly degradationPolicy: 'fail_closed' | 'explicit_partial' | string
  readonly signal?: AbortSignal
}

export async function executeElasticsearchFacets(
  options: ExecuteFacetsOptions
): Promise<FacetExecution[]> {
  const { client, plans, pitId, pitKeepAlive, requestTimeoutMs, degradationPolicy, signal } = options

  return Promise.all(
    plans.map(async (plan): Promise<FacetExecution> => {
      try {
        const facetResponse = await client.search<Record<string, never>>(
          {
            pit: { id: pitId, keep_alive: pitKeepAlive },
            query: plan.query,
            aggregations: plan.aggregations,
            ...(plan.runtimeMappings === undefined ? {} : { runtime_mappings: plan.runtimeMappings }),
            size: 0,
            track_total_hits: true,
            allow_partial_search_results: degradationPolicy === 'explicit_partial',
            timeout: `${requestTimeoutMs}ms`,
          },
          signal === undefined ? undefined : { signal }
        )
        if (facetResponse.timed_out) timeoutError()
        return { plan, response: facetResponse }
      } catch (error) {
        if (signal?.aborted || isAbortError(error)) {
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
        if (degradationPolicy !== 'explicit_partial') throw error
        return { plan, failed: true }
      }
    })
  )
}
