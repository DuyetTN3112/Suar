import { randomUUID } from 'node:crypto'

import type { Client } from '@elastic/elasticsearch'
import { test } from '@japa/runner'

import {
  buildQualityElasticsearchExecutor,
  buildQualityExecutionInput,
  qualityMappings,
  qualityPopulationDocuments,
} from '#modules/filtering/tests/backend/contract/filter_executor_quality_differential.contract'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

test.group('Integration | filter permission leakage | Elasticsearch', (group) => {
  let client: Client
  let indexName: string

  group.setup(async () => {
    await setupApp()
    ;({ searchClient: client } = await import('#platform/search/elasticsearch_client'))
    const prefix = process.env['ELASTICSEARCH_TEST_INDEX_PREFIX']
    if (prefix === undefined) throw new Error('ELASTICSEARCH_TEST_INDEX_PREFIX is required')
    indexName = `${prefix}wp26b_leakage_${randomUUID().replaceAll('-', '')}`
    await client.indices.create({ index: indexName, mappings: qualityMappings })
    await client.bulk({
      refresh: true,
      operations: qualityPopulationDocuments.flatMap((document) => [
        { index: { _index: indexName, _id: document.id } },
        document,
      ]),
    })
  })

  group.teardown(async () => {
    await client.indices.delete({ index: indexName }, { ignore: [404] })
    await teardownApp()
  })

  test('does not expose cross-tenant IDs, exact totals, or facet values', async ({ assert }) => {
    const elasticsearch = buildQualityElasticsearchExecutor(client, indexName)

    for (const principal of ['anonymous', 'org-acme'] as const) {
      const result = await elasticsearch.execute(buildQualityExecutionInput(principal))
      const hitIds = result.hits.map((hit) => hit.id)
      const facetValues = result.facets
        .flatMap((facet) => facet.values)
        .map((value) => value.value)

      assert.notInclude(hitIds, 'org-other-secret', `${principal} received a hidden entity`)
      assert.notInclude(
        facetValues,
        'cross-tenant-secret',
        `${principal} received a hidden facet value`
      )
      assert.equal(result.total.relation, 'eq')
      assert.equal(result.total.value, principal === 'anonymous' ? 2 : 3)
    }
  }).timeout(20_000)
})
