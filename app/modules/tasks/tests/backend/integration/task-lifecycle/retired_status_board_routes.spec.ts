import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

test.group('Integration | retired task status board POC routes', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())

  test('GET page and every POC mutation alias return 404', async ({ client }) => {
    const pageResponse = await client.get('/tasks/status-board')
    pageResponse.assertStatus(404)

    for (const path of [
      '/api/tasks/status-board',
      '/api/v1/tasks/status-board',
      '/api/tasks/board-state',
      '/api/v1/tasks/board-state',
    ]) {
      const response = await client.patch(path).json({ total: 1, simulateConflict: true })
      response.assertStatus(404)
    }
  })
})
