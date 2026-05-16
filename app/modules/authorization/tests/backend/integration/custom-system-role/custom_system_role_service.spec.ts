import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { AuthorizationAdminCustomSystemRoleAdapter } from '#composition/adapters/authorization/authorization_admin_custom_system_role_adapter'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

const TEST_ROLE_PREFIX = 'clean_code_test_'

test.group('Integration | Custom system role use cases', (group) => {
  const useCases = new AuthorizationAdminCustomSystemRoleAdapter()

  group.setup(async () => {
    await setupApp()
  })

  group.teardown(() => teardownApp())

  group.each.teardown(async () => {
    await db.from('custom_system_roles').whereLike('code', `${TEST_ROLE_PREFIX}%`).delete()
    await useCases.refreshCache()
  })

  test('keeps persistence and permission cache consistent across CRUD', async ({ assert }) => {
    const code = `${TEST_ROLE_PREFIX}${randomUUID().replaceAll('-', '')}`
    const created = await useCases.create({
      name: 'Clean Code Test Role',
      code,
      permissions: ['can_view_system_logs'],
    })

    assert.isTrue(await useCases.isCodeTaken(code))
    assert.deepEqual(await useCases.getRolePermissions(code), ['can_view_system_logs'])

    const updated = await useCases.update(created.id, {
      name: 'Updated Clean Code Test Role',
      code,
      permissions: ['can_view_reports'],
      description: 'Updated by integration test',
    })

    assert.equal(updated?.name, 'Updated Clean Code Test Role')
    assert.deepEqual(await useCases.getRolePermissions(code), ['can_view_reports'])

    assert.isTrue(await useCases.delete(created.id))
    assert.isFalse(await useCases.isCustomRole(code))
  })
})
