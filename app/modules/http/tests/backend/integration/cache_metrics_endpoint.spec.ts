import { test } from '@japa/runner'

import env from '#start/env'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

test.group('Integration | Cache metrics endpoint', (group) => {
  const collectorKey = 'cache-metrics-integration-key'
  let originalGet: typeof env.get

  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())

  group.each.setup(() => {
    originalGet = env.get.bind(env)
    env.get = (key: string, defaultValue?: unknown) => {
      if (key === 'METRICS_API_KEY') {
        return collectorKey
      }
      return originalGet(key as never, defaultValue as never)
    }
  })

  group.each.teardown(() => {
    env.get = originalGet
  })

  test('rejects missing and incorrect collector credentials without disclosing metrics', async ({
    assert,
    client,
  }) => {
    const missingCredential = await client.get('/metrics/cache')
    const incorrectCredential = await client
      .get('/metrics/cache')
      .header('x-api-key', 'incorrect-cache-metrics-key')

    for (const response of [missingCredential, incorrectCredential]) {
      response.assertStatus(401)
      assert.notInclude(response.text(), 'suar_cache_reads_total')
    }
  })

  test('serves low-cardinality Prometheus metrics to the operations collector', async ({
    assert,
    client,
  }) => {
    const response = await client.get('/metrics/cache').header('x-api-key', collectorKey)

    response.assertStatus(200)
    assert.equal(response.header('content-type'), 'text/plain; version=0.0.4; charset=utf-8')
    assert.include(response.text(), '# TYPE suar_cache_reads_total counter')
    assert.include(response.text(), '# TYPE suar_cache_dependency_log_events_total counter')
    assert.include(response.text(), 'suar_cache_operation_duration_seconds_bucket')
    assert.notInclude(response.text(), 'cache_key')
    assert.notInclude(response.text(), 'organization_id')
  })
})
