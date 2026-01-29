import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { userProfileActionFactory } from '#composition/user_action_factory'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import { GetCurrentProfileSnapshotDTO } from '#modules/users/actions/queries/get_current_profile_snapshot_query'
import { GetProfileSnapshotHistoryDTO } from '#modules/users/actions/queries/get_profile_snapshot_history_query'
import { GetPublicProfileSnapshotDTO } from '#modules/users/actions/queries/get_public_profile_snapshot_query'
import { makeSystemUserActionContext } from '#modules/users/actions/user_action_context'
import UserProfileSnapshot from '#modules/users/infra/models/user_profile_snapshot'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'

async function checkProfileSnapshotTable(): Promise<boolean> {
  const rawResult: unknown = await db
    .from('information_schema.tables')
    .where('table_name', 'user_profile_snapshots')
    .count('* as total')
    .first()

  const result = rawResult as { total?: number | string } | null
  return Number(result?.total ?? 0) > 0
}

test.group('Integration | Public Profile Snapshot Query', (group) => {
  group.setup(async () => {
    await setupApp()
    const hasProfileSnapshotTable = await checkProfileSnapshotTable()
    if (!hasProfileSnapshotTable) {
      throw new Error(
        'Public profile snapshot integration tests require the user_profile_snapshots table'
      )
    }
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('returns snapshot when it is public', async ({ assert }) => {
    const user = await UserFactory.create()

    const slug = `public-snapshot-${user.id}`
    const snapshot = await UserProfileSnapshot.create({
      user_id: user.id,
      version: 1,
      is_current: true,
      is_public: true,
      shareable_slug: slug,
      shareable_token: 'token-public',
      summary: { username: user.username },
      skills_verified: [],
      work_highlights: [],
      performance_metrics: {},
      trust_metrics: {},
      scoring_version: 'v1',
    })
    const query = userProfileActionFactory.makePublicSnapshot(
      makeSystemUserActionContext(user.id)
    )
    const result = await query.handle(new GetPublicProfileSnapshotDTO(slug))

    assert.equal(result.snapshot.id, snapshot.id)
  })

  test('returns private snapshot when token matches', async ({ assert }) => {
    const user = await UserFactory.create()

    const slug = `private-snapshot-${user.id}`
    const snapshot = await UserProfileSnapshot.create({
      user_id: user.id,
      version: 1,
      is_current: true,
      is_public: false,
      shareable_slug: slug,
      shareable_token: 'token-private',
      summary: { username: user.username },
      skills_verified: [],
      work_highlights: [],
      performance_metrics: {},
      trust_metrics: {},
      scoring_version: 'v1',
    })
    const query = userProfileActionFactory.makePublicSnapshot(
      makeSystemUserActionContext(user.id)
    )
    const result = await query.handle(new GetPublicProfileSnapshotDTO(slug, 'token-private'))

    assert.equal(result.snapshot.id, snapshot.id)
    const cachePage = await cacheStore.scanKeys('profile:snapshot:public:*', '0', 100)
    assert.lengthOf(cachePage.keys, 0)
    assert.isNull(result.snapshot.shareable_token)
  })

  test('checks revocation authoritatively after a successful token read', async ({ assert }) => {
    const user = await UserFactory.create()
    const snapshot = await UserProfileSnapshot.create({
      user_id: user.id,
      version: 1,
      is_current: true,
      is_public: false,
      shareable_slug: `revoked-snapshot-${user.id}`,
      shareable_token: 'token-to-revoke',
      summary: { username: user.username },
      skills_verified: [],
      work_highlights: [],
      performance_metrics: {},
      trust_metrics: {},
      scoring_version: 'v1',
    })
    const query = userProfileActionFactory.makePublicSnapshot(
      makeSystemUserActionContext(user.id)
    )
    const dto = new GetPublicProfileSnapshotDTO(snapshot.shareable_slug ?? '', 'token-to-revoke')

    const firstResult = await query.handle(dto)
    assert.equal(firstResult.snapshot.id, snapshot.id)
    await snapshot.merge({ shareable_token: null }).save()

    await assert.rejects(() => query.handle(dto), /not found/i)
    const cachePage = await cacheStore.scanKeys('profile:snapshot:public:*', '0', 100)
    assert.lengthOf(cachePage.keys, 0)
  })

  test('does not amplify Redis keys for attacker-controlled tokens on a public slug', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const slug = `bounded-public-snapshot-${user.id}`
    await UserProfileSnapshot.create({
      user_id: user.id,
      version: 1,
      is_current: true,
      is_public: true,
      shareable_slug: slug,
      shareable_token: 'canonical-token',
      summary: { username: user.username },
      skills_verified: [],
      work_highlights: [],
      performance_metrics: {},
      trust_metrics: {},
      scoring_version: 'v1',
    })
    const query = userProfileActionFactory.makePublicSnapshot(
      makeSystemUserActionContext(user.id)
    )

    for (let index = 0; index < 25; index++) {
      const result = await query.handle(new GetPublicProfileSnapshotDTO(slug, `random-${index}`))
      assert.isNull(result.snapshot.shareable_token)
    }

    const cachePage = await cacheStore.scanKeys('profile:snapshot:public:*', '0', 100)
    assert.lengthOf(cachePage.keys, 0)
  })

  test('keeps raw owner snapshot rows, including share tokens, out of Redis', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const snapshot = await UserProfileSnapshot.create({
      user_id: user.id,
      version: 1,
      is_current: true,
      is_public: false,
      shareable_slug: `owner-snapshot-${user.id}`,
      shareable_token: 'owner-only-token',
      summary: { username: user.username },
      skills_verified: [],
      work_highlights: [],
      performance_metrics: {},
      trust_metrics: {},
      scoring_version: 'v1',
    })

    const current = await userProfileActionFactory
      .makeCurrentSnapshot(makeSystemUserActionContext(user.id))
      .handle(new GetCurrentProfileSnapshotDTO(user.id))
    const history = await userProfileActionFactory
      .makeSnapshotHistory(makeSystemUserActionContext(user.id))
      .handle(new GetProfileSnapshotHistoryDTO(user.id, 20))

    assert.equal(current.snapshot?.id, snapshot.id)
    assert.equal(history.snapshots[0]?.id, snapshot.id)
    const currentCachePage = await cacheStore.scanKeys(
      'profile:snapshot:current:*',
      '0',
      100
    )
    const historyCachePage = await cacheStore.scanKeys(
      'profile:snapshot:history:*',
      '0',
      100
    )
    assert.lengthOf(currentCachePage.keys, 0)
    assert.lengthOf(historyCachePage.keys, 0)
  })

  test('throws when snapshot is private and token is missing', async ({ assert }) => {
    const user = await UserFactory.create()

    await UserProfileSnapshot.create({
      user_id: user.id,
      version: 1,
      is_current: true,
      is_public: false,
      shareable_slug: 'private-no-token-slug',
      shareable_token: 'private-token',
      summary: { username: user.username },
      skills_verified: [],
      work_highlights: [],
      performance_metrics: {},
      trust_metrics: {},
      scoring_version: 'v1',
    })

    const query = userProfileActionFactory.makePublicSnapshot(
      makeSystemUserActionContext(user.id)
    )

    await assert.rejects(() =>
      query.handle(new GetPublicProfileSnapshotDTO('private-no-token-slug'))
    )
  })

  test('throws when token does not match private snapshot', async ({ assert }) => {
    const user = await UserFactory.create()

    await UserProfileSnapshot.create({
      user_id: user.id,
      version: 1,
      is_current: true,
      is_public: false,
      shareable_slug: 'wrong-token-snapshot-slug',
      shareable_token: 'correct-token',
      summary: { username: user.username },
      skills_verified: [],
      work_highlights: [],
      performance_metrics: {},
      trust_metrics: {},
      scoring_version: 'v1',
    })

    const query = userProfileActionFactory.makePublicSnapshot(
      makeSystemUserActionContext(user.id)
    )

    await assert.rejects(() =>
      query.handle(new GetPublicProfileSnapshotDTO('wrong-token-snapshot-slug', 'wrong-token'))
    )
  })
})
