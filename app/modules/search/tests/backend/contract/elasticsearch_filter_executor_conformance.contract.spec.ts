import { randomUUID } from 'node:crypto'

import type { Client, estypes } from '@elastic/elasticsearch'

import {
  defineFilterExecutorConformanceSuite,
  referenceConformanceRecords,
} from '#modules/filtering/tests/backend/contract/support/filter_executor_conformance'
import type {
  ReferenceFieldValue,
  ReferenceFilterRecord,
} from '#modules/filtering/tests/backend/contract/support/reference_filter_evaluator'
import { ElasticsearchCursorCodec } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_cursor_codec'
import type { ElasticsearchSemanticBindings } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_compiler'
import { ElasticsearchFilterQueryExecutor } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_query_executor'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

const PROFILE = 'elasticsearch.reference.conformance.v1'

const bindings: ElasticsearchSemanticBindings = {
  id: { type: 'scalar', path: 'id', sortable: true },
  tenant: { type: 'scalar', path: 'tenant' },
  status: { type: 'scalar', path: 'status', facetable: true },
  title: { type: 'text', path: 'title' },
  skills: {
    type: 'multi_value',
    path: 'skills',
    presencePath: 'skills_known',
    cardinalityPath: 'skills_count',
    facetable: true,
  },
  score: { type: 'number', path: 'score', sortable: true },
  createdAt: {
    type: 'date_time',
    path: 'created_at',
    presencePath: 'created_at_known',
    sortable: true,
  },
  category: {
    type: 'hierarchy',
    path: 'category_ids',
    ancestorPath: 'category_ancestor_ids',
    presencePath: 'category_known',
    cardinalityPath: 'category_count',
  },
  active: { type: 'boolean', path: 'active', presencePath: 'active_known' },
  applications: {
    type: 'relation',
    path: 'applications',
    presencePath: 'applications_known',
    cardinalityPath: 'applications_count',
    relationBindings: {
      status: { type: 'scalar', path: 'applications.status' },
      score: { type: 'number', path: 'applications.score' },
    },
  },
}

const mappings: estypes.MappingTypeMapping = {
  dynamic: 'strict',
  properties: {
    id: { type: 'keyword' },
    tenant: { type: 'keyword' },
    status: { type: 'keyword' },
    title: { type: 'text' },
    skills: { type: 'keyword' },
    skills_known: { type: 'boolean' },
    skills_count: { type: 'integer' },
    score: { type: 'integer' },
    created_at: { type: 'date' },
    created_at_known: { type: 'boolean' },
    category_ids: { type: 'keyword' },
    category_ancestor_ids: { type: 'keyword' },
    category_known: { type: 'boolean' },
    category_count: { type: 'integer' },
    active: { type: 'boolean' },
    active_known: { type: 'boolean' },
    applications: {
      type: 'nested',
      properties: {
        status: { type: 'keyword' },
        score: { type: 'integer' },
      },
    },
    applications_known: { type: 'boolean' },
    applications_count: { type: 'integer' },
  },
}

let client: Client
let indexName: string
let executor: ElasticsearchFilterQueryExecutor<ReferenceFilterRecord>

defineFilterExecutorConformanceSuite({
  name: PROFILE,
  paginationMode: 'cursor',
  setup: async () => {
    await setupApp()
    ;({ searchClient: client } = await import('#platform/search/elasticsearch_client'))
    const prefix = process.env['ELASTICSEARCH_TEST_INDEX_PREFIX']
    if (prefix === undefined) throw new Error('ELASTICSEARCH_TEST_INDEX_PREFIX is required')
    indexName = `${prefix}wp13_contract_${randomUUID().replaceAll('-', '')}`
    await client.indices.create({ index: indexName, mappings })
    const documents = referenceConformanceRecords.map(toElasticsearchDocument)
    await client.bulk({
      refresh: true,
      operations: documents.flatMap((document) => [
        { index: { _index: indexName, _id: String(document['id']) } },
        document,
      ]),
    })
    const recordsById = new Map(referenceConformanceRecords.map((record) => [record.id, record]))
    executor = new ElasticsearchFilterQueryExecutor({
      client,
      indexName,
      profile: PROFILE,
      bindings,
      idField: 'id',
      textFields: ['title'],
      cursorCodec: new ElasticsearchCursorCodec({
        secret: 'wp13-contract-cursor-secret-that-is-long-enough',
        ttlMs: 60_000,
        clock: () => new Date('2026-08-01T00:00:00.000Z'),
      }),
      rankingVersion: 'reference-ranking-v1',
      resolveIndexGeneration: () => Promise.resolve(indexName),
      mapHit: ({ id }) => {
        const record = recordsById.get(id)
        if (record === undefined) throw new Error('Unexpected Elasticsearch conformance hit')
        return record
      },
      clock: () => new Date('2026-08-01T00:00:00.000Z'),
      requestTimeoutMs: 5_000,
      pitKeepAlive: '1m',
    })
  },
  teardown: async () => {
    await client.indices.delete({ index: indexName }, { ignore: [404] })
    await teardownApp()
  },
  createExecutor: () => executor,
})

function toElasticsearchDocument(record: ReferenceFilterRecord): Record<string, unknown> {
  const document: Record<string, unknown> = { id: record.id }
  for (const [field, value] of Object.entries(record.fields)) {
    appendField(document, field, value)
  }
  return document
}

function appendField(
  document: Record<string, unknown>,
  field: string,
  value: ReferenceFieldValue
): void {
  if (isSpecial(value, 'unknown') || isSpecial(value, 'hidden')) return
  if (field === 'skills') {
    document['skills_known'] = true
    const values = Array.isArray(value)
      ? [...new Set(value.map((item) => String(item).toLocaleLowerCase()))]
      : []
    document['skills'] = values
    document['skills_count'] = values.length
    return
  }
  if (field === 'createdAt') {
    document['created_at_known'] = true
    if (!isSpecial(value, 'missing')) document['created_at'] = value
    return
  }
  if (field === 'category') {
    document['category_known'] = true
    if (isHierarchy(value)) {
      document['category_ids'] = value.termIds
      document['category_ancestor_ids'] = value.ancestorIds
      document['category_count'] = value.termIds.length
    }
    return
  }
  if (field === 'active') {
    document['active_known'] = true
    if (!isSpecial(value, 'missing')) document['active'] = value
    return
  }
  if (field === 'applications') {
    document['applications_known'] = true
    if (isRelation(value)) {
      document['applications'] = value.records.map(({ fields }) => ({
        status: fields['status'],
        score: fields['score'],
      }))
      document['applications_count'] = value.records.length
    } else {
      document['applications_count'] = 0
    }
    return
  }
  if (!isSpecial(value, 'missing')) document[field] = value
}

function isSpecial(value: ReferenceFieldValue, kind: string): boolean {
  return (
    typeof value === 'object' && !Array.isArray(value) && 'kind' in value && value.kind === kind
  )
}

function isHierarchy(
  value: ReferenceFieldValue
): value is Extract<ReferenceFieldValue, { kind: 'hierarchy' }> {
  return isSpecial(value, 'hierarchy')
}

function isRelation(
  value: ReferenceFieldValue
): value is Extract<ReferenceFieldValue, { kind: 'relation' }> {
  return isSpecial(value, 'relation')
}
