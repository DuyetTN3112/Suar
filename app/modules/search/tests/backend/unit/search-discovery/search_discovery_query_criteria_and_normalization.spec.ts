import { test } from '@japa/runner'

import {
  captureError,
  criteria,
  hit,
  makeTaskVertical,
  PRINCIPAL,
} from '../support/search_discovery_query_test_support.js'

import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import { SearchDiscoveryQuery } from '#modules/search/actions/queries/search-discovery/search_discovery_query'
import type { SearchDiscoveryHit } from '#modules/search/public_contracts/search_discovery_contract'

test.group('Unit | Search Discovery Query - Criteria & Normalization', () => {
  test('delegates q-only, filter-only, combined, and allowed empty criteria distinctly', async ({
    assert,
  }) => {
    const seen: QueryCriteriaRequest[] = []
    const query = new SearchDiscoveryQuery({
      verticals: [makeTaskVertical(seen)],
      sessionIdGenerator: () => 'session-generated-0001',
    })
    const cases: Array<{
      expectedMode: 'query' | 'filter' | 'combined' | 'browse'
      value: QueryCriteriaRequest
    }> = [
      { expectedMode: 'query', value: criteria({ text: { value: '  postgres  ' } }) },
      {
        expectedMode: 'filter',
        value: criteria({
          filter: {
            kind: 'condition',
            field: 'task.difficulty',
            operator: 'eq',
            effect: 'require',
            value: { kind: 'scalar', value: 'advanced' },
            unknown: 'exclude',
          },
        }),
      },
      {
        expectedMode: 'combined',
        value: criteria({
          text: { value: 'postgres' },
          filter: {
            kind: 'condition',
            field: 'taxonomy.requiredSkills',
            operator: 'contains_any',
            effect: 'require',
            value: { kind: 'set', values: ['skill-postgresql'] },
            unknown: 'exclude',
          },
        }),
      },
      { expectedMode: 'browse', value: criteria() },
    ]

    for (const [index, current] of cases.entries()) {
      const result = await query.execute({
        request: { criteria: current.value, search: { scope: 'task' } },
        principal: PRINCIPAL,
        requestId: `request-${index}`,
      })

      assert.strictEqual(seen[index], current.value)
      assert.equal(result.search.inputMode, current.expectedMode)
      assert.equal(result.total.value, 73)
      assert.equal(result.authority.total.state, 'authoritative')
      assert.equal(result.authority.facets[0]?.state, 'authoritative')
      assert.equal(result.page.nextCursor, 'opaque.next.cursor')
    }
  })

  test('TC-FST-004 leaves empty-request policy decisions to the Search context executor', async ({
    assert,
  }) => {
    const emptyRequest = criteria({ filter: undefined, preferences: undefined, sort: [] })
    const defaultFilter = {
      kind: 'condition' as const,
      field: 'task.difficulty',
      operator: 'eq',
      effect: 'require' as const,
      value: { kind: 'scalar' as const, value: 'advanced' },
      unknown: 'exclude' as const,
    }
    const seen: QueryCriteriaRequest[] = []
    const query = new SearchDiscoveryQuery({
      verticals: [
        {
          ...makeTaskVertical(seen),
          execute: async (input) => {
            seen.push(input.criteria)
            if (input.criteria.context === 'tasks.discovery.public') {
              return makeTaskVertical([]).execute(input)
            }
            return Promise.reject(new FilterExecutionError('FILTER_CRITERIA_INVALID'))
          },
        },
      ],
    })

    const browseResponse = await query.execute({
      request: { criteria: emptyRequest, search: { scope: 'task' } },
      principal: PRINCIPAL,
      requestId: 'request-empty-context-browse',
    })
    assert.equal(browseResponse.search.inputMode, 'browse')
    assert.strictEqual(seen[0], emptyRequest)

    const defaultQuery = new SearchDiscoveryQuery({
      verticals: [
        {
          ...makeTaskVertical([]),
          execute: (input) =>
            makeTaskVertical([]).execute({
              ...input,
              criteria: { ...input.criteria, filter: defaultFilter },
            }),
        },
      ],
    })
    const defaultResponse = await defaultQuery.execute({
      request: { criteria: emptyRequest, search: { scope: 'task' } },
      principal: PRINCIPAL,
      requestId: 'request-empty-context-default',
    })
    assert.deepEqual(defaultResponse.canonicalCriteria.filter, defaultFilter)

    const rejectQuery = new SearchDiscoveryQuery({
      verticals: [
        {
          ...makeTaskVertical([]),
          execute: () => Promise.reject(new FilterExecutionError('FILTER_CRITERIA_INVALID')),
        },
      ],
    })
    const error = await captureError(() =>
      rejectQuery.execute({
        request: { criteria: emptyRequest, search: { scope: 'task' } },
        principal: PRINCIPAL,
        requestId: 'request-empty-context-reject',
      })
    )
    assert.instanceOf(error, FilterExecutionError)
    assert.equal((error as FilterExecutionError).code, 'FILTER_CRITERIA_INVALID')
  })

  test('returns canonical Filter criteria and stable server-owned identifiers', async ({
    assert,
  }) => {
    const seen: QueryCriteriaRequest[] = []
    const query = new SearchDiscoveryQuery({
      verticals: [
        makeTaskVertical(seen, (input) => ({
          ...input,
          text: { value: 'postgres' },
          sort: [{ field: 'task.updatedAt', direction: 'desc' }],
        })),
      ],
      sessionIdGenerator: () => 'session-generated-0002',
    })

    const result = await query.execute({
      request: {
        criteria: criteria({ text: { value: '  postgres  ' } }),
        search: { scope: 'task', retrievalMode: 'lexical' },
      },
      principal: PRINCIPAL,
      requestId: 'request-stable-1',
      searchSessionId: 'session-client-continued-1',
    })

    assert.equal(result.canonicalCriteria.text?.value, 'postgres')
    assert.deepEqual(result.canonicalCriteria.sort, [
      { field: 'task.updatedAt', direction: 'desc' },
    ])
    assert.equal(result.search.submittedQuery, '  postgres  ')
    assert.equal(result.search.normalizedQuery, 'postgres')
    assert.equal(result.search.requestId, 'request-stable-1')
    assert.equal(result.search.searchSessionId, 'session-client-continued-1')
    assert.equal(result.search.rankingVersion, 'tasks.lexical.v1')
    assert.equal(result.search.retrievalMode, 'lexical')
  })

  test('passes through provider explanation and never infers one from score', async ({ assert }) => {
    const explainedHit: SearchDiscoveryHit<{ title: string }> = {
      ...hit('task-explained'),
      explanation: {
        rankingVersion: 'tasks.lexical.v1',
        contributingSignals: [
          {
            kind: 'text_match',
            field: 'title',
            match: 'phrase',
            evidence: 'provider',
          },
          {
            kind: 'strict_filter',
            field: 'task.difficulty',
            operator: 'eq',
            evidence: 'provider',
          },
        ],
      },
    }
    const query = new SearchDiscoveryQuery({
      verticals: [
        {
          ...makeTaskVertical([]),
          execute: (input: { criteria: QueryCriteriaRequest; requestId: string }) =>
            Promise.resolve({
              context: input.criteria.context,
              schemaVersion: input.criteria.schemaVersion,
              canonicalCriteria: input.criteria,
              hits: [explainedHit],
              total: { value: 1, relation: 'eq' as const },
              facets: [],
              suggestions: [],
              diagnostics: [],
              page: {},
              execution: {
                provider: 'test',
                degraded: false,
                partial: false,
                requestId: input.requestId,
              },
            }),
        },
      ],
    })

    const result = await query.execute({
      request: { criteria: criteria({ text: { value: 'postgres' } }), search: { scope: 'task' } },
      principal: PRINCIPAL,
      requestId: 'request-explanation',
    })

    assert.deepEqual(result.hits[0]?.explanation, explainedHit.explanation)

    const noEvidenceQuery = new SearchDiscoveryQuery({
      verticals: [makeTaskVertical([])],
    })
    const noEvidenceResult = await noEvidenceQuery.execute({
      request: { criteria: criteria({ text: { value: 'postgres' } }), search: { scope: 'task' } },
      principal: PRINCIPAL,
      requestId: 'request-no-inference',
    })
    assert.isUndefined(noEvidenceResult.hits[0]?.explanation)
  })
})
