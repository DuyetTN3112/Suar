import { test } from '@japa/runner'

import { CustomSystemRolePermissionCache } from '#modules/authorization/infra/cache/custom_system_role_permission_cache'

test.group('Custom system role permission cache', () => {
  test('loads permissions lazily and reuses the cached map', async ({ assert }) => {
    let loadCount = 0
    const cache = new CustomSystemRolePermissionCache(
      () => {
        loadCount += 1
        return Promise.resolve([
          {
            code: 'auditor',
            permissions: ['can_view_system_logs'],
          },
        ])
      },
      { maxAgeMs: 60_000 }
    )

    assert.deepEqual(await cache.getRolePermissions('auditor'), ['can_view_system_logs'])
    assert.isTrue(await cache.isCustomRole('auditor'))
    assert.isNull(await cache.getRolePermissions('missing'))
    assert.equal(loadCount, 1)
  })

  test('refresh replaces stale role permissions', async ({ assert }) => {
    let permissions = ['can_view_system_logs']
    const cache = new CustomSystemRolePermissionCache(
      () =>
        Promise.resolve([
          {
            code: 'auditor',
            permissions,
          },
        ]),
      { maxAgeMs: 60_000 }
    )

    assert.deepEqual(await cache.getRolePermissions('auditor'), ['can_view_system_logs'])

    permissions = ['can_view_reports']
    await cache.refresh()

    assert.deepEqual(await cache.getRolePermissions('auditor'), ['can_view_reports'])
  })

  test('revalidates every authorization lookup by default', async ({ assert }) => {
    let permissions = ['can_view_system_logs']
    let loadCount = 0
    const cache = new CustomSystemRolePermissionCache(() => {
      loadCount += 1
      return Promise.resolve([{ code: 'auditor', permissions }])
    })

    assert.deepEqual(await cache.getRolePermissions('auditor'), ['can_view_system_logs'])
    permissions = []
    assert.deepEqual(await cache.getRolePermissions('auditor'), [])
    assert.equal(loadCount, 2)
  })

  test('coalesces concurrent authoritative refreshes', async ({ assert }) => {
    let loadCount = 0
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const cache = new CustomSystemRolePermissionCache(async () => {
      loadCount += 1
      await gate
      return [{ code: 'auditor', permissions: ['can_view_system_logs'] }]
    })

    const first = cache.getRolePermissions('auditor')
    const second = cache.isCustomRole('auditor')
    release()

    assert.deepEqual(await first, ['can_view_system_logs'])
    assert.isTrue(await second)
    assert.equal(loadCount, 1)
  })
})
