import { randomUUID } from 'node:crypto'

import type { Client, estypes } from '@elastic/elasticsearch'
import { test } from '@japa/runner'

import type {
  FilterCondition,
  FilterExpression,
  FilterScalar,
} from '#modules/filtering/domain/filtering-core/filter_expression'
import type { FilterSetOperator } from '#modules/filtering/domain/filtering-core/filter_operators'
import {
  ReferenceFilterEvaluator,
  referenceAuthorizationBinding,
  referenceDefinition,
  type ReferenceFilterRecord,
} from '#modules/filtering/tests/backend/contract/support/reference_filter_evaluator'
import {
  executeSqlSetOperator,
  type SqlSetOperatorRecord,
} from '#modules/filtering/tests/backend/contract/support/sql_set_operator_evaluator'
import { ElasticsearchCursorCodec } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_cursor_codec'
import type { ElasticsearchSemanticBindings } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_compiler'
import { ElasticsearchFilterQueryExecutor } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_query_executor'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

const records: readonly ReferenceFilterRecord[] = [
  {
    id: 'label-1',
    fields: { skills: ['TypeScript', 'redis', 'Redis'] },
  },
  {
    id: 'label-2',
    fields: { skills: ['typescript', 'vue', 'postgresql'] },
  },
  {
    id: 'label-3',
    fields: { skills: ['redis'] },
  },
  {
    id: 'label-4',
    fields: { skills: ['typescript', 'redis', 'vue'] },
  },
  {
    id: 'label-5',
    fields: { skills: [] },
  },
]

const cases: ReadonlyArray<{
  operator: FilterSetOperator
  values: FilterScalar[]
  minimumMatch?: number
  expected: string[]
}> = [
  { operator: 'contains_any', values: ['typescript'], expected: ['label-1', 'label-2', 'label-4'] },
  {
    operator: 'contains_all',
    values: ['typescript', 'redis'],
    expected: ['label-1', 'label-4'],
  },
  { operator: 'contains_none', values: ['postgresql'], expected: ['label-1', 'label-3', 'label-4', 'label-5'] },
  {
    operator: 'contains_exactly',
    values: ['typescript', 'redis'],
    expected: ['label-1'],
  },
  {
    operator: 'contains_at_least',
    values: ['typescript', 'redis', 'vue'],
    minimumMatch: 2,
    expected: ['label-1', 'label-2', 'label-4'],
  },
]

const context = 'filter.reference.conformance'
const searchProfile = 'tc-fst-006.elasticsearch.v1'
const searchBindings: ElasticsearchSemanticBindings = {
  id: { type: 'scalar', path: 'id', sortable: true },
  skills: {
    type: 'multi_value',
    path: 'skills',
    presencePath: 'skills_known',
    cardinalityPath: 'skills_count',
  },
}
const searchMappings: estypes.MappingTypeMapping = {
  dynamic: 'strict',
  properties: {
    id: { type: 'keyword' },
    skills: { type: 'keyword' },
    skills_known: { type: 'boolean' },
    skills_count: { type: 'integer' },
  },
}

function condition(
  operator: FilterSetOperator,
  values: FilterScalar[],
  minimumMatch?: number
): FilterCondition {
  return {
    kind: 'condition',
    field: 'skills',
    operator,
    effect: 'require',
    unknown: 'exclude',
    value: {
      kind: 'set',
      values,
      ...(minimumMatch === undefined ? {} : { minimumMatch }),
    },
  }
}

function criteria(filter: FilterExpression) {
  return {
    context,
    schemaVersion: 1,
    filter,
    sort: [{ field: 'id', direction: 'asc' as const }],
    page: { size: 100 },
  }
}

function sqlRecords(): SqlSetOperatorRecord[] {
  return records.map((record) => ({
    id: record.id,
    labels: Array.isArray(record.fields['skills'])
      ? record.fields['skills'].filter((value): value is string => typeof value === 'string')
      : [],
  }))
}

