import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { ADMIN_AUDIT_FILTER_CONTEXT } from '#modules/admin/audit_logs/filtering/audit_logs/admin_audit_filter_context_provider'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, OrganizationFactory, OrganizationUserFactory, UserFactory } from '#tests/helpers/factories'

const criteria = {
  context: ADMIN_AUDIT_FILTER_CONTEXT,
  schemaVersion: 1,
  sort: [{ field: 'audit.createdAt', direction: 'desc' }],
  page: { size: 10 },
}

test.group('Contract | Saved Filter Views HTTP API', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.each.teardown(async () => cleanupTestData())
  group.teardown(async () => teardownApp())

  test('creates and lists a private saved view through the authenticated API', async ({
    client,
    assert,
  }) => {
    const admin = await UserFactory.createSuperadmin()

    const created = await client
      .post('/api/v1/filter-saved-views')
      .loginAs(admin)
      .json({
        name: 'Audit failures',
        contextKey: ADMIN_AUDIT_FILTER_CONTEXT,
        contextOwner: 'admin',
        criteria,
        presentation: { view: 'table' },
      })

      created.assertStatus(201)
    const rawCreatedBody: unknown = created.body()
    const view = (rawCreatedBody as { view: { id: string; criteria: typeof criteria } }).view
    assert.isString(view.id)
    assert.equal(view.criteria.context, criteria.context)
    assert.deepEqual(view.criteria.sort, criteria.sort)
    assert.equal(view.criteria.page.size, 25, 'pagination is request state and is not persisted')

    const listed = await client
      .get('/api/v1/filter-saved-views')
      .qs({ context: ADMIN_AUDIT_FILTER_CONTEXT })
      .loginAs(admin)

    listed.assertStatus(200)
    const rawListedBody: unknown = listed.body()
    assert.equal((rawListedBody as { views: unknown[] }).views.length, 1)
  })

  test('does not expose the saved-view API to anonymous callers', async ({ client }) => {
    const response = await client.get('/api/v1/filter-saved-views').qs({
      context: ADMIN_AUDIT_FILTER_CONTEXT,
    })

    response.assertStatus(401)
  })

  test('maps an inaccessible saved-view lookup to the stable unavailable response', async ({
    client,
    assert,
  }) => {
    const admin = await UserFactory.createSuperadmin()
    const response = await client
      .get(`/api/v1/filter-saved-views/${randomUUID()}`)
      .loginAs(admin)

    response.assertStatus(401)
    assert.equal((response.body() as { code: string }).code, 'SAVED_FILTER_VIEW_UNAVAILABLE')
  })

  test('duplicates a saved view through the API without copying result or alert state', async ({
    client,
    assert,
  }) => {
    const admin = await UserFactory.createSuperadmin()
    const sourceResponse = await client
      .post('/api/v1/filter-saved-views')
      .loginAs(admin)
      .json({
        name: 'Source audit view',
        contextKey: ADMIN_AUDIT_FILTER_CONTEXT,
        contextOwner: 'admin',
        criteria,
        presentation: { view: 'table' },
        isPinned: true,
      })
    sourceResponse.assertStatus(201)
    const source = (sourceResponse.body() as { view: { id: string } }).view

    const duplicated = await client
      .post(`/api/v1/filter-saved-views/${source.id}/duplicate`)
      .loginAs(admin)
      .json({ name: 'Copied audit view' })

    duplicated.assertStatus(201)
    const copy = (duplicated.body() as { view: Record<string, unknown> }).view
    assert.notEqual(copy['id'], source.id)
    assert.equal(copy['name'], 'Copied audit view')
    assert.equal(copy['alertStatus'], 'disabled')
    assert.equal(copy['isDefault'], false)
  })

  test('maps a stale saved-view revision to a deterministic conflict response', async ({ client }) => {
    const admin = await UserFactory.createSuperadmin()
    const created = await client
      .post('/api/v1/filter-saved-views')
      .loginAs(admin)
      .json({
        name: 'Conflict audit view',
        contextKey: ADMIN_AUDIT_FILTER_CONTEXT,
        contextOwner: 'admin',
        criteria,
      })
    created.assertStatus(201)
    const view = (created.body() as { view: { id: string } }).view

    const conflict = await client
      .put(`/api/v1/filter-saved-views/${view.id}`)
      .loginAs(admin)
      .json({ name: 'Concurrent update', expectedLockVersion: 99 })

    conflict.assertStatus(409)
    const body = conflict.body() as { code: string }
    if (body.code !== 'OPTIMISTIC_CONFLICT') throw new Error(`Unexpected error code: ${body.code}`)
  })

  test('repairs a persisted migration state only with an explicit semantic replacement', async ({
    client,
    assert,
  }) => {
    const admin = await UserFactory.createSuperadmin()
    const created = await client
      .post('/api/v1/filter-saved-views')
      .loginAs(admin)
      .json({
        name: 'Repair audit view',
        contextKey: ADMIN_AUDIT_FILTER_CONTEXT,
        contextOwner: 'admin',
        criteria,
      })
    created.assertStatus(201)
    const view = (created.body() as { view: { id: string; lockVersion: number } }).view
    await db.from('filter_saved_views').where('id', view.id).update({ migration_state: 'requires_repair' })

    const repaired = await client
      .put(`/api/v1/filter-saved-views/${view.id}`)
      .loginAs(admin)
      .json({ criteria, expectedLockVersion: view.lockVersion, repair: true })

    repaired.assertStatus(200)
    assert.equal((repaired.body() as { view: { migrationState: string } }).view.migrationState, 'current')
  })

  test('rejects alert creation when the owning context has alerts disabled', async ({ client, assert }) => {
    const admin = await UserFactory.createSuperadmin()
    const created = await client
      .post('/api/v1/filter-saved-views')
      .loginAs(admin)
      .json({ name: 'Alert-disabled audit view', contextKey: ADMIN_AUDIT_FILTER_CONTEXT, contextOwner: 'admin', criteria })
    created.assertStatus(201)
    const view = (created.body() as { view: { id: string } }).view

    const response = await client
      .post(`/api/v1/filter-saved-views/${view.id}/alert`)
      .loginAs(admin)
      .json({ intervalMinutes: 30, timezone: 'UTC' })

    response.assertStatus(401)
    assert.equal((response.body() as { code: string }).code, 'SAVED_FILTER_VIEW_UNAVAILABLE')
    const alertCount: unknown = await db.from('filter_alerts').where('saved_view_id', view.id).count('* as total').first()
    if (alertCount === null || typeof alertCount !== 'object' || !('total' in alertCount)) throw new Error('Missing alert count')
    assert.equal(alertCount.total, '0')
  })

  test('reads and mutates an existing alert through the authenticated lifecycle API', async ({ client, assert }) => {
    const admin = await UserFactory.createSuperadmin()
    const created = await client
      .post('/api/v1/filter-saved-views')
      .loginAs(admin)
      .json({ name: 'Existing alert view', contextKey: ADMIN_AUDIT_FILTER_CONTEXT, contextOwner: 'admin', criteria })
    created.assertStatus(201)
    const view = (created.body() as { view: { id: string; lockVersion: number } }).view
    const alertId = randomUUID()
    await db.table('filter_alerts').insert({
      id: alertId,
      saved_view_id: view.id,
      owner_user_id: admin.id,
      saved_view_lock_version: view.lockVersion,
      status: 'active',
      interval_minutes: 30,
      timezone: 'UTC',
      next_run_at: new Date(Date.now() + 30 * 60_000).toISOString(),
      lock_version: 1,
    })

    const shown = await client.get(`/api/v1/filter-saved-views/${view.id}/alert`).loginAs(admin)
    shown.assertStatus(200)
    assert.deepEqual((shown.body() as { alert: { status: string; lockVersion: number } }).alert, {
      id: alertId,
      savedViewId: view.id,
      status: 'active',
      intervalMinutes: 30,
      timezone: 'UTC',
      nextRunAt: (shown.body() as { alert: { nextRunAt: string } }).alert.nextRunAt,
      lastSuccessfulAt: null,
      pauseReason: null,
      lockVersion: 1,
    })

    const paused = await client.put(`/api/v1/filter-saved-views/${view.id}/alert`).loginAs(admin).json({ action: 'pause', expectedLockVersion: 1 })
    paused.assertStatus(200)
    assert.equal((paused.body() as { alert: { status: string; pauseReason: string; lockVersion: number } }).alert.pauseReason, 'user_paused')
    assert.equal((paused.body() as { alert: { lockVersion: number } }).alert.lockVersion, 2)

    const resumed = await client.put(`/api/v1/filter-saved-views/${view.id}/alert`).loginAs(admin).json({ action: 'resume', expectedLockVersion: 2 })
    resumed.assertStatus(200)
    assert.equal((resumed.body() as { alert: { status: string; lockVersion: number } }).alert.status, 'active')
    assert.equal((resumed.body() as { alert: { lockVersion: number } }).alert.lockVersion, 3)

    const deleted = await client.delete(`/api/v1/filter-saved-views/${view.id}/alert`).loginAs(admin).json({ action: 'delete', expectedLockVersion: 3 })
    deleted.assertStatus(204)
    assert.isNull(await db.from('filter_alerts').where('id', alertId).whereNull('deleted_at').first())
  })

  test('does not resume a taxonomy-paused alert until its saved view is explicitly repaired', async ({ client, assert }) => {
    const admin = await UserFactory.createSuperadmin()
    const created = await client
      .post('/api/v1/filter-saved-views')
      .loginAs(admin)
      .json({ name: 'Taxonomy repair alert view', contextKey: ADMIN_AUDIT_FILTER_CONTEXT, contextOwner: 'admin', criteria })
    created.assertStatus(201)
    const view = (created.body() as { view: { id: string; lockVersion: number } }).view
    const alertId = randomUUID()
    await db.from('filter_saved_views').where('id', view.id).update({ migration_state: 'requires_repair' })
    await db.table('filter_alerts').insert({
      id: alertId,
      saved_view_id: view.id,
      owner_user_id: admin.id,
      saved_view_lock_version: view.lockVersion,
      status: 'paused',
      pause_reason: 'taxonomy_requires_repair',
      interval_minutes: 30,
      timezone: 'UTC',
      next_run_at: new Date(Date.now() + 30 * 60_000).toISOString(),
      lock_version: 1,
    })

    const blockedResume = await client
      .put(`/api/v1/filter-saved-views/${view.id}/alert`)
      .loginAs(admin)
      .json({ action: 'resume', expectedLockVersion: 1 })
    blockedResume.assertStatus(401)
    assert.equal((await db.from('filter_alerts').where('id', alertId).first() as { status: string; lock_version: number }).status, 'paused')

    const repaired = await client
      .put(`/api/v1/filter-saved-views/${view.id}`)
      .loginAs(admin)
      .json({ criteria, expectedLockVersion: view.lockVersion, repair: true })
    repaired.assertStatus(200)

    const resumed = await client
      .put(`/api/v1/filter-saved-views/${view.id}/alert`)
      .loginAs(admin)
      .json({ action: 'resume', expectedLockVersion: 1 })
    resumed.assertStatus(200)
    assert.equal((resumed.body() as { alert: { status: string; pauseReason: string | null } }).alert.status, 'active')
    assert.isNull((resumed.body() as { alert: { pauseReason: string | null } }).alert.pauseReason)
  })

  test('re-authorizes every saved-view transport operation after stale organization membership is revoked', async ({
    client,
    assert,
  }) => {
    const owner = await UserFactory.createSuperadmin()
    const organization = await OrganizationFactory.create({ owner_id: owner.id })
    await owner.merge({ current_organization_id: organization.id }).save()
    await OrganizationUserFactory.create({
      organization_id: organization.id,
      user_id: owner.id,
      org_role: 'org_owner',
    })
    const reader = await UserFactory.create({ current_organization_id: organization.id })
    await OrganizationUserFactory.create({
      organization_id: organization.id,
      user_id: reader.id,
      org_role: 'org_member',
    })

    const created = await client
      .post('/api/v1/filter-saved-views')
      .loginAs(owner)
      .json({
        name: 'Membership revoke transport probe',
        contextKey: ADMIN_AUDIT_FILTER_CONTEXT,
        contextOwner: 'admin',
        criteria: {
          ...criteria,
          filter: {
            kind: 'condition',
            field: 'audit.actorId',
            operator: 'eq',
            effect: 'require',
            value: { kind: 'scalar', value: 'transport-private-criterion' },
            unknown: 'exclude',
          },
        },
      })
    created.assertStatus(201)
    const view = (created.body() as { view: { id: string } }).view

    await db.from('filter_saved_views').where('id', view.id).update({
      visibility: 'organization',
      organization_id: organization.id,
    })

    await db.table('filter_saved_view_grants').insert({
      saved_view_id: view.id,
      grantee_type: 'organization',
      grantee_id: organization.id,
      can_read: true,
      can_edit: false,
      can_share: false,
      can_subscribe: true,
      created_by: owner.id,
      revoked_at: null,
    })

    const alertId = randomUUID()
    await db.table('filter_alerts').insert({
      id: alertId,
      saved_view_id: view.id,
      owner_user_id: reader.id,
      saved_view_lock_version: 1,
      status: 'active',
      interval_minutes: 30,
      timezone: 'UTC',
      next_run_at: new Date(Date.now() + 30 * 60_000).toISOString(),
      lock_version: 1,
    })

    const beforeRevoke = await client.get(`/api/v1/filter-saved-views/${view.id}`).loginAs(reader)
    beforeRevoke.assertStatus(200)
    assert.include(JSON.stringify(beforeRevoke.body()), 'transport-private-criterion')

    const beforeAlert = await client.get(`/api/v1/filter-saved-views/${view.id}/alert`).loginAs(reader)
    beforeAlert.assertStatus(200)
    assert.equal((beforeAlert.body() as { alert: { id: string } }).alert.id, alertId)

    await db
      .from('organization_users')
      .where('organization_id', organization.id)
      .where('user_id', reader.id)
      .delete()

    const listed = await client
      .get('/api/v1/filter-saved-views')
      .qs({ context: ADMIN_AUDIT_FILTER_CONTEXT })
      .loginAs(reader)
    listed.assertStatus(200)
    assert.deepEqual((listed.body() as { views: unknown[] }).views, [])
    assert.notInclude(JSON.stringify(listed.body()), 'transport-private-criterion')

    const unavailable = (response: Awaited<ReturnType<typeof client.get>>) => {
      response.assertStatus(401)
      assert.isString((response.body() as { code: string }).code)
      assert.notInclude(JSON.stringify(response.body()), 'transport-private-criterion')
    }

    unavailable(await client.get(`/api/v1/filter-saved-views/${view.id}`).loginAs(reader))
    unavailable(await client.get(`/api/v1/filter-saved-views/${view.id}/alert`).loginAs(reader))
    unavailable(await client.post(`/api/v1/filter-saved-views/${view.id}/alert`).loginAs(reader).json({ intervalMinutes: 30, timezone: 'UTC' }))
    unavailable(await client.put(`/api/v1/filter-saved-views/${view.id}/alert`).loginAs(reader).json({ action: 'pause', expectedLockVersion: 1 }))
    unavailable(await client.delete(`/api/v1/filter-saved-views/${view.id}/alert`).loginAs(reader).json({ action: 'delete', expectedLockVersion: 1 }))

    const persistedAlert = (await db.from('filter_alerts').where('id', alertId).first()) as { deleted_at: Date | string | null } | null
    assert.isNotNull(persistedAlert)
    if (persistedAlert !== null) assert.isNull(persistedAlert.deleted_at)
  })
})
