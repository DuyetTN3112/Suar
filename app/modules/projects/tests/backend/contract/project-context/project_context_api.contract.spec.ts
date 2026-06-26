import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

/**
 * WP-28 contract: the Project Context / Work Package HTTP boundary.
 *
 * Without this transport no creator can author shared context through the UI, so
 * every downstream role-play journey (RP-01..RP-05) is unreachable. These cases
 * prove the routes exist and refuse an unauthenticated caller.
 */
test.group('Contract | Project Context HTTP API', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(async () => {
    await teardownApp()
  })

  test('refuses anonymous Project Context publication', async ({ client }) => {
    const response = await client
      .post('/api/v1/projects/00000000-0000-4000-8000-000000000001/context-versions')
      .json({ title: 'Ctx', summary: 'S', plainTextProjection: 'body', confirmed: true })

    response.assertStatus(401)
  })

  test('refuses anonymous Work Package publication', async ({ client }) => {
    const response = await client
      .post('/api/v1/projects/00000000-0000-4000-8000-000000000001/work-packages')
      .json({ key: 'WP-1', title: 'T', summary: 'S', plainTextProjection: 'body', confirmed: true })

    response.assertStatus(401)
  })
})
