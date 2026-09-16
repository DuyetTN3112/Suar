import { readFileSync } from 'node:fs'

import { test } from '@japa/runner'

test.group('Notification shell route surface', () => {
  test('registers org and admin inbox routes', ({ assert }) => {
    const orgRoutes = readFileSync('start/routes/organizations_current.ts', 'utf8')
    const adminRoutes = readFileSync('start/routes/admin.ts', 'utf8')

    assert.include(orgRoutes, ".get('/notifications', [OrgListNotificationsController, 'handle'])")
    assert.include(
      orgRoutes,
      ".get('/:taskId/applications', [ListMarketplaceTaskApplicationsController, 'handle'])"
    )
    assert.include(adminRoutes, ".get('/notifications', [AdminListNotificationsController, 'handle'])")
  })
})
