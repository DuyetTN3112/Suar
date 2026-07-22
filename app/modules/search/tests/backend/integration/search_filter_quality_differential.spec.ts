import { randomUUID } from 'node:crypto'

import type { Client } from '@elastic/elasticsearch'
import { test } from '@japa/runner'

import {
  buildQualityElasticsearchExecutor,
  buildQualityExecutionInput,
  runQualityDifferentialAssertions,
  qualityMappings,
  qualityPopulationRecords,
  qualityPopulationDocuments,
} from '#modules/filtering/tests/backend/contract/filter_executor_quality_differential.contract'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

test.group('Integration | filter quality differential | reference versus Elasticsearch', (group) => {
  let client: Client
  let indexName: string

  group.setup(async () => {
    await setupApp()
    ;({ searchClient: client } = await import('#platform/search/elasticsearch_client'))
    const prefix = process.env['ELASTICSEARCH_TEST_INDEX_PREFIX']
    if (prefix === undefined) throw new Error('ELASTICSEARCH_TEST_INDEX_PREFIX is required')
    indexName = `${prefix}wp26b_quality_${randomUUID().replaceAll('-', '')}`
    await client.indices.create({
      index: indexName,
      mappings: qualityMappings,
    })
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

  test('proves the deterministic population is equivalent across reference and real Elasticsearch', async ({
    assert,
  }) => {
    const elasticsearch = buildQualityElasticsearchExecutor(client, indexName)

    for (const principal of ['anonymous', 'org-acme'] as const) {
      const input = buildQualityExecutionInput(principal)
      const actual = await elasticsearch.execute(input)
      await runQualityDifferentialAssertions(assert, {
        principal,
        referenceRecords: qualityPopulationRecords,
        input,
        actual,
      })
    }
  }).timeout(20_000)
})
