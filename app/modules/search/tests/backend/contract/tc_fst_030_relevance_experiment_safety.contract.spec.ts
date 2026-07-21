import { test } from '@japa/runner'

import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import { resolveSearchRelevanceExperiment } from '#modules/search/domain/search_relevance_experiment'
import type {
  SearchDiscoveryHit,
  SearchDiscoveryResponse,
} from '#modules/search/public_contracts/search_discovery_contract'

type Document = { readonly title: string }
type Response = SearchDiscoveryResponse<Document>

const criteria: QueryCriteriaRequest = {
  context: 'tasks.discovery.public',
  schemaVersion: 1,
  sort: [],
  page: { size: 20 },
  text: { value: 'postgres' },
  filter: {
    kind: 'condition',
    field: 'task.status',
    operator: 'eq',
    effect: 'require',
    value: { kind: 'scalar', value: 'open' },
    unknown: 'exclude',
  },
}

const authority: Response['authority'] = {
  hits: { state: 'authoritative', sources: ['tasks'] },
  total: { state: 'authoritative', sources: ['tasks'] },
  facets: [{ field: 'task.status', state: 'authoritative', sources: ['tasks'] }],
}

const facets: Response['facets'] = [
  {
    field: 'task.status',
    countMode: 'constrained',
    values: [{ value: 'open', count: 2, selected: true, countRelation: 'exact' }],
  },
]

function hit(
  id: string,
  rank: number,
  score: number,
  title = id
): SearchDiscoveryHit<Document> {
  return {
    id: `task:${id}`,
    entityType: 'task',
    entityId: id,
    source: 'tasks',
    rank,
    score,
    document: { title },
    presentation: {
      title,
      url: `/tasks/${id}`,
      sourceLabel: 'Tasks',
      snippets: [],
      breadcrumbs: [],
      primaryActionLabel: 'Open task',
    },
  }
}

function response(overrides: Partial<Response> = {}): Response {
  return {
    context: criteria.context,
    schemaVersion: criteria.schemaVersion,
    canonicalCriteria: structuredClone(criteria),
    hits: [hit('task-a', 1, 2, 'PostgreSQL'), hit('task-b', 2, 1, 'Redis')],
    total: { value: 2, relation: 'eq' },
    facets,
    suggestions: [],
    diagnostics: [],
    page: {},
    execution: {
      provider: 'elasticsearch',
      degraded: false,
      partial: false,
      requestId: 'request-tc-fst-030',
    },
    search: {
      scope: 'task',
      inputMode: 'combined',
      submittedQuery: 'postgres',
      normalizedQuery: 'postgres',
      retrievalMode: 'hybrid',
      rankingVersion: 'tasks.lexical.v1',
      searchSessionId: 'session-tc-fst-030',
      requestId: 'request-tc-fst-030',
      diagnostics: [],
      sources: [
        {
          source: 'tasks',
          state: 'ok',
          authority: 'authoritative',
          resultCount: 2,
          total: { value: 2, relation: 'eq' },
          facets,
          diagnosticCodes: [],
        },
      ],
    },
    authority,
    ...overrides,
  }
}

function malformedResponse(): Response {
  const malformed = response()
  Object.assign(malformed, { search: undefined })
  return malformed
}

test.group('TC-FST-030 | relevance experiment safety contract', () => {
  test('preview accepts only a reordered candidate with explicit version and unchanged authority surface', async ({
    assert,
  }) => {
    const baseline = response()
    const candidate = response({
      hits: [hit('task-b', 1, 9, 'Redis'), hit('task-a', 2, 8, 'PostgreSQL')],
      search: { ...baseline.search, rankingVersion: 'tasks.hybrid.v2' },
    })

    const result = await resolveSearchRelevanceExperiment({
      baseline,
      candidate: () => Promise.resolve(candidate),
      options: { mode: 'preview', rankingVersion: 'tasks.hybrid.v2' },
    })

    assert.equal(result.decision, 'preview')
    assert.deepEqual(result.response.hits.map(({ id }) => id), ['task:task-b', 'task:task-a'])
    assert.deepEqual(result.response.facets, baseline.facets)
    assert.deepEqual(result.response.authority, baseline.authority)
    assert.equal(result.response.search.rankingVersion, 'tasks.hybrid.v2')
  })

  test('shadow observes a valid ranking candidate but always returns the authoritative baseline', async ({
    assert,
  }) => {
    const baseline = response()
    let candidateCalls = 0

    const result = await resolveSearchRelevanceExperiment({
      baseline,
      candidate: () => {
        candidateCalls += 1
        return Promise.resolve(response({
          hits: [hit('task-b', 1, 9, 'Redis'), hit('task-a', 2, 8, 'PostgreSQL')],
          search: { ...baseline.search, rankingVersion: 'tasks.rule.v3' },
        }))
      },
      options: { mode: 'shadow', rankingVersion: 'tasks.rule.v3' },
    })

    assert.equal(candidateCalls, 1)
    assert.equal(result.decision, 'shadow')
    assert.strictEqual(result.response, baseline)
  })

  test('falls back to baseline when candidate execution or ranking identity is unsafe', async ({
    assert,
  }) => {
    const baseline = response()
    const failures = [
      {
        candidate: () => Promise.reject(new Error('hybrid provider unavailable')),
        reason: 'candidate_failed' as const,
      },
      {
        candidate: () => Promise.resolve(malformedResponse()),
        reason: 'candidate_failed' as const,
      },
      {
        candidate: () =>
          Promise.resolve(response({ search: { ...baseline.search, rankingVersion: 'tasks.hybrid.v1' } })),
        reason: 'ranking_version_mismatch' as const,
      },
      {
        candidate: () =>
          Promise.resolve(response({
            hits: [hit('task-secret', 1, 99, 'Private task')],
            search: { ...baseline.search, rankingVersion: 'tasks.hybrid.v2' },
          })),
        reason: 'eligibility_changed' as const,
      },
      {
        candidate: () =>
          Promise.resolve(response({
            facets: [],
            search: { ...baseline.search, rankingVersion: 'tasks.hybrid.v2' },
          })),
        reason: 'facets_changed' as const,
      },
      {
        candidate: () =>
          Promise.resolve(response({
            authority: {
              ...baseline.authority,
              hits: { state: 'partial', sources: ['tasks'] },
            },
            search: { ...baseline.search, rankingVersion: 'tasks.hybrid.v2' },
          })),
        reason: 'authorization_changed' as const,
      },
    ]

    for (const failure of failures) {
      const result = await resolveSearchRelevanceExperiment({
        baseline,
        candidate: failure.candidate,
        options: { mode: 'preview', rankingVersion: 'tasks.hybrid.v2' },
      })

      assert.equal(result.decision, 'fallback')
      assert.equal(result.reason, failure.reason)
      assert.strictEqual(result.response, baseline)
    }
  })
})
