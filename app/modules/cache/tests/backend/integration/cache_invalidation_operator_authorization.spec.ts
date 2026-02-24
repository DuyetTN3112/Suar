import { test } from '@japa/runner'

import { authorizeCacheInvalidationOperatorQuery } from '#composition/cache_invalidation_operator_composition'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, UserFactory } from '#tests/helpers/factories'

test.group('Integration | Cache invalidation operator authorization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('allows active system operators and rejects a regular user', async ({ assert }) => {
    const systemAdmin = await UserFactory.create({ system_role: 'system_admin' })
    const superadmin = await UserFactory.createSuperadmin()
    const regularUser = await UserFactory.create({ system_role: 'registered_user' })

    assert.deepEqual(await authorizeCacheInvalidationOperatorQuery.execute(systemAdmin.id), {
      id: systemAdmin.id,
      systemRole: 'system_admin',
    })
    assert.deepEqual(await authorizeCacheInvalidationOperatorQuery.execute(superadmin.id), {
      id: superadmin.id,
      systemRole: 'superadmin',
    })
    assert.isNull(await authorizeCacheInvalidationOperatorQuery.execute(regularUser.id))
  })

  test('rejects an inactive privileged actor and an unknown actor', async ({ assert }) => {
    const suspendedAdmin = await UserFactory.create({
      system_role: 'system_admin',
      status: 'suspended',
    })

    assert.isNull(await authorizeCacheInvalidationOperatorQuery.execute(suspendedAdmin.id))
    assert.isNull(
      await authorizeCacheInvalidationOperatorQuery.execute('00000000-0000-0000-0000-000000000000')
    )
  })
})
