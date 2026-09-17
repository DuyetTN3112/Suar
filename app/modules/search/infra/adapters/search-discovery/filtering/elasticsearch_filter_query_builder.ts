import type { Client, estypes } from '@elastic/elasticsearch'

import {
  capabilityError,
  collectRequiredMappingPaths,
  criteriaWithoutCursor,
  hashValue,
  shouldUseFuzzyMatching,
} from './elasticsearch_filter_executor_helpers.js'
import type {
  ElasticsearchFilterExecutorInput,
  ElasticsearchResolvedIndexTarget,
} from './elasticsearch_filter_query_executor.js'

import {
  type ElasticsearchCursorIdentity,
  type ElasticsearchCursorSort,
} from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_cursor_codec'
import type { ElasticsearchSemanticBindings } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_compiler'

export interface ResolvedSort {
  readonly identity: readonly ElasticsearchCursorSort[]
  readonly elasticsearch: readonly estypes.SortCombinations[]
  readonly explicit: boolean
}

export function resolveSort<TAuthorization extends object>(
  input: ElasticsearchFilterExecutorInput<TAuthorization>,
  bindings: ElasticsearchSemanticBindings,
  idField: string,
  idPath: string
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
      const binding = bindings[requestedSort.field]
      if (binding === undefined || binding.sortable !== true) {
        capabilityError()
      }
      identity.push(requestedSort)
      elasticsearch.push({ [binding.path]: { order: requestedSort.direction } })
    }
  }
  if (!identity.some(({ field }) => field === idField)) {
    identity.push({ field: idField, direction: 'asc' })
    elasticsearch.push({ [idPath]: { order: 'asc' } })
  }
  return { identity, elasticsearch, explicit }
}

export function compileTextQuery(
  text: string | undefined,
  textFields: readonly string[]
): estypes.QueryDslQueryContainer | undefined {
  if (text === undefined || text.trim().length === 0) return undefined
  if (textFields.length === 0) capabilityError()
  return {
    bool: {
      should: [
        {
          multi_match: {
            query: text,
            fields: [...textFields],
            type: 'best_fields',
            ...(shouldUseFuzzyMatching(text) ? { fuzziness: 'AUTO' } : {}),
          },
        },
        {
          multi_match: {
            query: text,
            fields: [...textFields],
            type: 'phrase_prefix',
          },
        },
      ],
      minimum_should_match: 1,
    },
  }
}

export function createCursorIdentity<TAuthorization extends object>(
  input: ElasticsearchFilterExecutorInput<TAuthorization>,
  sort: readonly ElasticsearchCursorSort[],
  rankingVersion: string,
  generation: string
): ElasticsearchCursorIdentity {
  return {
    context: input.criteria.context,
    schemaVersion: input.criteria.schemaVersion,
    criteriaHash: hashValue(criteriaWithoutCursor(input.criteria)),
    authorizationHash: hashValue(input.authorizationBinding),
    sort,
    rankingVersion,
    indexGeneration: generation,
  }
}

export async function closePit(client: Client, pitId: string): Promise<void> {
  await client.closePointInTime({ id: pitId }).catch(() => undefined)
}

export async function assertMappingsReady(
  client: Client,
  bindings: ElasticsearchSemanticBindings,
  indexTarget: ElasticsearchResolvedIndexTarget,
  validatedCache: Set<string>
): Promise<void> {
  const cacheKey = `${indexTarget.physicalIndexName}\u0000${indexTarget.generation}`
  if (validatedCache.has(cacheKey)) return
  const requiredPaths = collectRequiredMappingPaths(bindings)
  const response = await client.fieldCaps({
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
  validatedCache.add(cacheKey)
}
