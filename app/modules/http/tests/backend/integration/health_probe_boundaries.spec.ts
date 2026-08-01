import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

test.group('Integration | Health probe boundaries', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())

  test('liveness stays credential-free and exposes no dependency payload', async ({
    assert,
    client,
  }) => {
    const response = await client.get('/live')

    response.assertStatus(204)
    assert.equal(response.text(), '')
  })
})
