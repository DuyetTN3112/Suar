import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import type { SearchDiscoveryHit } from '#modules/search/public_contracts/search_discovery_contract'

export const PRINCIPAL: FilterPrincipal = { kind: 'anonymous' }

export function criteria(overrides: Partial<QueryCriteriaRequest> = {}): QueryCriteriaRequest {
  return {
    context: 'tasks.discovery.public',
    schemaVersion: 1,
    sort: [],
    page: { size: 20 },
    ...overrides,
  }
}

export function hit(id: string): SearchDiscoveryHit<{ title: string }> {
  return {
    id: `task:${id}`,
    entityType: 'task',
    entityId: id,
    source: 'tasks',
    rank: 1,
    score: 7,
    document: { title: 'PostgreSQL indexing' },
  }
}

export async function captureError(operation: () => Promise<unknown>): Promise<unknown> {
  try {
    await operation()
    return undefined
  } catch (error) {
    return error
  }
}

export function makeTaskVertical(
  seen: QueryCriteriaRequest[],
  canonicalize: (input: QueryCriteriaRequest) => QueryCriteriaRequest = (input) => input
) {
  return {
    scope: 'task' as const,
    source: 'tasks' as const,
    contexts: ['tasks.discovery.public', 'tasks.discovery.member'],
    rankingVersion: 'tasks.lexical.v1',
    supportedRetrievalModes: ['auto', 'lexical'] as const,
    execute: (input: {
      criteria: QueryCriteriaRequest
      principal: FilterPrincipal
      requestId: string
      signal?: AbortSignal
    }) => {
      seen.push(input.criteria)
      return Promise.resolve({
        context: input.criteria.context,
        schemaVersion: input.criteria.schemaVersion,
        canonicalCriteria: canonicalize(input.criteria),
        hits: [hit('task-1')],
        total: { value: 73, relation: 'eq' as const },
        facets: [
          {
            field: 'taxonomy.requiredSkills',
            countMode: 'self_excluding' as const,
            values: [
              {
                value: 'skill-postgresql',
                count: 29,
                selected: false,
                countRelation: 'exact' as const,
              },
            ],
          },
        ],
        suggestions: [],
        diagnostics: [],
        page: { nextCursor: 'opaque.next.cursor' },
        execution: {
          provider: 'elasticsearch',
          degraded: false,
          partial: false,
          requestId: input.requestId,
        },
      })
    },
  }
}
