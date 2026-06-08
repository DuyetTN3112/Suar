import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, UserFactory } from '#tests/helpers/factories'

test.group('Integration | Admin Search Projection HTTP authorization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(async () => {
    await teardownApp()
  })
  group.each.teardown(() => cleanupTestData())

  test('rejects anonymous and non-system-admin access before reaching projection operations', async ({
    assert,
    client,
  }) => {
    const regularUser = await UserFactory.create({ system_role: 'registered_user' })

    const anonymousApi = await client.get('/api/admin/search-projections')
    anonymousApi.assertStatus(401)

    const regularApi = await client
      .get('/api/admin/search-projections')
      .loginAs(regularUser)
      .header('accept', 'application/json')
    regularApi.assertStatus(403)

    const regularPage = await client
      .get('/admin/search-projections')
      .loginAs(regularUser)
      .header('accept', 'application/json')
    regularPage.assertStatus(403)
    assert.notInclude(regularPage.text(), 'Search projection generations')
  })

  test('runs the authenticated system-admin route through the real controller composition', async ({
    assert,
    client,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()

    const response = await client
      .get('/api/admin/search-projections')
      .loginAs(superadmin)
      .header('accept', 'application/json')

    response.assertStatus(200)
    const payload = response.body() as { data?: unknown }
    assert.isArray(payload.data)
  })
})
