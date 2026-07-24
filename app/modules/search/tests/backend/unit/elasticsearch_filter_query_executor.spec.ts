import type { Client } from '@elastic/elasticsearch'
import { test } from '@japa/runner'

import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import { ElasticsearchCursorCodec } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_cursor_codec'
import {
  ElasticsearchFilterQueryExecutor,
  type ElasticsearchFilterExecutorInput,
} from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_query_executor'

const definition: ElasticsearchFilterExecutorInput<object>['definition'] = {
  key: 'filter.elasticsearch.atomic-target.unit',
  version: 1,
  resource: 'search-document',
  ownerModule: 'Search',
  capabilities: {
    text: false,
    facets: true,
    nestedGroups: true,
    preferences: true,
    relativeTime: true,
    savedViews: false,
    sharedViews: false,
    alerts: false,
    emptyRequest: true,
    pagination: 'cursor',
    maxDepth: 8,
    maxConditions: 200,
  },
  fields: [
    {
      key: 'id',
      type: 'scalar',
      operators: [],
      effects: ['require', 'exclude'],
      defaultUnknown: 'exclude',
      facetable: false,
      sortable: true,
      projectable: true,
      preference: true,
      valueSearch: false,
      facetCountModes: ['constrained', 'self_excluding'],
      cost: 1,
    },
  ],
  sorts: [{ field: 'id', directions: ['asc', 'desc'] }],
  defaultSort: [{ field: 'id', direction: 'asc' }],
  executionProfile: 'elasticsearch.atomic-target.unit.v1',
  degradationPolicy: 'fail_closed',
  limits: {
    maxPageSize: 100,
    maxFacetRequests: 8,
    maxProjectionFields: 20,
    maxSorts: 4,
    maxSetValues: 100,
    maxTextLength: 200,
    maxRelationDepth: 2,
    maxCost: 1_000,
  },
}

