import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { customSystemRoleApi } from '#modules/authorization/public_contracts/custom-system-role/custom_system_role_api'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

const TEST_ROLE_PREFIX = 'public_api_role_'

test.group('Integration | Custom system role public API', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(() => teardownApp())

  group.each.teardown(async () => {
    await db.from('custom_system_roles').whereLike('code', `${TEST_ROLE_PREFIX}%`).delete()
    await customSystemRoleApi.refreshCache()
  })

  test('publishes plain role records while keeping cache and persistence consistent', async ({
    assert,
  }) => {
    const code = `${TEST_ROLE_PREFIX}${randomUUID().replaceAll('-', '')}`
    const created = await customSystemRoleApi.create({
      name: 'Public API Role',
      code,
      permissions: ['can_view_system_logs'],
    })

    assert.deepEqual(Object.keys(created).sort(), [
      'code',
      'createdAt',
      'description',
      'id',
      'name',
      'permissions',
      'updatedAt',
    ])
    assert.notProperty(created, 'serialize')
    assert.isTrue(await customSystemRoleApi.isCodeTaken(code))
    assert.deepEqual(await customSystemRoleApi.getRolePermissions(code), [
      'can_view_system_logs',
    ])

    const updated = await customSystemRoleApi.update(created.id, {
      name: 'Updated Public API Role',
      code,
      description: 'Explicit public record',
      permissions: ['can_view_reports'],
    })

    assert.equal(updated?.name, 'Updated Public API Role')
    assert.equal(updated?.description, 'Explicit public record')
    assert.deepEqual(await customSystemRoleApi.getRolePermissions(code), ['can_view_reports'])
    const listed = await customSystemRoleApi.list()
    assert.deepInclude(listed.find((role) => role.id === created.id) ?? {}, {
      id: created.id,
      code,
      permissions: ['can_view_reports'],
    })

    assert.isTrue(await customSystemRoleApi.delete(created.id))
    assert.isFalse(await customSystemRoleApi.isCustomRole(code))
  })
})
