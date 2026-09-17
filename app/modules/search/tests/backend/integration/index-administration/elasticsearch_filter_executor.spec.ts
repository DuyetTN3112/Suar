import { randomUUID } from 'node:crypto'

import type { Client } from '@elastic/elasticsearch'
import { test } from '@japa/runner'

import {
  bindings,
  integrationMappings,
  definition,
  condition,
  request,
} from '../support/elasticsearch_filter_executor_fixtures.js'

import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import { ElasticsearchCursorCodec } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_cursor_codec'
import { ElasticsearchFilterQueryExecutor } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_query_executor'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

test.group('Integration | Elasticsearch filter executor', (group) => {
  let client: Client
  let indexName: string
  let executor: ElasticsearchFilterQueryExecutor<Record<string, unknown>>
  let generation = 'generation-blue'

  group.setup(async () => {
    await setupApp()
    ;({ searchClient: client } = await import('#platform/search/elasticsearch_client'))
    const prefix = process.env['ELASTICSEARCH_TEST_INDEX_PREFIX']
    if (prefix === undefined) throw new Error('ELASTICSEARCH_TEST_INDEX_PREFIX is required')
    indexName = `${prefix}wp13_${randomUUID().replaceAll('-', '')}`
    await client.indices.create({
      index: indexName,
      mappings: integrationMappings,
    })
    const documents = [
      {
        id: 'r1',
        tenant: 'org-a',
        status: 'open',
        title: 'TypeScript Redis search',
        skills: ['typescript', 'redis'],
        skills_known: true,
        skills_count: 2,
        score: 10,
        created_at: '2026-07-31T00:00:00.000Z',
      },
      {
        id: 'r2',
        tenant: 'org-a',
        status: 'open',
        title: 'Frontend TypeScript',
        skills: ['typescript'],
        skills_known: true,
        skills_count: 1,
        score: 20,
        created_at: '2026-07-20T00:00:00.000Z',
      },
      {
        id: 'r3',
        tenant: 'org-a',
        status: 'closed',
        title: 'Known empty skills',
        skills: [],
        skills_known: true,
        skills_count: 0,
        score: 30,
      },
      {
        id: 'r-secret',
        tenant: 'org-secret',
        status: 'open',
        title: 'Secret acquisition',
        skills: ['secret-skill'],
        skills_known: true,
        skills_count: 1,
        score: 100,
      },
    ]
    await client.bulk({
      refresh: true,
      operations: documents.flatMap((document) => [
        { index: { _index: indexName, _id: document.id } },
        document,
      ]),
    })
    executor = new ElasticsearchFilterQueryExecutor({
      client,
      indexName,
      profile: definition.executionProfile,
      bindings,
      idField: 'id',
      textFields: ['title'],
      cursorCodec: new ElasticsearchCursorCodec({
        secret: 'wp13-integration-cursor-secret-long-enough',
        ttlMs: 60_000,
      }),
      rankingVersion: 'ranking-v1',
      resolveIndexGeneration: () => Promise.resolve(generation),
      mapHit: ({ source }) => source,
      requestTimeoutMs: 5_000,
      pitKeepAlive: '1m',
      maxFacetValues: 1,
    })
  })

  group.teardown(async () => {
    await client.indices.delete({ index: indexName }, { ignore: [404] })
    await teardownApp()
  })

  test('keeps hits, exact total, facets, selected-zero and cursor inside authorization scope', async ({
    assert,
  }) => {
    const filter = condition('status', 'eq', { kind: 'scalar', value: 'open' })
    const firstInput = request(executor, {
      filter,
      sort: [{ field: 'score', direction: 'asc' }],
      requestedFacets: [{ field: 'skills', countMode: 'constrained' }],
      page: { size: 1 },
    })
    const first = await executor.execute(firstInput)
    assert.deepEqual(
      first.hits.map(({ id }) => id),
      ['r1']
    )
    assert.deepEqual(first.total, { value: 2, relation: 'eq' })
    assert.notInclude(JSON.stringify(first.facets), 'secret-skill')
    assert.deepEqual(first.facets[0]?.truth, {
      missing: { value: 0, countRelation: 'exact' },
      coverage: { known: 2, total: 2, ratio: 1, countRelation: 'exact' },
    })
    assert.strictEqual(first.authorizationEvidence.facets, firstInput.authorizationBinding)
    assert.isString(first.page.nextCursor)
    assert.isString(first.facets[0]?.nextCursor)
    const firstCursor = first.page.nextCursor
    if (firstCursor === undefined) throw new Error('Expected first-page cursor')
    const firstFacetCursor = first.facets[0]?.nextCursor
    if (firstFacetCursor === undefined) throw new Error('Expected high-cardinality facet cursor')

    const second = await executor.execute(
      request(executor, {
        filter,
        sort: [{ field: 'score', direction: 'asc' }],
        requestedFacets: [{ field: 'skills', countMode: 'constrained' }],
        page: { size: 1, cursor: firstCursor },
      })
    )
    assert.deepEqual(
      second.hits.map(({ id }) => id),
      ['r2']
    )
    assert.isUndefined(second.page.nextCursor)

    const nextFacet = await executor.execute(
      request(executor, {
        filter,
        requestedFacets: [{ field: 'skills', countMode: 'constrained', cursor: firstFacetCursor }],
      })
    )
    assert.deepEqual(nextFacet.facets[0]?.values, [
      { value: 'typescript', count: 2, countRelation: 'exact', selected: false },
    ])

    const searchedFacet = await executor.execute(
      request(executor, {
        filter,
        requestedFacets: [{ field: 'skills', countMode: 'constrained', valueSearch: 'SCRIPT' }],
      })
    )
    assert.deepEqual(searchedFacet.facets[0]?.values, [
      { value: 'typescript', count: 2, countRelation: 'exact', selected: false },
    ])

    const selectedZero = await executor.execute(
      request(executor, {
        filter: condition('skills', 'contains_any', { kind: 'set', values: ['go'] }),
        requestedFacets: [{ field: 'skills', countMode: 'constrained' }],
      })
    )
    assert.deepEqual(selectedZero.facets[0]?.values, [
      { value: 'go', count: 0, countRelation: 'exact', selected: true },
    ])
  }).timeout(15_000)

  test('does not disclose a foreign tenant private value through discovery output surfaces', async ({
    assert,
  }) => {
    const privateValue = 'secret-skill'
    const result = await executor.execute(
      request(executor, {
        text: { value: 'Secret acquisition' },
        requestedFacets: [{ field: 'skills', countMode: 'constrained', valueSearch: 'secret' }],
      })
    )

    assert.deepEqual(result.hits, [])
    assert.deepEqual(result.total, { value: 0, relation: 'eq' })
    assert.deepEqual(result.facets[0]?.values, [])
    assert.deepEqual(result.suggestions, [])
    assert.deepEqual(result.diagnostics, [])
    assert.notInclude(JSON.stringify(result), privateValue)
    assert.notInclude(JSON.stringify(result), 'r-secret')
    assert.notInclude(JSON.stringify(result), 'Secret acquisition')
  }).timeout(15_000)

  test('rejects abort, unavailable index and alias generation change with stable diagnostics', async ({
    assert,
    cleanup,
  }) => {
    const controller = new AbortController()
    controller.abort()
    const aborted = await executor
      .execute({ ...request(executor), signal: controller.signal })
      .catch((error: unknown) => error)
    assert.instanceOf(aborted, FilterExecutionError)
    assert.equal((aborted as FilterExecutionError).code, 'FILTER_REQUEST_ABORTED')

    const missing = new ElasticsearchFilterQueryExecutor({
      client,
      indexName: `${indexName}_missing`,
      profile: 'elasticsearch.integration.missing',
      bindings,
      idField: 'id',
      cursorCodec: new ElasticsearchCursorCodec({
        secret: 'wp13-missing-index-cursor-secret-long-enough',
        ttlMs: 60_000,
      }),
      rankingVersion: 'ranking-v1',
      resolveIndexGeneration: () => Promise.resolve('missing-generation'),
      mapHit: ({ source }) => source,
    })
    const unavailable = await missing.execute(request(missing)).catch((error: unknown) => error)
    assert.instanceOf(unavailable, FilterExecutionError)
    assert.equal((unavailable as FilterExecutionError).code, 'FILTER_EXECUTOR_UNAVAILABLE')

    const unmappedIndex = `${indexName}_unmapped_${randomUUID().replaceAll('-', '')}`
    cleanup(async () => {
      await client.indices.delete({ index: unmappedIndex }, { ignore: [404] })
    })
    const { created_at: _missingCreatedAt, ...propertiesWithoutCreatedAt } =
      integrationMappings.properties
    await client.indices.create({
      index: unmappedIndex,
      mappings: { ...integrationMappings, properties: propertiesWithoutCreatedAt },
    })
    const unmapped = new ElasticsearchFilterQueryExecutor({
      client,
      indexName: unmappedIndex,
      profile: 'elasticsearch.integration.unmapped',
      bindings,
      idField: 'id',
      cursorCodec: new ElasticsearchCursorCodec({
        secret: 'wp13-unmapped-field-cursor-secret-long-enough',
        ttlMs: 60_000,
      }),
      rankingVersion: 'ranking-v1',
      resolveIndexGeneration: () => Promise.resolve(unmappedIndex),
      mapHit: ({ source }) => source,
    })
    const incompatible = await unmapped.execute(request(unmapped)).catch((error: unknown) => error)
    assert.instanceOf(incompatible, FilterExecutionError)
    assert.equal((incompatible as FilterExecutionError).code, 'FILTER_EXECUTOR_CAPABILITY_MISMATCH')

    const first = await executor.execute(request(executor, { page: { size: 1 } }))
    const firstCursor = first.page.nextCursor
    if (firstCursor === undefined) throw new Error('Expected cutover cursor')

    const tamperedCursor = `${firstCursor.slice(0, -1)}${firstCursor.endsWith('x') ? 'y' : 'x'}`
    const tampered = await executor
      .execute(request(executor, { page: { size: 1, cursor: tamperedCursor } }))
      .catch((error: unknown) => error)
    assert.instanceOf(tampered, FilterExecutionError)
    assert.equal((tampered as FilterExecutionError).code, 'FILTER_CURSOR_INVALID')

    generation = 'generation-green'
    const cutover = await executor
      .execute(request(executor, { page: { size: 1, cursor: firstCursor } }))
      .catch((error: unknown) => error)
    assert.instanceOf(cutover, FilterExecutionError)
    assert.equal((cutover as FilterExecutionError).code, 'FILTER_CURSOR_STALE')
    generation = 'generation-blue'
  }).timeout(15_000)

  test('pins mapping validation and PIT to the resolved physical generation across alias cutover', async ({
    assert,
    cleanup,
  }) => {
    const suffix = randomUUID().replaceAll('-', '')
    const blueIndex = `${indexName}_cutover_blue_${suffix}`
    const greenIndex = `${indexName}_cutover_green_${suffix}`
    const alias = `${indexName}_cutover_alias_${suffix}`
    cleanup(async () => {
      await client.indices.delete({ index: [blueIndex, greenIndex] }, { ignore: [404] })
    })

    await client.indices.create({ index: blueIndex, mappings: integrationMappings })
    const { created_at: _missingCreatedAt, ...greenProperties } = integrationMappings.properties
    await client.indices.create({
      index: greenIndex,
      mappings: { ...integrationMappings, properties: greenProperties },
    })
    await client.indices.updateAliases({ actions: [{ add: { index: blueIndex, alias } }] })
    await client.index({
      index: blueIndex,
      id: 'blue-result',
      document: {
        id: 'blue-result',
        tenant: 'org-a',
        status: 'open',
        title: 'Blue generation',
        skills: [],
        skills_known: true,
        skills_count: 0,
        score: 1,
        created_at: '2026-08-01T00:00:00.000Z',
      },
      refresh: 'wait_for',
    })
    await client.index({
      index: greenIndex,
      id: 'green-result',
      document: {
        id: 'green-result',
        tenant: 'org-a',
        status: 'open',
        title: 'Green generation',
        skills: [],
        skills_known: true,
        skills_count: 0,
        score: 2,
      },
      refresh: 'wait_for',
    })

    const cutoverExecutor = new ElasticsearchFilterQueryExecutor({
      client,
      indexName: alias,
      profile: 'elasticsearch.integration.atomic-cutover',
      bindings,
      idField: 'id',
      cursorCodec: new ElasticsearchCursorCodec({
        secret: 'wp13-atomic-cutover-cursor-secret-long-enough',
        ttlMs: 60_000,
      }),
      rankingVersion: 'ranking-v1',
      resolveIndexTarget: async () => {
        const aliasState = await client.indices.getAlias({ name: alias })
        const resolvedIndex = Object.keys(aliasState)[0]
        if (resolvedIndex === undefined) throw new Error('Expected a resolved physical index')
        await client.indices.updateAliases({
          actions: [{ remove: { index: blueIndex, alias } }, { add: { index: greenIndex, alias } }],
        })
        return { physicalIndexName: resolvedIndex, generation: resolvedIndex }
      },
      mapHit: ({ source }) => source,
    })

    const result = await cutoverExecutor.execute(request(cutoverExecutor))
    assert.deepEqual(
      result.hits.map(({ id }) => id),
      ['blue-result']
    )
    const aliasResult = await client.search<Record<string, unknown>>({
      index: alias,
      query: { match_all: {} },
    })
    assert.deepEqual(
      aliasResult.hits.hits.map(({ _id }) => _id),
      ['green-result']
    )
  }).timeout(15_000)

  test('marks allowed shard failures approximate and fails closed otherwise', async ({
    assert,
    cleanup,
  }) => {
    const suffix = randomUUID().replaceAll('-', '')
    const goodIndex = `${indexName}_partial_good_${suffix}`
    const badIndex = `${indexName}_partial_bad_${suffix}`
    const alias = `${indexName}_partial_alias_${suffix}`
    cleanup(async () => {
      await client.indices.delete({ index: [goodIndex, badIndex] }, { ignore: [404] })
    })
    await client.indices.create({ index: goodIndex, mappings: integrationMappings })
    await client.indices.create({
      index: badIndex,
      mappings: {
        ...integrationMappings,
        properties: {
          ...integrationMappings.properties,
          score: { type: 'text' },
        },
      },
    })
    await client.indices.updateAliases({
      actions: [{ add: { index: goodIndex, alias } }, { add: { index: badIndex, alias } }],
    })
    await client.index({
      index: goodIndex,
      id: 'good',
      document: {
        id: 'good',
        tenant: 'org-a',
        status: 'open',
        title: 'Good shard',
        skills: [],
        skills_known: true,
        skills_count: 0,
        score: 1,
      },
      refresh: 'wait_for',
    })
    await client.index({
      index: badIndex,
      id: 'bad',
      document: {
        id: 'bad',
        tenant: 'org-a',
        status: 'open',
        title: 'Bad shard',
        skills: [],
        skills_known: true,
        skills_count: 0,
        score: '1',
      },
      refresh: 'wait_for',
    })
    const partialExecutor = new ElasticsearchFilterQueryExecutor({
      client,
      indexName: alias,
      profile: 'elasticsearch.integration.partial',
      bindings,
      idField: 'id',
      cursorCodec: new ElasticsearchCursorCodec({
        secret: 'wp13-partial-shard-cursor-secret-long-enough',
        ttlMs: 60_000,
      }),
      rankingVersion: 'ranking-v1',
      resolveIndexGeneration: () => Promise.resolve(alias),
      mapHit: ({ source }) => source,
    })
    const scoreFilter = condition('score', 'gte', { kind: 'scalar', value: 0 })
    const partialInput = request(partialExecutor, {
      filter: scoreFilter,
      sort: [{ field: 'score', direction: 'asc' }],
      requestedFacets: [{ field: 'skills', countMode: 'constrained' }],
    })
    const partial = await partialExecutor.execute({
      ...partialInput,
      definition: { ...definition, degradationPolicy: 'explicit_partial' },
    })
    assert.isTrue(partial.partial)
    assert.isTrue(partial.degraded)
    assert.equal(partial.total.relation, 'gte')
    assert.equal(partial.diagnostics[0]?.code, 'FILTER_PROVIDER_DEGRADED')
    assert.isTrue(
      partial.facets[0]?.values.every(({ countRelation }) => countRelation === 'approximate')
    )
    assert.equal(partial.facets[0]?.truth?.coverage?.countRelation, 'approximate')

    const failedClosed = await partialExecutor
      .execute(
        request(partialExecutor, {
          filter: scoreFilter,
          sort: [{ field: 'score', direction: 'asc' }],
        })
      )
      .catch((error: unknown) => error)
    assert.instanceOf(failedClosed, FilterExecutionError)
    assert.equal((failedClosed as FilterExecutionError).code, 'FILTER_EXECUTOR_UNAVAILABLE')
  }).timeout(15_000)

  test('maps provider timeout and expired PIT without fabricating empty results', async ({
    assert,
  }) => {
    const requiredPaths = [
      'id',
      'tenant',
      'status',
      'title',
      'skills',
      'skills_known',
      'skills_count',
      'score',
      'created_at',
    ]
    const timedOutClient = {
      fieldCaps: () =>
        Promise.resolve({
          fields: Object.fromEntries(
            requiredPaths.map((field) => [field, { keyword: { type: 'keyword' } }])
          ),
        }),
      openPointInTime: () => Promise.resolve({ id: 'timeout-pit' }),
      closePointInTime: () => Promise.resolve({ succeeded: true, num_freed: 1 }),
      search: () =>
        Promise.resolve({
          timed_out: true,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
        }),
    } as unknown as Client
    const timedOutExecutor = new ElasticsearchFilterQueryExecutor({
      client: timedOutClient,
      indexName: 'suar_test_timeout_fake',
      profile: 'elasticsearch.integration.timeout',
      bindings,
      idField: 'id',
      cursorCodec: new ElasticsearchCursorCodec({
        secret: 'wp13-timeout-cursor-secret-that-is-long-enough',
        ttlMs: 60_000,
      }),
      rankingVersion: 'ranking-v1',
      resolveIndexGeneration: () => Promise.resolve('timeout-generation'),
      mapHit: ({ source }) => source,
    })
    const timedOut = await timedOutExecutor
      .execute(request(timedOutExecutor))
      .catch((error: unknown) => error)
    assert.instanceOf(timedOut, FilterExecutionError)
    assert.equal((timedOut as FilterExecutionError).code, 'FILTER_PROVIDER_TIMED_OUT')

    let expiringSearchCalls = 0
    const expiredPitClient = {
      fieldCaps: () =>
        Promise.resolve({
          fields: Object.fromEntries(
            requiredPaths.map((field) => [field, { keyword: { type: 'keyword' } }])
          ),
        }),
      openPointInTime: () => Promise.resolve({ id: 'expiring-pit' }),
      closePointInTime: () => Promise.resolve({ succeeded: true, num_freed: 1 }),
      search: () => {
        expiringSearchCalls += 1
        if (expiringSearchCalls > 1) {
          return Promise.reject({
            meta: {
              statusCode: 404,
              body: { error: { type: 'search_context_missing_exception' } },
            },
          })
        }
        return Promise.resolve({
          pit_id: 'expiring-pit-next',
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: {
            total: { value: 2, relation: 'eq' },
            max_score: 1,
            hits: [
              {
                _index: 'suar_test_expiring_fake',
                _id: 'r1',
                _score: 1,
                _source: { id: 'r1' },
                sort: [1, 'r1'],
              },
            ],
          },
        })
      },
    } as unknown as Client
    const expiringExecutor = new ElasticsearchFilterQueryExecutor({
      client: expiredPitClient,
      indexName: 'suar_test_expiring_fake',
      profile: 'elasticsearch.integration.expiring-pit',
      bindings,
      idField: 'id',
      cursorCodec: new ElasticsearchCursorCodec({
        secret: 'wp13-expiring-pit-cursor-secret-long-enough',
        ttlMs: 60_000,
      }),
      rankingVersion: 'ranking-v1',
      resolveIndexGeneration: () => Promise.resolve('expiring-generation'),
      mapHit: ({ source }) => source,
    })
    const first = await expiringExecutor.execute(request(expiringExecutor, { page: { size: 1 } }))
    const cursor = first.page.nextCursor
    if (cursor === undefined) throw new Error('Expected expiring PIT cursor')
    const expired = await expiringExecutor
      .execute(request(expiringExecutor, { page: { size: 1, cursor } }))
      .catch((error: unknown) => error)
    assert.instanceOf(expired, FilterExecutionError)
    assert.equal((expired as FilterExecutionError).code, 'FILTER_CURSOR_EXPIRED')
  }).timeout(15_000)
})