function toSearchDocument(record: ReferenceFilterRecord): Record<string, unknown> {
  const skillValues = record.fields['skills']
  const labels = isStringArray(skillValues)
    ? [...new Set(skillValues.map((value) => value.trim().normalize('NFKC').toLocaleLowerCase('en-US')))]
    : []
  return { id: record.id, skills: labels, skills_known: true, skills_count: labels.length }
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

test.group('Contract | TC-FST-006 | multi-label set semantics', (group) => {
  let client: Client
  let indexName: string
  let search: ElasticsearchFilterQueryExecutor<ReferenceFilterRecord>

  group.setup(async () => {
    await setupApp()
    ;({ searchClient: client } = await import('#platform/search/elasticsearch_client'))
    const prefix = process.env['ELASTICSEARCH_TEST_INDEX_PREFIX']
    if (prefix === undefined) throw new Error('ELASTICSEARCH_TEST_INDEX_PREFIX is required')
    indexName = `${prefix}tc_fst_006_${randomUUID().replaceAll('-', '')}`
    await client.indices.create({ index: indexName, mappings: searchMappings })
    await client.bulk({
      refresh: true,
      operations: records.flatMap((record) => [
        { index: { _index: indexName, _id: record.id } },
        toSearchDocument(record),
      ]),
    })
    const recordsById = new Map(records.map((record) => [record.id, record]))
    search = new ElasticsearchFilterQueryExecutor({
      client,
      indexName,
      profile: searchProfile,
      bindings: searchBindings,
      idField: 'id',
      cursorCodec: new ElasticsearchCursorCodec({
        secret: 'tc-fst-006-search-cursor-secret-long-enough',
        ttlMs: 60_000,
        clock: () => new Date('2026-08-01T00:00:00.000Z'),
      }),
      rankingVersion: 'tc-fst-006-ranking-v1',
      resolveIndexGeneration: () => Promise.resolve(indexName),
      mapHit: ({ id }) => {
        const record = recordsById.get(id)
        if (record === undefined) throw new Error(`Unexpected TC-FST-006 hit: ${id}`)
        return record
      },
      clock: () => new Date('2026-08-01T00:00:00.000Z'),
      requestTimeoutMs: 5_000,
      pitKeepAlive: '1m',
    })
  })

  group.teardown(async () => {
    await client.indices.delete({ index: indexName }, { ignore: [404] })
    await teardownApp()
  })

  test('reference, PostgreSQL SQL, and Elasticsearch produce the same eligible IDs for every set operator', async ({
    assert,
  }) => {
    const reference = new ReferenceFilterEvaluator({ records })
    const authorizationBinding = referenceAuthorizationBinding()

    for (const semanticCase of cases) {
      const filter = condition(
        semanticCase.operator,
        semanticCase.values,
        semanticCase.minimumMatch
      )
      const result = await reference.execute({
        definition: referenceDefinition(),
        criteria: criteria(filter),
        authorizationBinding,
        requestId: `tc-fst-006-${semanticCase.operator}`,
      })
      const referenceIds = result.hits.map(({ id }) => id)
      const sqlIds = await executeSqlSetOperator(
        sqlRecords(),
        semanticCase.operator,
        semanticCase.values,
        semanticCase.minimumMatch
      )
      const searchResult = await search.execute({
        definition: { ...referenceDefinition(searchProfile), executionProfile: searchProfile },
        criteria: criteria(filter),
        eligibilityFilter: filter,
        authorizationBinding,
        requestId: `tc-fst-006-search-${semanticCase.operator}`,
      })

      assert.deepEqual(referenceIds, semanticCase.expected, semanticCase.operator)
      assert.deepEqual(sqlIds, semanticCase.expected, `sql:${semanticCase.operator}`)
      assert.deepEqual(
        searchResult.hits.map(({ id }) => id),
        semanticCase.expected,
        `search:${semanticCase.operator}`
      )
    }
  }).timeout(20_000)
})
