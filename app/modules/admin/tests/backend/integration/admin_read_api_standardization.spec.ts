import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { makeSystemAdminActionContext } from '#modules/admin/actions/admin_action_context'
import ToggleAdminModeCommand from '#modules/admin/actions/commands/toggle_admin_mode_command'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, OrganizationFactory, UserFactory } from '#tests/helpers/factories'

async function countRows(table: string): Promise<number> {
  const row = (await db.from(table).count('* as total').first()) as
    | { total?: number | string }
    | undefined
  return Number(row?.total ?? 0)
}

function flattenNumbers(value: unknown): number[] {
  if (typeof value === 'number') {
    return [value]
  }
  if (!value || typeof value !== 'object') {
    return []
  }
  return Object.values(value).flatMap((entry) => flattenNumbers(entry))
}

test.group('Integration | Admin read API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('admin dashboard API returns wrapped camelCase stats without success envelope', async ({
    assert,
    client,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()

    const response = await client.get('/api/admin/dashboard').loginAs(superadmin)
    response.assertStatus(200)

    const body = response.body() as {
      data: {
        users: { newThisMonth: number }
        organizations: { newThisMonth: number }
        tasks: { inProgress: number }
        subscriptions: { expiringSoon: number }
        moderation: { pendingFlaggedReviews: number }
      }
    }

    assert.notProperty(body, 'success')
    assert.property(body, 'data')
    assert.property(body.data.users, 'newThisMonth')
    assert.property(body.data.organizations, 'newThisMonth')
    assert.property(body.data.tasks, 'inProgress')
    assert.property(body.data.subscriptions, 'expiringSoon')
    assert.property(body.data.moderation, 'pendingFlaggedReviews')
  })

  test('admin dashboard API returns finite zero defaults for minimal aggregate data', async ({
    assert,
    client,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()

    assert.equal(await countRows('organizations'), 0)
    assert.equal(await countRows('projects'), 0)
    assert.equal(await countRows('tasks'), 0)
    assert.equal(await countRows('user_subscriptions'), 0)
    assert.equal(await countRows('flagged_reviews'), 0)

    const response = await client.get('/api/admin/dashboard').loginAs(superadmin)
    response.assertStatus(200)

    const body = response.body() as {
      data: {
        users: { total: number; active: number; suspended: number; newThisMonth: number }
        organizations: { total: number; newThisMonth: number }
        projects: { total: number; active: number; completed: number }
        tasks: { total: number; inProgress: number; completed: number }
        subscriptions: {
          total: number
          active: number
          expiringSoon: number
          pro: number
          promax: number
        }
        moderation: { pendingFlaggedReviews: number }
      }
    }

    for (const value of flattenNumbers(body.data)) {
      assert.isTrue(Number.isFinite(value))
      assert.isAtLeast(value, 0)
    }
    assert.deepInclude(body.data.users, {
      total: 1,
      active: 1,
      suspended: 0,
    })
    assert.deepEqual(body.data.organizations, { total: 0, newThisMonth: 0 })
    assert.deepEqual(body.data.projects, { total: 0, active: 0, completed: 0 })
    assert.deepEqual(body.data.tasks, { total: 0, inProgress: 0, completed: 0 })
    assert.deepEqual(body.data.subscriptions, {
      total: 0,
      active: 0,
      expiringSoon: 0,
      pro: 0,
      promax: 0,
    })
    assert.equal(body.data.moderation.pendingFlaggedReviews, 0)
  })

  test('admin dashboard API denies regular authenticated users without leaking stats', async ({
    assert,
    client,
  }) => {
    const user = await UserFactory.create({ system_role: 'registered_user' })

    const response = await client.get('/api/admin/dashboard').loginAs(user)
    response.assertStatus(403)

    const body = response.body() as Record<string, unknown>
    assert.notProperty(body, 'data')
  })

  test('admin dashboard routes deny organization owners without treating org authority as system authority', async ({
    assert,
    client,
  }) => {
    const { owner } = await OrganizationFactory.createWithOwner()

    const webResponse = await client.get('/admin').loginAs(owner)
    const apiResponse = await client.get('/api/admin/dashboard').loginAs(owner)

    webResponse.assertStatus(403)
    apiResponse.assertStatus(403)

    assert.notInclude(webResponse.text(), 'Admin Dashboard')
    assert.notInclude(webResponse.text(), 'Bảng điều khiển Admin')
    const apiBody = apiResponse.body() as Record<string, unknown>
    assert.notProperty(apiBody, 'data')
  })

  test('admin shell route denies regular authenticated users without rendering admin UI', async ({
    assert,
    client,
  }) => {
    const user = await UserFactory.create({ system_role: 'registered_user' })

    const response = await client.get('/admin').loginAs(user)
    response.assertStatus(403)

    assert.notInclude(response.text(), 'Admin Dashboard')
    assert.notInclude(response.text(), 'Bảng điều khiển Admin')
  })

  test('admin dashboard API denies guests without leaking stats', async ({ assert, client }) => {
    const response = await client.get('/api/admin/dashboard')
    response.assertStatus(401)

    const body = response.body() as Record<string, unknown>
    assert.notProperty(body, 'data')
  })

  test('admin mode toggle denies regular users without returning an admin-mode success payload', async ({
    assert,
    client,
  }) => {
    const user = await UserFactory.create({ system_role: 'registered_user' })

    const response = await client.post('/admin/toggle').loginAs(user).form({ enabled: 'true' })
    response.assertStatus(403)

    const body = response.body() as Record<string, unknown>
    assert.notEqual(body['success'], true)
    assert.notProperty(body, 'enabled')
    assert.notProperty(body, 'data')
  })

  test('admin mode toggle allows system admins and resolves shell redirects by org context', async ({
    assert,
    client,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const { org, owner: orgSuperadmin } = await OrganizationFactory.createWithOwner(
      { name: 'Admin Toggle Org' },
      { system_role: 'superadmin' }
    )

    const enableResult = await new ToggleAdminModeCommand(
      makeSystemAdminActionContext(superadmin.id)
    ).handle({
      enabled: true,
    })
    assert.deepInclude(enableResult, {
      enabled: true,
      redirectPath: '/admin',
      successMessage: 'Đã bật Admin Mode',
    })

    const disableWithoutOrgResult = await new ToggleAdminModeCommand(
      makeSystemAdminActionContext(superadmin.id)
    ).handle({
      enabled: false,
    })
    assert.deepInclude(disableWithoutOrgResult, {
      enabled: false,
      redirectPath: '/organizations',
      successMessage: 'Đã tắt Admin Mode',
    })

    const disableWithOrgResult = await new ToggleAdminModeCommand({
      ...makeSystemAdminActionContext(orgSuperadmin.id),
      organizationId: org.id,
    }).handle({
      enabled: false,
    })
    assert.deepInclude(disableWithOrgResult, {
      enabled: false,
      redirectPath: '/org',
      successMessage: 'Đã tắt Admin Mode',
    })

    const response = await client
      .post('/admin/toggle')
      .loginAs(superadmin)
      .form({ enabled: 'true' })
      .redirects(0)
    response.assertStatus(302)
    assert.equal(response.header('location'), '/admin')
    assert.notInclude(response.text(), 'E_INTERNAL_ERROR')
  })

  test('admin users API returns wrapped list with pagination and camelCase fields', async ({
    assert,
    client,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const listedUser = await UserFactory.create({ system_role: 'registered_user' })

    const response = await client
      .get('/api/admin/users')
      .loginAs(superadmin)
      .qs({ search: listedUser.username })

    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        id: string
        systemRole: string
        currentOrganizationId: string | null
        isExternalContributor: boolean
        createdAt: string
      }>
      pagination: {
        page: number
        perPage: number
        total: number
        hasNextPage: boolean
        hasPreviousPage: boolean
        mode: string
        nextCursor: string | null
        previousCursor: string | null
      }
      filters: {
        search: string
        systemRole: string | null
        status: string | null
      }
    }

    assert.notProperty(body, 'success')
    assert.isArray(body.data)
    assert.equal(body.data[0]?.id, listedUser.id)
    assert.property(body.data[0] ?? {}, 'systemRole')
    assert.property(body.data[0] ?? {}, 'currentOrganizationId')
    assert.property(body.data[0] ?? {}, 'isExternalContributor')
    assert.property(body.data[0] ?? {}, 'createdAt')
    assert.deepInclude(body.pagination, { page: 1, perPage: 20 })
    assert.equal(body.filters.search, listedUser.username)
  })

  test('admin users pagination stays deterministic when created_at ties', async ({
    assert,
    client,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const olderId = '00000000-0000-4000-8000-000000000001'
    const newerId = '00000000-0000-4000-8000-0000000000ff'
    const sharedCreatedAt = new Date('2026-07-01T10:00:00.000Z')

    await UserFactory.create({
      id: olderId,
      username: 'pagination_tie_user_low',
      status: 'suspended',
    })
    await UserFactory.create({
      id: newerId,
      username: 'pagination_tie_user_high',
      status: 'suspended',
    })

    await db.from('users').whereIn('id', [olderId, newerId]).update({ created_at: sharedCreatedAt })

    const response = await client
      .get('/api/admin/users')
      .loginAs(superadmin)
      .qs({ status: 'suspended', perPage: 2 })

    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{ id: string }>
    }

    assert.deepEqual(
      body.data.map((user) => user.id),
      [newerId, olderId]
    )
  })

  test('admin organizations API returns wrapped list with pagination and camelCase fields', async ({
    assert,
    client,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const { org } = await OrganizationFactory.createWithOwner({ name: 'Admin Contract Org' })

    const response = await client
      .get('/api/admin/organizations')
      .loginAs(superadmin)
      .qs({ search: 'Admin Contract Org' })

    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        id: string
        ownerId: string
        partnerType: string | null
        partnerIsActive: boolean
        createdAt: string
        updatedAt: string
        counts: { members: number; projects: number }
      }>
      pagination: {
        page: number
        perPage: number
        total: number
        hasNextPage: boolean
        hasPreviousPage: boolean
        mode: 'offset' | 'cursor'
        nextCursor: string | null
        previousCursor: string | null
      }
      filters: {
        search: string
      }
    }

    assert.notProperty(body, 'success')
    assert.isArray(body.data)
    assert.equal(body.data[0]?.id, org.id)
    assert.property(body.data[0] ?? {}, 'ownerId')
    assert.property(body.data[0] ?? {}, 'partnerType')
    assert.property(body.data[0] ?? {}, 'partnerIsActive')
    assert.property(body.data[0] ?? {}, 'createdAt')
    assert.property(body.data[0] ?? {}, 'updatedAt')
    assert.property(body.data[0] ?? {}, 'counts')
    assert.deepInclude(body.pagination, { page: 1, perPage: 24 })
    assert.equal(body.filters.search, 'Admin Contract Org')
  })

  test('admin organizations pagination stays deterministic when created_at ties', async ({
    assert,
    client,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const olderId = '00000000-0000-4000-8000-000000000101'
    const newerId = '00000000-0000-4000-8000-0000000001ff'
    const sharedCreatedAt = new Date('2026-07-01T11:00:00.000Z')

    await OrganizationFactory.create({
      id: olderId,
      name: 'Pagination Tie Org Low',
      slug: 'pagination-tie-org-low',
    })
    await OrganizationFactory.create({
      id: newerId,
      name: 'Pagination Tie Org High',
      slug: 'pagination-tie-org-high',
    })

    await db
      .from('organizations')
      .whereIn('id', [olderId, newerId])
      .update({ created_at: sharedCreatedAt })

    const response = await client
      .get('/api/admin/organizations')
      .loginAs(superadmin)
      .qs({ search: 'Pagination Tie Org', perPage: 2 })

    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{ id: string }>
    }

    assert.deepEqual(
      body.data.map((organization) => organization.id),
      [newerId, olderId]
    )
  })

  test('admin audit logs API returns wrapped list with pagination and camelCase fields', async ({
    assert,
    client,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const actor = await UserFactory.create({ username: 'admin_audit_actor' })

    await db.table('audit_events').insert({
      user_id: actor.id,
      action: 'admin_contract_audit',
      entity_type: 'task',
      entity_id: 'task-contract-id',
      old_values: JSON.stringify({ status: 'todo' }),
      new_values: JSON.stringify({ status: 'done' }),
      ip_address: '127.0.0.1',
      user_agent: 'integration-test',
      occurred_at: new Date(),
    })

    const response = await client
      .get('/api/admin/audit-logs')
      .loginAs(superadmin)
      .qs({ search: actor.username })

    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        user: { id: string; username: string } | null
        resourceType: string
        resourceId: string | null
        ipAddress: string
        userAgent: string
        createdAt: string
        details: {
          oldValues: Record<string, unknown>
          newValues: Record<string, unknown>
        }
      }>
      pagination: {
        page: number
        perPage: number
        total: number
        hasNextPage: boolean
        hasPreviousPage: boolean
        mode: 'offset' | 'cursor'
        nextCursor: string | null
        previousCursor: string | null
      }
      filters: {
        search: string
        action: string | null
        resourceType: string | null
        userId: string | null
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data[0]?.user?.id, actor.id)
    assert.equal(body.data[0]?.resourceType, 'task')
    assert.equal(body.data[0]?.resourceId, 'task-contract-id')
    assert.equal(body.data[0]?.ipAddress, '127.0.0.1')
    assert.equal(body.data[0]?.userAgent, 'integration-test')
    assert.deepEqual(body.data[0]?.details.oldValues, { status: 'todo' })
    assert.deepEqual(body.data[0]?.details.newValues, { status: 'done' })
    assert.deepInclude(body.pagination, { page: 1, perPage: 50 })
    assert.equal(body.pagination.mode, 'cursor')
    assert.isBoolean(body.pagination.hasPreviousPage)
    assert.property(body.pagination, 'nextCursor')
    assert.property(body.pagination, 'previousCursor')
    assert.equal(body.filters.search, actor.username)
  })
})
