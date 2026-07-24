import { randomUUID } from 'node:crypto'

import type { Client, estypes } from '@elastic/elasticsearch'
import { test } from '@japa/runner'

import type { FilterContextDefinition } from '#modules/filtering/domain/filtering-core/filter_context_definition'
import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import { ElasticsearchCursorCodec } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_cursor_codec'
import { compileElasticsearchFacets } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_facet_compiler'
import type { ElasticsearchSemanticBindings } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_compiler'
import {
  ElasticsearchFilterQueryExecutor,
  type ElasticsearchFilterExecutorInput,
} from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_query_executor'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

type Expression = NonNullable<QueryCriteriaRequest['filter']>
type Condition = Extract<Expression, { kind: 'condition' }>

const bindings: ElasticsearchSemanticBindings = {
  id: { type: 'scalar', path: 'id', sortable: true },
  tenant: { type: 'scalar', path: 'tenant' },
  status: { type: 'scalar', path: 'status', facetable: true },
  skills: {
    type: 'multi_value',
    path: 'skills',
    presencePath: 'skills_known',
    cardinalityPath: 'skills_count',
    facetable: true,
  },
}

const definition: FilterContextDefinition = {
  key: 'filter.tc_fst_010.elasticsearch',
  version: 1,
  resource: 'search-document',
  ownerModule: 'search',
  capabilities: {
    text: false,
    facets: true,
    nestedGroups: true,
    preferences: false,
    relativeTime: false,
    savedViews: false,
    sharedViews: false,
    alerts: false,
    emptyRequest: true,
    pagination: 'cursor',
    maxDepth: 8,
    maxConditions: 20,
  },
  fields: Object.entries(bindings).map(([key, binding]) => ({
    key,
    type: binding.type,
    operators: [],
    effects: ['require', 'exclude'] as const,
    defaultUnknown: 'exclude' as const,
    facetable: binding.facetable ?? false,
    sortable: key === 'id',
    projectable: true,
    preference: false,
    valueSearch: binding.facetable ?? false,
    facetCountModes: ['constrained', 'self_excluding'] as const,
    cost: 1,
  })),
  sorts: [{ field: 'id', directions: ['asc', 'desc'] }],
  defaultSort: [{ field: 'id', direction: 'asc' }],
  executionProfile: 'filter.tc_fst_010.elasticsearch',
  degradationPolicy: 'fail_closed',
  limits: {
    maxPageSize: 20,
    maxFacetRequests: 4,
    maxProjectionFields: 8,
    maxSorts: 1,
    maxSetValues: 20,
    maxTextLength: 80,
    maxRelationDepth: 0,
    maxCost: 100,
  },
}

const mappings: estypes.MappingTypeMapping = {
  dynamic: 'strict',
  properties: {
    id: { type: 'keyword' },
    tenant: { type: 'keyword' },
    status: { type: 'keyword' },
    skills: { type: 'keyword' },
    skills_known: { type: 'boolean' },
    skills_count: { type: 'integer' },
  },
}

const documents = [
  {
    id: 'tc010-open-redis-typescript',
    tenant: 'org-a',
    status: 'open',
    skills: ['redis', 'typescript'],
    skills_known: true,
    skills_count: 2,
  },
  {
    id: 'tc010-open-typescript',
    tenant: 'org-a',
    status: 'open',
    skills: ['typescript'],
    skills_known: true,
    skills_count: 1,
  },
  {
    id: 'tc010-open-vue',
    tenant: 'org-a',
    status: 'open',
    skills: ['vue'],
    skills_known: true,
    skills_count: 1,
  },
  {
    id: 'tc010-closed-postgresql',
    tenant: 'org-a',
    status: 'closed',
    skills: ['postgresql'],
    skills_known: true,
    skills_count: 1,
  },
  {
    id: 'tc010-foreign-redis',
    tenant: 'org-secret',
    status: 'open',
    skills: ['redis'],
    skills_known: true,
    skills_count: 1,
  },
]

function condition(field: string, operator: string, value: string | readonly string[]): Condition {
  const values = typeof value === 'string' ? [value] : [...value]
  return {
    kind: 'condition',
    field,
    operator,
    effect: 'require',
    unknown: 'exclude',
    value:
      field === 'skills'
        ? { kind: 'set', values }
        : { kind: 'scalar', value: values[0] ?? '' },
  }
}

