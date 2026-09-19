import { test } from '@japa/runner'

import UserProfileSnapshot from '#modules/users/infra/models/profile/user_profile_snapshot'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  UserFactory,
} from '#tests/helpers/factories'

async function buildOrgUserScenario() {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const member = await UserFactory.create({ current_organization_id: org.id })
  await OrganizationUserFactory.create({
    organization_id: org.id,
    user_id: member.id,
    org_role: 'org_member',
    status: 'approved',
  })

  return { org, owner, member }
}

test.group('Integration | User snapshot API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('current profile snapshot API returns wrapped camelCase data without success envelope', async ({
    assert,
    client,
  }) => {
    const { owner } = await buildOrgUserScenario()

    await UserProfileSnapshot.create({
      user_id: owner.id,
      version: 2,
      snapshot_name: 'Current profile',
      is_current: true,
      is_public: false,
      shareable_slug: 'owner-current',
      shareable_token: 'secret-current',
      summary: { total_verified_skills: 3 },
      skills_verified: [{ skill_name: 'TypeScript' }],
      work_highlights: [],
      performance_metrics: { total_tasks_completed: 7 },
      trust_metrics: { current_tier_code: 'gold' },
      scoring_version: 'v2',
    })

    const response = await client.get('/api/me/profile-snapshots/current').loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: {
        userId: string
        version: number
        snapshotName: string
        isCurrent: boolean
        isPublic: boolean
        shareableSlug: string
        summary: { totalVerifiedSkills: number }
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.userId, owner.id)
    assert.equal(body.data.version, 2)
    assert.equal(body.data.snapshotName, 'Current profile')
    assert.isTrue(body.data.isCurrent)
    assert.isFalse(body.data.isPublic)
    assert.equal(body.data.shareableSlug, 'owner-current')
    assert.notProperty(body.data, 'shareableToken')
    assert.equal(body.data.summary.totalVerifiedSkills, 3)
  })

  test('current profile snapshot API keeps public sharing token when snapshot is public', async ({
    assert,
    client,
  }) => {
    const { owner } = await buildOrgUserScenario()

    await UserProfileSnapshot.create({
      user_id: owner.id,
      version: 4,
      snapshot_name: 'Public profile',
      is_current: true,
      is_public: true,
      shareable_slug: 'owner-current-public',
      shareable_token: 'secret-current-public',
      summary: { total_verified_skills: 7 },
      skills_verified: [{ skill_name: 'Rust' }],
      work_highlights: [],
      performance_metrics: { total_tasks_completed: 14 },
      trust_metrics: { current_tier_code: 'platinum' },
      scoring_version: 'v4',
    })

    const response = await client.get('/api/me/profile-snapshots/current').loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: {
        shareableToken: string
      }
    }

    assert.equal(body.data.shareableToken, 'secret-current-public')
  })

  test('canonical v1 current profile snapshot API preserves legacy wrapped camelCase contract', async ({
    assert,
    client,
  }) => {
    const { owner } = await buildOrgUserScenario()

    await UserProfileSnapshot.create({
      user_id: owner.id,
      version: 3,
      snapshot_name: 'Current profile v1',
      is_current: true,
      is_public: false,
      shareable_slug: 'owner-current-v1',
      shareable_token: 'secret-current-v1',
      summary: { total_verified_skills: 5 },
      skills_verified: [{ skill_name: 'Go' }],
      work_highlights: [],
      performance_metrics: { total_tasks_completed: 11 },
      trust_metrics: { current_tier_code: 'gold' },
      scoring_version: 'v3',
    })

    const legacyResponse = await client.get('/api/me/profile-snapshots/current').loginAs(owner)
    legacyResponse.assertStatus(200)

    const canonicalResponse = await client
      .get('/api/v1/me/profile-snapshots/current')
      .loginAs(owner)
    canonicalResponse.assertStatus(200)

    assert.deepEqual(canonicalResponse.body(), legacyResponse.body())
  })

  test('profile snapshot history API returns wrapped camelCase list without success envelope', async ({
    assert,
    client,
  }) => {
    const { owner } = await buildOrgUserScenario()

    await UserProfileSnapshot.createMany([
      {
        user_id: owner.id,
        version: 1,
        snapshot_name: 'Snapshot v1',
        is_current: false,
        is_public: false,
        shareable_slug: null,
        shareable_token: null,
        summary: { total_verified_skills: 1 },
        skills_verified: [],
        work_highlights: [],
        performance_metrics: {},
        trust_metrics: {},
        scoring_version: 'v1',
      },
      {
        user_id: owner.id,
        version: 2,
        snapshot_name: 'Snapshot v2',
        is_current: true,
        is_public: true,
        shareable_slug: 'snapshot-v2',
        shareable_token: 'secret-v2',
        summary: { total_verified_skills: 2 },
        skills_verified: [],
        work_highlights: [],
        performance_metrics: {},
        trust_metrics: {},
        scoring_version: 'v2',
      },
    ])

    const response = await client.get('/api/me/profile-snapshots?limit=10').loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        userId: string
        snapshotName: string
        isCurrent: boolean
        isPublic: boolean
        shareableSlug: string | null
      }>
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.length, 2)
    assert.equal(body.data[0]?.userId, owner.id)
    assert.property(body.data[0] ?? {}, 'snapshotName')
    assert.property(body.data[0] ?? {}, 'isCurrent')
    assert.property(body.data[0] ?? {}, 'isPublic')
    assert.property(body.data[0] ?? {}, 'shareableSlug')
  })

  test('canonical v1 profile snapshot history API preserves legacy wrapped camelCase list', async ({
    assert,
    client,
  }) => {
    const { owner } = await buildOrgUserScenario()

    await UserProfileSnapshot.createMany([
      {
        user_id: owner.id,
        version: 1,
        snapshot_name: 'History v1',
        is_current: false,
        is_public: false,
        shareable_slug: null,
        shareable_token: null,
        summary: { total_verified_skills: 1 },
        skills_verified: [],
        work_highlights: [],
        performance_metrics: {},
        trust_metrics: {},
        scoring_version: 'v1',
      },
      {
        user_id: owner.id,
        version: 2,
        snapshot_name: 'History v2',
        is_current: true,
        is_public: true,
        shareable_slug: 'history-v2',
        shareable_token: 'history-secret-v2',
        summary: { total_verified_skills: 2 },
        skills_verified: [],
        work_highlights: [],
        performance_metrics: {},
        trust_metrics: {},
        scoring_version: 'v2',
      },
    ])

    const legacyResponse = await client
      .get('/api/me/profile-snapshots?limit=10')
      .loginAs(owner)
    legacyResponse.assertStatus(200)

    const canonicalResponse = await client
      .get('/api/v1/me/profile-snapshots?limit=10')
      .loginAs(owner)
    canonicalResponse.assertStatus(200)

    assert.deepEqual(canonicalResponse.body(), legacyResponse.body())
  })

  test('public profile snapshot route renders the shareable snapshot as an HTML page', async ({
    assert,
    client,
  }) => {
    const { owner } = await buildOrgUserScenario()

    await UserProfileSnapshot.create({
      user_id: owner.id,
      version: 1,
      snapshot_name: 'Public snapshot',
      is_current: true,
      is_public: true,
      shareable_slug: 'public-owner-snapshot',
      shareable_token: 'public-secret',
      summary: { total_verified_skills: 4 },
      skills_verified: [{ skill_name: 'Node.js' }],
      work_highlights: [],
      performance_metrics: { total_tasks_completed: 9 },
      trust_metrics: { current_tier_code: 'platinum' },
      scoring_version: 'v3',
    })

    const response = await client.get('/profiles/public-owner-snapshot')
    response.assertStatus(200)

    assert.include(response.header('content-type') ?? '', 'text/html')
    assert.include(response.text(), 'profile/public_snapshot')
    assert.include(response.text(), 'Public snapshot')
    assert.include(response.text(), 'public-owner-snapshot')
    assert.notInclude(response.text(), 'public-secret')
    assert.notInclude(response.text(), 'shareableToken')
  })

  test('org talent detail API returns wrapped camelCase data without success envelope', async ({
    assert,
    client,
  }) => {
    const { org, owner, member } = await buildOrgUserScenario()

    await member
      .merge({
        trust_data: {
          calculated_score: 81,
          current_tier_code: 'gold',
          raw_score: 81,
          total_verified_reviews: 1,
          last_calculated_at: null,
        },
        credibility_data: {
          credibility_score: 64,
          total_reviews_given: 1,
          accurate_reviews: 1,
          disputed_reviews: 0,
          last_calculated_at: null,
        },
      })
      .save()

    const response = await client.get(`/api/org/talents/${member.id}`).loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: {
        user: {
          id: string
          currentOrganization: { id: string } | null
          trustScore: number | null
          credibilityScore: number | null
        }
        spiderChartData: Record<string, unknown>
        deliveryMetrics: Record<string, unknown>
        featuredReviews: unknown[]
        isOwnProfile: boolean
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.user.id, member.id)
    assert.equal(body.data.user.currentOrganization?.id, org.id)
    assert.equal(body.data.user.trustScore, 81)
    assert.equal(body.data.user.credibilityScore, 64)
    assert.property(body.data, 'spiderChartData')
    assert.property(body.data, 'deliveryMetrics')
    assert.isArray(body.data.featuredReviews)
    assert.isFalse(body.data.isOwnProfile)
  })

  test('canonical v1 org talent detail API preserves legacy wrapped camelCase contract', async ({
    assert,
    client,
  }) => {
    const { org, owner, member } = await buildOrgUserScenario()

    await member
      .merge({
        trust_data: {
          calculated_score: 79,
          current_tier_code: 'gold',
          raw_score: 79,
          total_verified_reviews: 1,
          last_calculated_at: null,
        },
        credibility_data: {
          credibility_score: 61,
          total_reviews_given: 1,
          accurate_reviews: 1,
          disputed_reviews: 0,
          last_calculated_at: null,
        },
      })
      .save()

    const response = await client
      .get(`/api/v1/me/organizations/current/talents/${member.id}`)
      .loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: {
        user: {
          id: string
          currentOrganization: { id: string } | null
          trustScore: number | null
          credibilityScore: number | null
        }
        featuredReviews: unknown[]
        isOwnProfile: boolean
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.user.id, member.id)
    assert.equal(body.data.user.currentOrganization?.id, org.id)
    assert.equal(body.data.user.trustScore, 79)
    assert.equal(body.data.user.credibilityScore, 61)
    assert.isArray(body.data.featuredReviews)
    assert.isFalse(body.data.isOwnProfile)
  })
})
