import { test } from '@japa/runner'

import OrganizationUser from '#modules/organizations/infra/models/members/organization_user'
import UserProfileSnapshot from '#modules/users/infra/models/profile/user_profile_snapshot'
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

async function buildProfileOwnerScenario() {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  return { org, owner }
}

test.group('Integration | User admin and snapshot mutation API standardization', (group) => {
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

  test('publish profile snapshot API accepts camelCase body and returns wrapped camelCase data', async ({
    assert,
    client,
  }) => {
    const { owner } = await buildProfileOwnerScenario()

    const response = await client.post('/api/me/profile-snapshots').loginAs(owner).json({
      snapshotName: 'Public v2',
      isPublic: true,
    })

    response.assertStatus(201)

    const body = response.body() as {
      data: {
        snapshotId: string
        version: number
        shareableSlug: string
        shareableToken: string
        isPublic: boolean
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.version, 1)
    assert.isTrue(body.data.isPublic)
    assert.isString(body.data.shareableSlug)
    assert.isString(body.data.shareableToken)
  })

  test('canonical v1 publish profile snapshot API preserves legacy wrapped camelCase data contract', async ({
    assert,
    client,
  }) => {
    const { owner } = await buildProfileOwnerScenario()

    const legacyResponse = await client.post('/api/me/profile-snapshots').loginAs(owner).json({
      snapshotName: 'Legacy public snapshot',
      isPublic: true,
    })
    legacyResponse.assertStatus(201)

    const canonicalResponse = await client
      .post('/api/v1/me/profile-snapshots')
      .loginAs(owner)
      .json({
        snapshotName: 'Canonical public snapshot',
        isPublic: true,
      })
    canonicalResponse.assertStatus(201)

    const legacyBody = legacyResponse.body() as {
      data: {
        version: number
        isPublic: boolean
      }
    }
    const canonicalBody = canonicalResponse.body() as typeof legacyBody

    assert.equal(legacyBody.data.version, 1)
    assert.equal(canonicalBody.data.version, 2)
    assert.isTrue(legacyBody.data.isPublic)
    assert.isTrue(canonicalBody.data.isPublic)
  })

  test('update snapshot access API accepts camelCase body and returns wrapped camelCase data', async ({
    assert,
    client,
  }) => {
    const { owner } = await buildProfileOwnerScenario()
    const snapshot = await UserProfileSnapshot.create({
      user_id: owner.id,
      version: 1,
      snapshot_name: 'Private snapshot',
      is_current: true,
      is_public: false,
      shareable_slug: null,
      shareable_token: null,
      summary: {},
      skills_verified: [],
      work_highlights: [],
      performance_metrics: {},
      trust_metrics: {},
      scoring_version: 'v1',
    })
    const response = await client
      .patch(`/api/me/profile-snapshots/${snapshot.id}/access`)
      .loginAs(owner)
      .json({
        isPublic: true,
        expiresInDays: 7,
      })

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        snapshotId: string
        isPublic: boolean
        shareableSlug: string
        shareableToken: string
        expiresAt: string | null
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.snapshotId, snapshot.id)
    assert.isTrue(body.data.isPublic)
    assert.isString(body.data.shareableSlug)
    assert.isString(body.data.shareableToken)
  })

  test('canonical v1 update snapshot access API preserves legacy wrapped camelCase data contract', async ({
    assert,
    client,
  }) => {
    const { owner } = await buildProfileOwnerScenario()
    const snapshot = await UserProfileSnapshot.create({
      user_id: owner.id,
      version: 1,
      snapshot_name: 'Private snapshot v1 parity',
      is_current: true,
      is_public: false,
      shareable_slug: null,
      shareable_token: null,
      summary: {},
      skills_verified: [],
      work_highlights: [],
      performance_metrics: {},
      trust_metrics: {},
      scoring_version: 'v1',
    })

    const legacyResponse = await client
      .patch(`/api/me/profile-snapshots/${snapshot.id}/access`)
      .loginAs(owner)
      .json({
        isPublic: true,
        expiresInDays: 7,
      })
    legacyResponse.assertStatus(200)

    const canonicalResponse = await client
      .patch(`/api/v1/me/profile-snapshots/${snapshot.id}/access`)
      .loginAs(owner)
      .json({
        isPublic: false,
        expiresInDays: 3,
      })
    canonicalResponse.assertStatus(200)

    const legacyBody = legacyResponse.body() as {
      data: {
        snapshotId: string
      }
    }
    const canonicalBody = canonicalResponse.body() as typeof legacyBody

    assert.equal(legacyBody.data.snapshotId, snapshot.id)
    assert.equal(canonicalBody.data.snapshotId, snapshot.id)
  })

  test('rotate snapshot link API returns wrapped camelCase data', async ({ assert, client }) => {
    const { owner } = await buildProfileOwnerScenario()
    const snapshot = await UserProfileSnapshot.create({
      user_id: owner.id,
      version: 1,
      snapshot_name: 'Public snapshot',
      is_current: true,
      is_public: true,
      shareable_slug: 'old-slug',
      shareable_token: 'old-token',
      summary: {},
      skills_verified: [],
      work_highlights: [],
      performance_metrics: {},
      trust_metrics: {},
      scoring_version: 'v1',
    })
    const response = await client
      .post(`/api/me/profile-snapshots/${snapshot.id}/rotate-link`)
      .loginAs(owner)

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        snapshotId: string
        shareableSlug: string
        shareableToken: string
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.snapshotId, snapshot.id)
    assert.notEqual(body.data.shareableSlug, 'old-slug')
    assert.notEqual(body.data.shareableToken, 'old-token')
  })

  test('canonical v1 rotate snapshot link API preserves legacy wrapped camelCase data contract', async ({
    assert,
    client,
  }) => {
    const { owner } = await buildProfileOwnerScenario()
    const snapshot = await UserProfileSnapshot.create({
      user_id: owner.id,
      version: 1,
      snapshot_name: 'Public snapshot v1 parity',
      is_current: true,
      is_public: true,
      shareable_slug: 'old-slug-v1',
      shareable_token: 'old-token-v1',
      summary: {},
      skills_verified: [],
      work_highlights: [],
      performance_metrics: {},
      trust_metrics: {},
      scoring_version: 'v1',
    })

    const legacyResponse = await client
      .post(`/api/me/profile-snapshots/${snapshot.id}/rotate-link`)
      .loginAs(owner)
    legacyResponse.assertStatus(200)

    const canonicalResponse = await client
      .post(`/api/v1/me/profile-snapshots/${snapshot.id}/rotate-link`)
      .loginAs(owner)
    canonicalResponse.assertStatus(200)

    const legacyBody = legacyResponse.body() as {
      data: {
        snapshotId: string
        shareableSlug: string
        shareableToken: string
      }
    }
    const canonicalBody = canonicalResponse.body() as typeof legacyBody

    assert.equal(legacyBody.data.snapshotId, snapshot.id)
    assert.equal(canonicalBody.data.snapshotId, snapshot.id)
    assert.notEqual(legacyBody.data.shareableSlug, 'old-slug-v1')
    assert.notEqual(canonicalBody.data.shareableSlug, 'old-slug-v1')
    assert.notEqual(legacyBody.data.shareableToken, 'old-token-v1')
    assert.notEqual(canonicalBody.data.shareableToken, 'old-token-v1')
  })
})