function and(...children: Expression[]): Expression {
  return { kind: 'group', combinator: 'and', children }
}

function or(...children: Expression[]): Expression {
  return { kind: 'group', combinator: 'or', children }
}

function request(
  executor: ElasticsearchFilterQueryExecutor<Record<string, unknown>>,
  filter: Expression
): ElasticsearchFilterExecutorInput<object> {
  const mandatoryFilter = condition('tenant', 'eq', 'org-a')
  const criteria: QueryCriteriaRequest = {
    context: definition.key,
    schemaVersion: definition.version,
    filter,
    sort: [{ field: 'id', direction: 'asc' }],
    page: { size: 20 },
    requestedFacets: [{ field: 'skills', countMode: 'self_excluding' }],
  }
  return {
    definition,
    criteria,
    mandatoryFilter,
    eligibilityFilter: and(mandatoryFilter, filter),
    authorizationBinding: { authorizationVersion: 'tc-fst-010-org-a-v1', tenant: 'org-a' },
    requestId: `tc-fst-010-${executor.profile}`,
  }
}

test.group('TC-FST-010 | self-excluding facet semantics', (group) => {
  let client: Client
  let indexName: string
  let executor: ElasticsearchFilterQueryExecutor<Record<string, unknown>>

  group.setup(async () => {
    await setupApp()
    ;({ searchClient: client } = await import('#platform/search/elasticsearch_client'))
    const prefix = process.env['ELASTICSEARCH_TEST_INDEX_PREFIX']
    if (prefix === undefined) throw new Error('ELASTICSEARCH_TEST_INDEX_PREFIX is required')
    indexName = `${prefix}tc_fst_010_${randomUUID().replaceAll('-', '')}`
    await client.indices.create({ index: indexName, mappings })
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
      cursorCodec: new ElasticsearchCursorCodec({
        secret: 'tc-fst-010-self-excluding-secret-long-enough',
        ttlMs: 60_000,
      }),
      rankingVersion: 'tc-fst-010.v1',
      resolveIndexGeneration: () => Promise.resolve(indexName),
      mapHit: ({ source }) => source,
      requestTimeoutMs: 5_000,
      pitKeepAlive: '1m',
    })
  })

  group.teardown(async () => {
    await client.indices.delete({ index: indexName }, { ignore: [404] })
    await teardownApp()
  })

  test('counts the complete authorized population after removing a supported facet subtree', async ({
    assert,
  }) => {
    const filter = and(
      condition('status', 'eq', 'open'),
      or(condition('skills', 'contains_any', ['redis']), condition('skills', 'contains_any', ['typescript']))
    )
    const result = await executor.execute(request(executor, filter))
    const facet = result.facets[0]

    assert.deepEqual(
      result.hits.map(({ id }) => id),
      ['tc010-open-redis-typescript', 'tc010-open-typescript']
    )
    assert.deepEqual(
      Object.fromEntries((facet?.values ?? []).map(({ value, count }) => [value, count])),
      { typescript: 2, redis: 1, vue: 1 }
    )
    assert.notInclude(JSON.stringify(facet), 'postgresql')
    assert.notInclude(JSON.stringify(facet), 'tc010-foreign-redis')
  }).timeout(15_000)

  test('returns a capability diagnostic for a mixed non-extractable subtree', ({ assert }) => {
    const filter = and(
      condition('status', 'eq', 'open'),
      or(condition('skills', 'contains_any', ['redis']), condition('status', 'eq', 'closed'))
    )
    const error = (() => {
      try {
        compileElasticsearchFacets({
          requests: [{ field: 'skills', countMode: 'self_excluding' }],
          mandatoryFilter: condition('tenant', 'eq', 'org-a'),
          userFilter: filter,
          bindings,
          now: new Date('2026-08-10T00:00:00.000Z'),
          maxValues: 20,
        })
      } catch (caught) {
        return caught
      }
      return undefined
    })()

    assert.instanceOf(error, FilterExecutionError)
    assert.equal((error as FilterExecutionError).code, 'FILTER_EXECUTOR_CAPABILITY_MISMATCH')
  })
})
