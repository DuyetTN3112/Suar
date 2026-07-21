import { randomUUID } from 'node:crypto'

import type { Client, estypes } from '@elastic/elasticsearch'
import { test } from '@japa/runner'

import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'
import type { FilterFacetGroup } from '#modules/filtering/public_contracts/filter_facets'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import {
  ReferenceFilterEvaluator,
  referenceAuthorizationBinding,
  referenceDefinition,
  type ReferenceFilterRecord,
} from '#modules/filtering/tests/backend/contract/support/reference_filter_evaluator'
import { ElasticsearchCursorCodec } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_cursor_codec'
import type { ElasticsearchSemanticBindings } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_compiler'
import { ElasticsearchFilterQueryExecutor } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_query_executor'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

/**
 * Differential evidence for the shared Filter AST used by the reference and
 * Elasticsearch providers. This deliberately compares only semantics shared
 * by both result contracts; Elasticsearch-only facet truth metadata is tested
 * by its provider integration suite and is not treated as reference parity.
 */

const context = 'filter.provider.parity'
const profile = 'elasticsearch.provider.parity.v1'

const records: readonly ReferenceFilterRecord[] = [
  {
    id: 'parity-1',
    fields: { tenant: 'org-a', status: 'open', skills: ['typescript', 'redis'] },
  },
  {
    id: 'parity-2',
    fields: { tenant: 'org-a', status: 'open', skills: ['typescript'] },
  },
  {
    id: 'parity-3',
    fields: { tenant: 'org-a', status: 'closed', skills: ['typescript'] },
  },
  {
    id: 'parity-4',
    fields: { tenant: 'org-a', status: 'open', skills: [] },
  },
  {
    id: 'parity-secret',
    fields: { tenant: 'org-secret', status: 'open', skills: ['typescript', 'secret'] },
  },
]

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

const definition = {
  ...referenceDefinition(profile),
  key: context,
  executionProfile: profile,
  fields: [],
}

function condition(
  field: string,
  operator: string,
  value?: Extract<FilterExpression, { kind: 'condition' }>['value']
): Extract<FilterExpression, { kind: 'condition' }> {
  return {
    kind: 'condition',
    field,
    operator,
    effect: 'require',
    unknown: 'exclude',
    ...(value === undefined ? {} : { value }),
  }
}

function toDocument(record: ReferenceFilterRecord): Record<string, unknown> {
  const skills = record.fields['skills']
  return {
    id: record.id,
    tenant: record.fields['tenant'],
    status: record.fields['status'],
    skills: Array.isArray(skills) ? skills.map(String) : [],
    skills_known: true,
    skills_count: Array.isArray(skills) ? skills.length : 0,
  }
}

function canonicalInput(): {
  criteria: QueryCriteriaRequest
  mandatoryFilter: FilterExpression
  eligibilityFilter: FilterExpression
} {
  const mandatoryFilter = condition('tenant', 'eq', { kind: 'scalar', value: 'org-a' })
  const filter: FilterExpression = {
    kind: 'group',
    combinator: 'and',
    children: [
      condition('status', 'eq', { kind: 'scalar', value: 'open' }),
      condition('skills', 'contains_any', {
        kind: 'set',
        values: ['typescript'],
      }),
    ],
  }
  return {
    criteria: {
      context,
      schemaVersion: 1,
      filter,
      sort: [{ field: 'id', direction: 'asc' }],
      page: { size: 100 },
      requestedFacets: [
        { field: 'skills', countMode: 'constrained' },
        { field: 'skills', countMode: 'self_excluding' },
      ],
    },
    mandatoryFilter,
    eligibilityFilter: {
      kind: 'group',
      combinator: 'and',
      children: [mandatoryFilter, filter],
    },
  }
}

function semanticFacets(facets: readonly FilterFacetGroup[]) {
  return facets.map(({ field, countMode, values }) => ({
    field,
    countMode,
    values: values.map(({ value, count, countRelation, selected }) => ({
      value,
      count,
      countRelation,
      selected,
    })),
  }))
}

