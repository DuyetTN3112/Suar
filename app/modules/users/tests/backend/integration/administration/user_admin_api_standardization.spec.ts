import { test } from '@japa/runner'

import OrganizationUser from '#modules/organizations/infra/models/members/organization_user'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  UserFactory,
} from '#tests/helpers/factories'

async function buildSystemUserAdminScenario() {
  const { org } = await OrganizationFactory.createWithOwner()
  const admin = await UserFactory.createSuperadmin({ current_organization_id: org.id })
  await OrganizationUserFactory.create({
    organization_id: org.id,
    user_id: admin.id,
    org_role: 'org_owner',
    status: 'approved',
  })

  return { org, admin }
}

test.group('Integration | User admin API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('system users API returns wrapped camelCase list with pagination', async ({
    assert,
    client,
  }) => {
    const { admin } = await buildSystemUserAdminScenario()
    const outsider = await UserFactory.create({
      current_organization_id: null,
      username: 'system-outsider',
    })

    const response = await client.get('/api/system-users').loginAs(admin)
    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        id: string
        username: string
        currentOrganization: unknown
      }>
      pagination: {
        mode: 'offset'
        page: number
        perPage: number
        total: number
        lastPage: number
        hasNextPage: boolean
        hasPreviousPage: boolean
        nextCursor: string | null
        previousCursor: string | null
      }
    }

    assert.notProperty(body, 'success')
    assert.exists(
      body.data.find((user) => user.id === outsider.id && user.username === 'system-outsider')
    )
    assert.deepEqual(body.pagination, {
      mode: 'offset',
      page: 1,
      perPage: 10,
      total: body.data.length,
      lastPage: 1,
      hasNextPage: false,
      hasPreviousPage: false,
      nextCursor: null,
      previousCursor: null,
    })
  })

  test('canonical v1 system users API preserves legacy contract shape', async ({
    assert,
    client,
  }) => {
    const { admin } = await buildSystemUserAdminScenario()
    const outsider = await UserFactory.create({
      current_organization_id: null,
      username: 'system-outsider-v1',
    })

    const response = await client.get('/api/v1/system-users').loginAs(admin)
    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        id: string
        username: string
        currentOrganization: unknown
      }>
      pagination: {
        mode: 'offset'
        page: number
        perPage: number
        total: number
        lastPage: number
        hasNextPage: boolean
        hasPreviousPage: boolean
        nextCursor: string | null
        previousCursor: string | null
      }
    }

    assert.notProperty(body, 'success')
    assert.exists(
      body.data.find((user) => user.id === outsider.id && user.username === 'system-outsider-v1')
    )
    assert.deepEqual(body.pagination, {
      mode: 'offset',
      page: 1,
      perPage: 10,
      total: body.data.length,
      lastPage: 1,
      hasNextPage: false,
      hasPreviousPage: false,
      nextCursor: null,
      previousCursor: null,
    })
  })

  test('pending approval compatibility APIs return wrapped canonical responses with deprecation headers', async ({
    assert,
    client,
  }) => {
    const { org, admin } = await buildSystemUserAdminScenario()
    const pendingUser = await UserFactory.create({
      current_organization_id: org.id,
      username: 'pending-talent',
      email: 'pending@example.com',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: pendingUser.id,
      org_role: 'org_member',
      status: 'pending',
    })

    const listResponse = await client.get('/api/users/pending-approval').loginAs(admin)
    listResponse.assertStatus(200)
    assert.equal(listResponse.header('deprecation'), 'true')
    assert.equal(listResponse.header('sunset'), '2026-12-31')
    assert.equal(
      listResponse.header('link'),
      '</api/users/pending-approvals>; rel="successor-version"'
    )

    const listBody = listResponse.body() as {
      data: Array<{
        id: string
        username: string
        email: string
        avatarUrl: string | null
        createdAt: string
      }>
      pagination: {
        mode: 'offset'
        page: number
        perPage: number
        total: number
        lastPage: number
        hasNextPage: boolean
        hasPreviousPage: boolean
        nextCursor: string | null
        previousCursor: string | null
      }
    }

    assert.notProperty(listBody, 'success')
    assert.exists(
      listBody.data.find(
        (user) =>
          user.id === pendingUser.id &&
          user.username === 'pending-talent' &&
          user.email === 'pending@example.com'
      )
    )
    assert.deepEqual(listBody.pagination, {
      mode: 'offset',
      page: 1,
      perPage: 1,
      total: 1,
      lastPage: 1,
      hasNextPage: false,
      hasPreviousPage: false,
      nextCursor: null,
      previousCursor: null,
    })

    const countResponse = await client.get('/api/users/pending-approval/count').loginAs(admin)
    countResponse.assertStatus(200)
    assert.equal(countResponse.header('deprecation'), 'true')
    assert.equal(
      countResponse.header('link'),
      '</api/users/pending-approvals/count>; rel="successor-version"'
    )

    const countBody = countResponse.body() as { data: { count: number } }
    assert.notProperty(countBody, 'success')
    assert.equal(countBody.data.count, 1)
  })

  test('canonical v1 pending approvals APIs preserve legacy wrapped contract on plural noun path', async ({
    assert,
    client,
  }) => {
    const { org, admin } = await buildSystemUserAdminScenario()
    const pendingUser = await UserFactory.create({
      current_organization_id: org.id,
      username: 'pending-v1-talent',
      email: 'pending-v1@example.com',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: pendingUser.id,
      org_role: 'org_member',
      status: 'pending',
    })

    const listResponse = await client.get('/api/v1/users/pending-approvals').loginAs(admin)
    listResponse.assertStatus(200)
    assert.isUndefined(listResponse.header('deprecation'))

    const listBody = listResponse.body() as {
      data: Array<{
        id: string
        username: string
        email: string
      }>
      pagination: {
        mode: 'offset'
        page: number
        perPage: number
        total: number
        lastPage: number
        hasNextPage: boolean
        hasPreviousPage: boolean
        nextCursor: string | null
        previousCursor: string | null
      }
    }

    assert.notProperty(listBody, 'success')
    assert.exists(
      listBody.data.find(
        (user) =>
          user.id === pendingUser.id &&
          user.username === 'pending-v1-talent' &&
          user.email === 'pending-v1@example.com'
      )
    )
    assert.deepEqual(listBody.pagination, {
      mode: 'offset',
      page: 1,
      perPage: 1,
      total: 1,
      lastPage: 1,
      hasNextPage: false,
      hasPreviousPage: false,
      nextCursor: null,
      previousCursor: null,
    })

    const countResponse = await client.get('/api/v1/users/pending-approvals/count').loginAs(admin)
    countResponse.assertStatus(200)
    assert.isUndefined(countResponse.header('deprecation'))

    const countBody = countResponse.body() as { data: { count: number } }
    assert.notProperty(countBody, 'success')
    assert.equal(countBody.data.count, 1)
  })

  test('deprecated v1 pending approval aliases still preserve wrapped contract with migration headers', async ({
    assert,
    client,
  }) => {
    const { org, admin } = await buildSystemUserAdminScenario()
    const pendingUser = await UserFactory.create({
      current_organization_id: org.id,
      username: 'pending-v1-alias-talent',
      email: 'pending-v1-alias@example.com',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: pendingUser.id,
      org_role: 'org_member',
      status: 'pending',
    })

    const listResponse = await client.get('/api/v1/users/pending-approval').loginAs(admin)
    listResponse.assertStatus(200)
    assert.equal(listResponse.header('deprecation'), 'true')
    assert.equal(
      listResponse.header('link'),
      '</api/v1/users/pending-approvals>; rel="successor-version"'
    )

    const countResponse = await client.get('/api/v1/users/pending-approval/count').loginAs(admin)
    countResponse.assertStatus(200)
    assert.equal(countResponse.header('deprecation'), 'true')
    assert.equal(
      countResponse.header('link'),
      '</api/v1/users/pending-approvals/count>; rel="successor-version"'
    )
  })

  test('approve user JSON path returns 204 and updates pending membership', async ({
    assert,
    client,
  }) => {
    const { org, admin } = await buildSystemUserAdminScenario()
    const pendingUser = await UserFactory.create({
      current_organization_id: org.id,
      username: 'approve-me',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: pendingUser.id,
      org_role: 'org_member',
      status: 'pending',
    })

    const response = await client
      .put(`/users/${pendingUser.id}/approve`)
      .loginAs(admin)
      .header('accept', 'application/json')

    response.assertStatus(204)

    const membership = await OrganizationUser.query()
      .where('organization_id', org.id)
      .where('user_id', pendingUser.id)
      .firstOrFail()

    assert.equal(membership.status, 'approved')
  })

  test('canonical v1 approve user JSON path preserves 204 contract and mutation behavior', async ({
    assert,
    client,
  }) => {
    const { org, admin } = await buildSystemUserAdminScenario()
    const pendingUser = await UserFactory.create({
      current_organization_id: org.id,
      username: 'approve-me-v1',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: pendingUser.id,
      org_role: 'org_member',
      status: 'pending',
    })

    const response = await client.put(`/api/v1/users/${pendingUser.id}/approve`).loginAs(admin)

    response.assertStatus(204)

    const membership = await OrganizationUser.query()
      .where('organization_id', org.id)
      .where('user_id', pendingUser.id)
      .firstOrFail()

    assert.equal(membership.status, 'approved')
  })
})
