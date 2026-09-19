import { test } from '@japa/runner'

import UserProfileSnapshot from '#modules/users/infra/models/profile/user_profile_snapshot'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, OrganizationFactory } from '#tests/helpers/factories'

async function buildProfileOwnerScenario() {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  return { org, owner }
}

test.group('Integration | User profile snapshot mutation API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

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
