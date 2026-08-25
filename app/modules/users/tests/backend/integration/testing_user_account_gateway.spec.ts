import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { TestingUserAccountGateway } from '#modules/users/infra/adapters/profile/testing_user_account_gateway'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

test.group('Integration | Testing user account gateway', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(() => teardownApp())

  test('ensures one account under concurrency and publishes a pure record', async ({ assert }) => {
    const gateway = new TestingUserAccountGateway()
    const email = `testing-gateway-${randomUUID()}@example.test`

    try {
      const [first, second] = await Promise.all([
        gateway.ensureTestingAccountV1({
          email,
          username: 'testing-gateway',
          systemRole: 'registered_user',
          defaultAuthMethod: 'google',
        }),
        gateway.ensureTestingAccountV1({
          email,
          username: 'testing-gateway',
          systemRole: 'registered_user',
          defaultAuthMethod: 'google',
        }),
      ])

      assert.equal(first.id, second.id)
      assert.deepEqual(Object.keys(first).sort(), [
        'currentOrganizationId',
        'email',
        'id',
        'systemRole',
        'username',
      ])
      assert.notProperty(first, 'serialize')

      const elevated = await gateway.ensureTestingAccountV1({
        email,
        username: 'testing-gateway',
        systemRole: 'system_admin',
        defaultAuthMethod: 'google',
        requestedAuthMethod: 'github',
      })
      assert.equal(elevated.id, first.id)
      assert.equal(elevated.systemRole, 'system_admin')
      const authUser = await gateway.findAuthUserModel(first.id)
      assert.equal(authUser?.auth_method, 'github')
    } finally {
      await db.from('users').where('email', email).delete()
    }
  })
})