test.group('ElasticsearchFilterQueryExecutor', () => {
  test('uses fuzzy and prefix matching for Discovery text queries', async ({ assert }) => {
    let capturedQuery: unknown
    const client = {
      fieldCaps: () => Promise.resolve({ fields: { id: { keyword: { type: 'keyword' } } } }),
      openPointInTime: () => Promise.resolve({ id: 'text-query-pit' }),
      search: ({ query }: { query: unknown }) => {
        capturedQuery = query
        return Promise.resolve({
          pit_id: 'text-query-pit',
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
        })
      },
      closePointInTime: () => Promise.resolve({ succeeded: true, num_freed: 1 }),
    } as unknown as Client
    const executor = new ElasticsearchFilterQueryExecutor({
      client,
      indexName: 'talents-text-query',
      profile: definition.executionProfile,
      bindings: { id: { type: 'scalar', path: 'id', sortable: true } },
      idField: 'id',
      textFields: ['username^5'],
      cursorCodec: new ElasticsearchCursorCodec({
        secret: 'search-text-query-fuzzy-prefix-cursor-secret',
        ttlMs: 60_000,
      }),
      rankingVersion: 'ranking-v1',
      resolveIndexGeneration: () => Promise.resolve('text-query-generation'),
      mapHit: ({ source }) => source,
    })

    await executor.execute({
      definition: { ...definition, capabilities: { ...definition.capabilities, text: true } },
      criteria: {
        context: definition.key,
        schemaVersion: definition.version,
        text: { value: 'duyet' },
        sort: [],
        page: { size: 10 },
      },
      authorizationBinding: {},
      requestId: 'search-text-query-fuzzy-prefix',
    })

    assert.deepEqual(capturedQuery, {
      bool: {
        filter: [{ match_all: {} }],
        must: [
          {
            bool: {
              should: [
                {
                  multi_match: {
                    query: 'duyet',
                    fields: ['username^5'],
                    type: 'best_fields',
                    fuzziness: 'AUTO',
                  },
                },
                {
                  multi_match: {
                    query: 'duyet',
                    fields: ['username^5'],
                    type: 'phrase_prefix',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    })
  })

  test('uses one resolved physical target for mapping validation, PIT and cursor generation', async ({
    assert,
  }) => {
    const requestedIndices: string[] = []
    let aliasTarget = 'tasks-blue'
    const client = {
      fieldCaps: ({ index }: { index: string }) => {
        requestedIndices.push(`field-caps:${index}`)
        return Promise.resolve({ fields: { id: { keyword: { type: 'keyword' } } } })
      },
      openPointInTime: ({ index }: { index: string }) => {
        requestedIndices.push(`pit:${index}`)
        return Promise.resolve({ id: 'pit-blue' })
      },
      search: () =>
        Promise.resolve({
          pit_id: 'pit-blue',
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: {
            total: { value: 2, relation: 'eq' },
            max_score: null,
            hits: [
              {
                _index: 'tasks-blue',
                _id: 'blue-result',
                _score: null,
                _source: { id: 'blue-result' },
                sort: ['blue-result'],
              },
            ],
          },
        }),
      closePointInTime: () => Promise.resolve({ succeeded: true, num_freed: 1 }),
    } as unknown as Client
    const executor = new ElasticsearchFilterQueryExecutor({
      client,
      indexName: 'tasks-read-alias',
      profile: definition.executionProfile,
      bindings: { id: { type: 'scalar', path: 'id', sortable: true } },
      idField: 'id',
      cursorCodec: new ElasticsearchCursorCodec({
        secret: 'wp13-atomic-target-unit-cursor-secret-long-enough',
        ttlMs: 60_000,
      }),
      rankingVersion: 'ranking-v1',
      resolveIndexTarget: () => {
        const physicalIndexName = aliasTarget
        const generation =
          physicalIndexName === 'tasks-blue' ? 'generation-blue' : 'generation-green'
        aliasTarget = 'tasks-green'
        return Promise.resolve({ physicalIndexName, generation })
      },
      mapHit: ({ source }) => source,
    })
    const criteria: QueryCriteriaRequest = {
      context: definition.key,
      schemaVersion: definition.version,
      sort: [{ field: 'id', direction: 'asc' }],
      page: { size: 1 },
    }

    const result = await executor.execute({
      definition,
      criteria,
      authorizationBinding: { authorizationVersion: 'auth-v1' },
      requestId: 'wp13-atomic-target-unit',
    })

    assert.equal(aliasTarget, 'tasks-green')
    assert.deepEqual(requestedIndices, ['field-caps:tasks-blue', 'pit:tasks-blue'])
    assert.deepEqual(result.hits, [{ id: 'blue-result' }])
    assert.deepEqual(result.total, { value: 2, relation: 'eq' })
    const cursor = result.page.nextCursor
    if (cursor === undefined) throw new Error('Expected a generation-bound cursor')

    const cutover = await executor
      .execute({
        definition,
        criteria: { ...criteria, page: { size: 1, cursor } },
        authorizationBinding: { authorizationVersion: 'auth-v1' },
        requestId: 'wp13-atomic-target-unit-after-cutover',
      })
      .catch((error: unknown) => error)
    assert.instanceOf(cutover, FilterExecutionError)
    assert.equal((cutover as FilterExecutionError).code, 'FILTER_CURSOR_STALE')
    assert.deepEqual(requestedIndices, [
      'field-caps:tasks-blue',
      'pit:tasks-blue',
      'field-caps:tasks-green',
    ])
  })

  test('keeps the generation-only resolver as a compatibility path', async ({ assert }) => {
    const requestedIndices: string[] = []
    const client = {
      fieldCaps: ({ index }: { index: string }) => {
        requestedIndices.push(`field-caps:${index}`)
        return Promise.resolve({ fields: { id: { keyword: { type: 'keyword' } } } })
      },
      openPointInTime: ({ index }: { index: string }) => {
        requestedIndices.push(`pit:${index}`)
        return Promise.resolve({ id: 'legacy-pit' })
      },
      search: () =>
        Promise.resolve({
          pit_id: 'legacy-pit',
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
        }),
      closePointInTime: () => Promise.resolve({ succeeded: true, num_freed: 1 }),
    } as unknown as Client
    const executor = new ElasticsearchFilterQueryExecutor({
      client,
      indexName: 'legacy-physical-index',
      profile: definition.executionProfile,
      bindings: { id: { type: 'scalar', path: 'id', sortable: true } },
      idField: 'id',
      cursorCodec: new ElasticsearchCursorCodec({
        secret: 'wp13-legacy-target-unit-cursor-secret-long-enough',
        ttlMs: 60_000,
      }),
      rankingVersion: 'ranking-v1',
      resolveIndexGeneration: () => Promise.resolve('legacy-generation'),
      mapHit: ({ source }) => source,
    })

    await executor.execute({
      definition,
      criteria: {
        context: definition.key,
        schemaVersion: definition.version,
        sort: [{ field: 'id', direction: 'asc' }],
        page: { size: 10 },
      },
      authorizationBinding: { authorizationVersion: 'auth-v1' },
      requestId: 'wp13-legacy-target-unit',
    })

    assert.deepEqual(requestedIndices, [
      'field-caps:legacy-physical-index',
      'pit:legacy-physical-index',
    ])
  })

  test('keeps the PIT lease at least as long as the signed cursor TTL by default', async ({
    assert,
  }) => {
    const pitLeases: string[] = []
    const client = {
      fieldCaps: () => Promise.resolve({ fields: { id: { keyword: { type: 'keyword' } } } }),
      openPointInTime: ({ keep_alive }: { keep_alive: string }) => {
        pitLeases.push(`open:${keep_alive}`)
        return Promise.resolve({ id: 'ttl-aligned-pit' })
      },
      search: ({ pit }: { pit: { keep_alive: string } }) => {
        pitLeases.push(`search:${pit.keep_alive}`)
        return Promise.resolve({
          pit_id: 'ttl-aligned-pit',
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
        })
      },
      closePointInTime: () => Promise.resolve({ succeeded: true, num_freed: 1 }),
    } as unknown as Client
    const executor = new ElasticsearchFilterQueryExecutor({
      client,
      indexName: 'tasks-ttl-alignment',
      profile: definition.executionProfile,
      bindings: { id: { type: 'scalar', path: 'id', sortable: true } },
      idField: 'id',
      cursorCodec: new ElasticsearchCursorCodec({
        secret: 'wp13-ttl-alignment-unit-cursor-secret-long-enough',
        ttlMs: 300_000,
      }),
      rankingVersion: 'ranking-v1',
      resolveIndexGeneration: () => Promise.resolve('ttl-alignment-generation'),
      mapHit: ({ source }) => source,
    })

    await executor.execute({
      definition,
      criteria: {
        context: definition.key,
        schemaVersion: definition.version,
        sort: [{ field: 'id', direction: 'asc' }],
        page: { size: 10 },
      },
      authorizationBinding: { authorizationVersion: 'auth-v1' },
      requestId: 'wp13-ttl-alignment-unit',
    })

    assert.deepEqual(pitLeases, ['open:300s', 'search:300s'])
  })

  test('returns hits with a field-attributed partial facet when an opted-in facet times out', async ({
    assert,
  }) => {
    let searchCalls = 0
    const client = {
      fieldCaps: () => Promise.resolve({ fields: { id: { keyword: { type: 'keyword' } } } }),
      openPointInTime: () => Promise.resolve({ id: 'partial-facet-pit' }),
      closePointInTime: () => Promise.resolve({ succeeded: true, num_freed: 1 }),
      search: () => {
        searchCalls += 1
        if (searchCalls === 2) return Promise.reject(new Error('facet timeout'))
        return Promise.resolve({
          pit_id: 'partial-facet-pit',
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: {
            total: { value: 1, relation: 'eq' },
            max_score: 1,
            hits: [
              {
                _index: 'tasks-partial-facet',
                _id: 'task-1',
                _score: 1,
                _source: { id: 'task-1' },
                sort: ['task-1'],
              },
            ],
          },
        })
      },
    } as unknown as Client
    const executor = new ElasticsearchFilterQueryExecutor({
      client,
      indexName: 'tasks-partial-facet',
      profile: definition.executionProfile,
      bindings: { id: { type: 'scalar', path: 'id', sortable: true, facetable: true } },
      idField: 'id',
      cursorCodec: new ElasticsearchCursorCodec({
        secret: 'wp16-partial-facet-unit-cursor-secret-long-enough',
        ttlMs: 60_000,
      }),
      rankingVersion: 'ranking-v1',
      resolveIndexGeneration: () => Promise.resolve('partial-facet-generation'),
      mapHit: ({ source }) => source,
    })
    const baseField = definition.fields[0]
    if (baseField === undefined) throw new Error('Expected unit definition field')
    const partialDefinition = {
      ...definition,
      degradationPolicy: 'explicit_partial' as const,
      fields: [
        {
          ...baseField,
          facetable: true,
        },
      ],
    }

    const result = await executor.execute({
      definition: partialDefinition,
      criteria: {
        context: definition.key,
        schemaVersion: definition.version,
        sort: [{ field: 'id', direction: 'asc' }],
        requestedFacets: [{ field: 'id', countMode: 'constrained' }],
        page: { size: 10 },
      },
      authorizationBinding: { authorizationVersion: 'auth-v1' },
      requestId: 'wp16-partial-facet-unit',
    })

    assert.deepEqual(result.hits, [{ id: 'task-1' }])
    assert.deepEqual(result.total, { value: 1, relation: 'eq' })
    assert.deepEqual(result.facets, [])
    assert.isTrue(result.partial)
    assert.isTrue(result.degraded)
    assert.deepInclude(result.diagnostics, {
      code: 'FILTER_PROVIDER_DEGRADED',
      severity: 'warning',
      field: 'id',
    })
  })
})
