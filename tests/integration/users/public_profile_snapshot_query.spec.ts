import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import GetPublicProfileSnapshotQuery, {
  GetPublicProfileSnapshotDTO,
} from '#actions/users/queries/get_public_profile_snapshot_query'
import UserProfileSnapshot from '#models/user_profile_snapshot'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'
import { ExecutionContext } from '#types/execution_context'

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
    const query = new GetPublicProfileSnapshotQuery(ExecutionContext.system(user.id))
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
    const query = new GetPublicProfileSnapshotQuery(ExecutionContext.system(user.id))
    const result = await query.handle(new GetPublicProfileSnapshotDTO(slug, 'token-private'))

    assert.equal(result.snapshot.id, snapshot.id)
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

    const query = new GetPublicProfileSnapshotQuery(ExecutionContext.system(user.id))

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

    const query = new GetPublicProfileSnapshotQuery(ExecutionContext.system(user.id))

    await assert.rejects(() =>
      query.handle(new GetPublicProfileSnapshotDTO('wrong-token-snapshot-slug', 'wrong-token'))
    )
  })
})
