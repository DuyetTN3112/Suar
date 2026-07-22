import { randomUUID } from 'node:crypto'

import type { Client, estypes } from '@elastic/elasticsearch'
import { test } from '@japa/runner'

import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import { ElasticsearchCursorCodec } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_cursor_codec'
import type { ElasticsearchSemanticBindings } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_compiler'
import {
  ElasticsearchFilterQueryExecutor,
  type ElasticsearchFilterExecutorInput,
} from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_query_executor'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

type Expression = NonNullable<QueryCriteriaRequest['filter']>
type Condition = Extract<Expression, { kind: 'condition' }>

const MAX_FACET_VALUES = 2
const FACET_VALUES = ['skill-00', 'skill-01', 'skill-02', 'skill-03', 'skill-04', 'skill-05', 'skill-06']
const SELECTED_VALUE = 'skill-selected'

const bindings: ElasticsearchSemanticBindings = {
  id: { type: 'scalar', path: 'id', sortable: true },
  tenant: { type: 'scalar', path: 'tenant' },
  skills: {
    type: 'multi_value',
    path: 'skills',
    presencePath: 'skills_known',
    cardinalityPath: 'skills_count',
    facetable: true,
  },
}

const definition = {
  key: 'filter.tc_fst_009.elasticsearch',
  version: 1,
  resource: 'search-document',
  ownerModule: 'Search',
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
    pagination: 'cursor' as const,
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
  sorts: [{ field: 'id', directions: ['asc', 'desc'] as const }],
  defaultSort: [{ field: 'id', direction: 'asc' as const }],
  executionProfile: 'elasticsearch.tc_fst_009.v1',
  degradationPolicy: 'fail_closed' as const,
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
    skills: { type: 'keyword' },
    skills_known: { type: 'boolean' },
    skills_count: { type: 'integer' },
  },
}

function condition(field: string, value: string): Condition {
  return {
    kind: 'condition',
    field,
    operator: field === 'skills' ? 'contains_any' : 'eq',
    effect: 'require',
    unknown: 'exclude',
    value: field === 'skills' ? { kind: 'set', values: [value] } : { kind: 'scalar', value },
  }
}

function request(
  executor: ElasticsearchFilterQueryExecutor<Record<string, unknown>>,
  facetCursor?: string
): ElasticsearchFilterExecutorInput<object> {
  const mandatoryFilter = condition('tenant', 'org-a')
  const filter = condition('skills', SELECTED_VALUE)
  const criteria: QueryCriteriaRequest = {
    context: definition.key,
    schemaVersion: definition.version,
    filter,
    sort: [{ field: 'id', direction: 'asc' }],
    page: { size: 1 },
    requestedFacets: [
      {
        field: 'skills',
        countMode: 'self_excluding',
        valueSearch: 'skill-0',
        ...(facetCursor === undefined ? {} : { cursor: facetCursor }),
      },
    ],
  }
  return {
    definition,
    criteria,
    mandatoryFilter,
    eligibilityFilter: {
      kind: 'group',
      combinator: 'and',
      children: [mandatoryFilter, filter],
    },
    authorizationBinding: { authorizationVersion: 'tc-fst-009-v1', tenant: 'org-a' },
    requestId: `tc-fst-009-${executor.profile}`,
  }
}

test.group('TC-FST-009 | high-cardinality facet paging', (group) => {
  let client: Client
  let indexName: string
  let executor: ElasticsearchFilterQueryExecutor<Record<string, unknown>>

  group.setup(async () => {
    await setupApp()
    ;({ searchClient: client } = await import('#platform/search/elasticsearch_client'))
    const prefix = process.env['ELASTICSEARCH_TEST_INDEX_PREFIX']
    if (prefix === undefined) throw new Error('ELASTICSEARCH_TEST_INDEX_PREFIX is required')
    indexName = `${prefix}tc_fst_009_${randomUUID().replaceAll('-', '')}`

    await client.indices.create({ index: indexName, mappings })
    await client.bulk({
      refresh: true,
      operations: FACET_VALUES.flatMap((skill, index) => {
        const document = {
          id: `tc009-${String(index).padStart(2, '0')}`,
          tenant: 'org-a',
          skills: [skill],
          skills_known: true,
          skills_count: 1,
        }
        return [{ index: { _index: indexName, _id: document.id } }, document]
      }),
    })

    executor = new ElasticsearchFilterQueryExecutor({
      client,
      indexName,
      profile: definition.executionProfile,
      bindings,
      idField: 'id',
      cursorCodec: new ElasticsearchCursorCodec({
        secret: 'tc-fst-009-high-cardinality-secret-long-enough',
        ttlMs: 60_000,
      }),
      rankingVersion: 'tc-fst-009.v1',
      resolveIndexGeneration: () => Promise.resolve(indexName),
      mapHit: ({ source }) => source,
      requestTimeoutMs: 5_000,
      pitKeepAlive: '1m',
      maxFacetValues: MAX_FACET_VALUES,
    })
  })

  group.teardown(async () => {
    await client.indices.delete({ index: indexName }, { ignore: [404] })
    await teardownApp()
  })

  test('pages bounded facet buckets without duplicate or skipped values while retaining selection', async ({
    assert,
  }) => {
    const first = await executor.execute(request(executor))
    const repeatedFirst = await executor.execute(request(executor))
    const firstFacet = first.facets[0]
    const repeatedFacet = repeatedFirst.facets[0]
    const firstCursor = firstFacet?.nextCursor

    assert.isString(firstCursor)
    assert.equal(repeatedFacet?.nextCursor, firstCursor)
    assert.deepInclude(firstFacet?.values ?? [], {
      value: SELECTED_VALUE,
      count: 0,
      countRelation: 'exact',
      selected: true,
    })
    assert.isBelow(firstFacet?.values.length ?? 0, FACET_VALUES.length)

    const pages = [firstFacet?.values ?? []]
    let cursor = firstCursor
    for (let page = 0; cursor !== undefined; page += 1) {
      if (page >= FACET_VALUES.length) throw new Error('Facet cursor did not converge')
      const next = await executor.execute(request(executor, cursor))
      const facet = next.facets[0]
      assert.isAtMost(facet?.values.length ?? 0, MAX_FACET_VALUES + 1)
      pages.push(facet?.values ?? [])
      cursor = facet?.nextCursor
    }

    const flattened = pages.flat().map(({ value }) => value)
    assert.equal(new Set(flattened).size, flattened.length)
    assert.deepEqual([...flattened].sort(), [...FACET_VALUES, SELECTED_VALUE].sort())
    assert.isAtLeast(pages.length, 2)
  }).timeout(30_000)
})
