import { test } from '@japa/runner'

import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'
import type {
  QueryCriteriaRequest,
  QueryCriteriaResponse,
} from '#modules/filtering/public_contracts/filter_query'
import { SearchDiscoveryQuery } from '#modules/search/actions/queries/search-discovery/search_discovery_query'
import { resolveSearchRelevanceExperiment } from '#modules/search/domain/search_relevance_experiment'
import type { SearchDiscoveryHit } from '#modules/search/public_contracts/search_discovery_contract'

type Document = { readonly title: string }
type Hit = SearchDiscoveryHit<Document>

const principal: FilterPrincipal = { kind: 'anonymous' }

function criteria(): QueryCriteriaRequest {
  return {
    context: 'tasks.discovery.public',
    schemaVersion: 1,
    sort: [],
    page: { size: 20 },
    text: { value: 'postgres' },
  }
}

function hit(id: string, title: string, score: number): Hit {
  return {
    id: `task:${id}`,
    entityType: 'task',
    entityId: id,
    source: 'tasks',
    rank: 1,
    score,
    document: { title },
  }
}

function providerResult(input: {
  readonly criteria: QueryCriteriaRequest
  readonly requestId: string
}): QueryCriteriaResponse<Hit> {
  return {
    context: input.criteria.context,
    schemaVersion: input.criteria.schemaVersion,
    canonicalCriteria: input.criteria,
    hits: [hit('task-a', 'PostgreSQL', 2), hit('task-b', 'Redis', 1)],
    total: { value: 2, relation: 'eq' },
    facets: [
      {
        field: 'task.status',
        countMode: 'constrained',
        values: [{ value: 'open', count: 2, selected: false, countRelation: 'exact' }],
      },
    ],
    suggestions: [],
    diagnostics: [],
    page: {},
    execution: {
      provider: 'elasticsearch',
      degraded: false,
      partial: false,
      requestId: input.requestId,
    },
  }
}

test.group('TC-FST-030 | Search Discovery integration', () => {
  test('keeps Search Discovery eligibility/facets authoritative while previewing a hybrid reorder', async ({
    assert,
  }) => {
    const query = new SearchDiscoveryQuery({
      verticals: [
        {
          scope: 'task',
          source: 'tasks',
          contexts: ['tasks.discovery.public'],
          rankingVersion: 'tasks.lexical.v1',
          supportedRetrievalModes: ['auto', 'lexical', 'hybrid'],
          execute: ({ criteria: inputCriteria, requestId }) =>
            Promise.resolve(providerResult({ criteria: inputCriteria, requestId })),
        },
      ],
      sessionIdGenerator: () => 'session-tc-fst-030',
    })

    const baseline = await query.execute({
      request: { criteria: criteria(), search: { scope: 'task', retrievalMode: 'lexical' } },
      principal,
      requestId: 'request-tc-fst-030',
    })
    const candidate = {
      ...baseline,
      hits: [...baseline.hits]
        .reverse()
        .map((current, index) => ({ ...current, rank: index + 1, score: (current.score ?? 0) + 5 })),
      search: { ...baseline.search, rankingVersion: 'tasks.hybrid.v2' },
    }

    const result = await resolveSearchRelevanceExperiment({
      baseline,
      candidate: () => Promise.resolve(candidate),
      options: { mode: 'preview', rankingVersion: 'tasks.hybrid.v2' },
    })

    assert.equal(result.decision, 'preview')
    assert.deepEqual(result.response.hits.map(({ id }) => id), ['task:task-b', 'task:task-a'])
    assert.deepEqual(result.response.total, baseline.total)
    assert.deepEqual(result.response.facets, baseline.facets)
    assert.deepEqual(result.response.authority, baseline.authority)
    assert.equal(result.response.search.rankingVersion, 'tasks.hybrid.v2')
  })
})