test.group('Contract | Filter provider differential | reference versus Elasticsearch', (group) => {
  let client: Client
  let indexName: string
  let elasticsearch: ElasticsearchFilterQueryExecutor<ReferenceFilterRecord>

  group.setup(async () => {
    await setupApp()
    ;({ searchClient: client } = await import('#platform/search/elasticsearch_client'))
    const prefix = process.env['ELASTICSEARCH_TEST_INDEX_PREFIX']
    if (prefix === undefined) throw new Error('ELASTICSEARCH_TEST_INDEX_PREFIX is required')
    indexName = `${prefix}provider_parity_${randomUUID().replaceAll('-', '')}`
    await client.indices.create({ index: indexName, mappings })
    await client.bulk({
      refresh: true,
      operations: records.flatMap((record) => [
        { index: { _index: indexName, _id: record.id } },
        toDocument(record),
      ]),
    })
    const recordsById = new Map(records.map((record) => [record.id, record]))
    elasticsearch = new ElasticsearchFilterQueryExecutor({
      client,
      indexName,
      profile,
      bindings,
      idField: 'id',
      cursorCodec: new ElasticsearchCursorCodec({
        secret: 'provider-parity-cursor-secret-long-enough',
        ttlMs: 60_000,
        clock: () => new Date('2026-08-01T00:00:00.000Z'),
      }),
      rankingVersion: 'provider-parity-ranking-v1',
      resolveIndexGeneration: () => Promise.resolve(indexName),
      mapHit: ({ id }) => {
        const record = recordsById.get(id)
        if (record === undefined) throw new Error(`Unexpected provider parity hit: ${id}`)
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

  test('returns identical eligible IDs, exact totals, and shared facet semantics for one canonical AST', async ({
    assert,
  }) => {
    const input = canonicalInput()
    const authorizationBinding = referenceAuthorizationBinding({ context })
    const reference = await new ReferenceFilterEvaluator({
      records,
      profile: 'reference.provider.parity.v1',
      clock: () => new Date('2026-08-01T00:00:00.000Z'),
    }).execute({
      definition,
      criteria: input.criteria,
      mandatoryFilter: input.mandatoryFilter,
      eligibilityFilter: input.eligibilityFilter,
      authorizationBinding,
      requestId: 'reference-provider-parity',
    })
    const real = await elasticsearch.execute({
      definition,
      criteria: input.criteria,
      mandatoryFilter: input.mandatoryFilter,
      eligibilityFilter: input.eligibilityFilter,
      authorizationBinding,
      requestId: 'elasticsearch-provider-parity',
    })

    assert.deepEqual(real.hits.map(({ id }) => id), reference.hits.map(({ id }) => id))
    assert.deepEqual(real.total, reference.total)
    assert.deepEqual(semanticFacets(real.facets), semanticFacets(reference.facets))
  }).timeout(15_000)

  test('keeps strict eligibility identical while applying the same bounded preference ranking', async ({
    assert,
  }) => {
    const input = canonicalInput()
    const preference = {
      effect: 'prefer' as const,
      weight: 5,
      expression: condition('skills', 'contains_any', {
        kind: 'set' as const,
        values: ['redis'],
      }),
    }
    const criteria = {
      ...input.criteria,
      sort: [],
      preferences: [preference],
    }
    const authorizationBinding = referenceAuthorizationBinding({ context })
    const reference = await new ReferenceFilterEvaluator({
      records,
      profile: 'reference.provider.parity.v1',
      clock: () => new Date('2026-08-01T00:00:00.000Z'),
    }).execute({
      definition,
      criteria,
      mandatoryFilter: input.mandatoryFilter,
      eligibilityFilter: input.eligibilityFilter,
      authorizationBinding,
      requestId: 'reference-provider-preference-parity',
    })
    const real = await elasticsearch.execute({
      definition,
      criteria,
      mandatoryFilter: input.mandatoryFilter,
      eligibilityFilter: input.eligibilityFilter,
      authorizationBinding,
      requestId: 'elasticsearch-provider-preference-parity',
    })

    assert.deepEqual(real.hits.map(({ id }) => id), reference.hits.map(({ id }) => id))
    assert.deepEqual(real.total, reference.total)
    assert.equal(real.hits[0]?.id, 'parity-1')
    assert.equal(reference.hits[0]?.id, 'parity-1')
  }).timeout(15_000)
})
