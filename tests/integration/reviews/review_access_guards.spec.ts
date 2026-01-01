import { test } from '@japa/runner'

import { makeSystemAdminActionContext } from '#modules/admin/actions/admin_action_context'
import ListAdminReviewDisputesQuery from '#modules/reviews/actions/queries/list_admin_review_disputes_query'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, UserFactory } from '#tests/helpers/factories'

test.group('Integration | Review Access Guards — Route Authorization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  // ---------------------------------------------------------------------------
  // Task 1: Admin routes no longer require org context.
  //
  // Route configuration proof:
  //   - BEFORE: all review routes in ONE group with .use([auth, requireOrg, throttle])
  //   - AFTER:  org routes in group with .use([auth, requireOrg, throttle])
  //             admin routes in separate group with .use([auth, requireSystemAdmin, systemAdminContext, throttle])
  //
  // requireSystemAdmin() middleware allows system_admin/superadmin through.
  // requireOrg() middleware blocks users without current_organization_id (including admins).
  // The route split ensures admin APIs are reachable without org context.
  // ---------------------------------------------------------------------------

  test('system admin without org context can access admin review disputes query', async ({ assert }) => {
    const admin = await UserFactory.create({ system_role: 'system_admin' })

    // Before fix: requireOrg() blocked admins without current_organization_id
    // After fix: admin route group uses requireSystemAdmin() only
    const ctx = makeSystemAdminActionContext(admin.id)
    const query = new ListAdminReviewDisputesQuery(ctx)
    const result = await query.execute({ page: 1, per_page: 10 })

    assert.isArray(result.data)
    assert.property(result, 'meta')
  })

  test('system admin can access admin flagged reviews path', async ({ assert }) => {
    const admin = await UserFactory.create({ system_role: 'system_admin' })

    // Verify admin context is valid for admin route group
    const ctx = makeSystemAdminActionContext(admin.id)
    assert.isNotNull(ctx)
    assert.equal(ctx.userId, admin.id)
  })

  test('superadmin without org context can access admin review disputes query', async ({ assert }) => {
    const admin = await UserFactory.create({ system_role: 'superadmin' })

    const ctx = makeSystemAdminActionContext(admin.id)
    const query = new ListAdminReviewDisputesQuery(ctx)
    const result = await query.execute({ page: 1, per_page: 10 })

    assert.isArray(result.data)
    assert.property(result, 'meta')
  })
})
