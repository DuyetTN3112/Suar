import { test } from '@japa/runner'

import env from '#start/env'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

test.group('Integration | Notification metrics endpoint', (group) => {
  const collectorKey = 'notification-metrics-integration-key'
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

  test('rejects an unauthenticated scrape', async ({ assert, client }) => {
    const response = await client.get('/metrics/notifications')

    response.assertStatus(401)
    assert.notInclude(response.text(), 'suar_notification_feed_reads_total')
  })

  test('serves low-cardinality feed metrics to the operations collector', async ({
    assert,
    client,
  }) => {
    const response = await client
      .get('/metrics/notifications')
      .header('x-api-key', collectorKey)

    response.assertStatus(200)
    assert.equal(response.header('content-type'), 'text/plain; version=0.0.4; charset=utf-8')
    assert.include(response.text(), '# TYPE suar_notification_feed_reads_total counter')
    assert.include(response.text(), 'suar_notification_feed_search_total')
    assert.include(response.text(), 'suar_notification_feed_fallback_admission_total')
    assert.notInclude(response.text(), 'recipient')
    assert.notInclude(response.text(), 'user_id')
  })
})
