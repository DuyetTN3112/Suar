import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { hashSavedFilterSemanticState } from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'
import User from '#modules/users/infra/models/profile/user'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

const hashTestingSemanticState = (state: unknown): string =>
  (hashSavedFilterSemanticState as unknown as (value: unknown, generator: NodeFilterHashGenerator) => string)(
    state,
    new NodeFilterHashGenerator()
  )

type TransitionedViewRow = {
  migration_state?: string
  alert_status?: string
  alert_reason?: string | null
}

type TransitionedAlertRow = {
  status?: string
  pause_reason?: string | null
  saved_view_lock_version?: number | string
}

test.group('Integration | Testing Routes Safety', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('health reports the connected database name', async ({ assert, client }) => {
    const response = await client.get('/api/testing/health')

    response.assertStatus(200)

    const body = response.body() as { data: { status: string; database: string | null } }
    assert.equal(body.data.status, 'ok')
    assert.isString(body.data.database)
  })

  test('rejects malformed bodies before executing test-only handlers', async ({ client }) => {
    const routes = [
      '/api/testing/seed-e2e',
      '/api/testing/seed-taxonomy-repair-roleplay',
      '/api/testing/seed-task-submission-flow',
      '/api/testing/seed-cache-task-flow',
      '/api/testing/seed-project-member-flow',
      '/api/testing/seed-task-review-board-flow',
      '/api/testing/seed-task-review-observation-flow',
      '/api/testing/seed-task-create-flow',
      '/api/testing/seed-organization-invitation-flow',
      '/api/testing/seed-organization-join-request-flow',
      '/api/testing/seed-marketplace-application-flow',
      '/api/testing/seed-search-alias-integrity-fault-roleplay',
      '/api/testing/seed-search-cursor-clock-roleplay',
      '/api/testing/seed-project-sprint-planning-flow',
      '/api/testing/seed-sprint-review-governance-flow',
      '/api/testing/seed-sprint-reverse-review-board-flow',
      '/api/testing/seed-review-lifecycle-flow',
      '/api/testing/seed-review-dispute-exchange-flow',
      '/api/testing/seed-audit-log',
      '/api/testing/seed-cleanup',
      '/api/testing/cache-task-list-generation',
      '/api/testing/cache-invalidation-status',
      '/api/testing/cache-invalidation-scope-status',
      '/api/testing/cache-invalidation-scope-cleanup',
    ]

    for (const route of routes) {
      const response = await client.post(route).json({ timestamp: false, nonce: [] })
      response.assertStatus(422)
    }
  })

  test('seed cleanup removes E2E-created rows by timestamp token', async ({ assert, client }) => {
    const timestamp = Date.now()
    const nonce = 'cleanup'

    const seedResponse = await client.post('/api/testing/seed-project-member-flow').form({
      timestamp,
      nonce,
    })
    seedResponse.assertStatus(201)

    const seedBody = seedResponse.body() as {
      data: { ownerEmail: string; memberEmail: string; candidateEmail: string }
    }
    const seededEmails = [
      seedBody.data.ownerEmail,
      seedBody.data.memberEmail,
      seedBody.data.candidateEmail,
    ]

    const beforeCleanup = await User.query().whereIn('email', seededEmails)
    assert.isAbove(beforeCleanup.length, 0)

    const cleanupResponse = await client.post('/api/testing/seed-cleanup').form({ timestamp })
    cleanupResponse.assertStatus(200)

    const body = cleanupResponse.body() as {
      data: { deleted: Record<string, number>; tokens: string[] }
    }
    assert.include(body.data.tokens, String(timestamp))
    assert.isAtLeast(body.data.deleted['users'] ?? 0, beforeCleanup.length)

    const afterCleanup = await User.query().whereIn('email', seededEmails)
    assert.lengthOf(afterCleanup, 0)
  })

  test('seed cleanup releases an owned Search cursor clock fixture', async ({ client }) => {
    const timestamp = Date.now()

    const advanced = await client.post('/api/testing/seed-search-cursor-clock-roleplay').form({
      timestamp,
      nonce: 'clock-owner-a',
      operation: 'advance',
    })
    advanced.assertStatus(200)

    const cleanup = await client.post('/api/testing/seed-cleanup').form({ timestamp })
    cleanup.assertStatus(200)

    const reacquired = await client.post('/api/testing/seed-search-cursor-clock-roleplay').form({
      timestamp,
      nonce: 'clock-owner-b',
      operation: 'advance',
    })
    reacquired.assertStatus(200)

    const restored = await client.post('/api/testing/seed-search-cursor-clock-roleplay').form({
      timestamp,
      nonce: 'clock-owner-b',
      operation: 'restore',
    })
    restored.assertStatus(200)
  })

  test('seed cleanup releases only the owned Search alias fault fixture', async ({ assert, client }) => {
    const timestamp = Date.now()

    try {
      const enabled = await client.post('/api/testing/seed-search-alias-integrity-fault-roleplay').form({
        timestamp,
        nonce: 'alias-owner-a',
        operation: 'enable',
      })
      enabled.assertStatus(200)
      const enabledBody = enabled.body() as {
        data: { operation: string; backingIndexCount: number }
      }
      assert.equal(enabledBody.data.operation, 'enabled')
      assert.equal(enabledBody.data.backingIndexCount, 2)

      const wrongCleanup = await client.post('/api/testing/seed-cleanup').form({
        timestamp: timestamp + 1,
      })
      wrongCleanup.assertStatus(200)

      const blocked = await client.post('/api/testing/seed-search-alias-integrity-fault-roleplay').form({
        timestamp,
        nonce: 'alias-owner-b',
        operation: 'enable',
      })
      blocked.assertStatus(409)

      const cleanup = await client.post('/api/testing/seed-cleanup').form({ timestamp })
      cleanup.assertStatus(200)

      const reacquired = await client.post('/api/testing/seed-search-alias-integrity-fault-roleplay').form({
        timestamp,
        nonce: 'alias-owner-b',
        operation: 'enable',
      })
      reacquired.assertStatus(200)
      const reacquiredBody = reacquired.body() as {
        data: { operation: string; backingIndexCount: number }
      }
      assert.equal(reacquiredBody.data.operation, 'enabled')
      assert.equal(reacquiredBody.data.backingIndexCount, 2)

      const restored = await client.post('/api/testing/seed-search-alias-integrity-fault-roleplay').form({
        timestamp,
        nonce: 'alias-owner-b',
        operation: 'restore',
      })
      restored.assertStatus(200)
      const restoredBody = restored.body() as {
        data: { operation: string; backingIndexCount: number }
      }
      assert.equal(restoredBody.data.operation, 'restored')
      assert.equal(restoredBody.data.backingIndexCount, 1)
    } finally {
      const cleanup = await client.post('/api/testing/seed-cleanup').form({ timestamp })
      cleanup.assertStatus(200)
    }
  })

  test('seed cleanup removes saved views before deleting their seeded owners', async ({
    assert,
    client,
  }) => {
    const timestamp = Date.now()
    const nonce = 'saved-view-cleanup'

    const seedResponse = await client.post('/api/testing/seed-project-member-flow').form({
      timestamp,
      nonce,
    })
    seedResponse.assertStatus(201)

    const seedBody = seedResponse.body() as { data: { ownerEmail: string } }
    const owner = await User.findByOrFail('email', seedBody.data.ownerEmail)
    const viewId = testId()
    await db.table('filter_saved_views').insert({
      id: viewId,
      name: `Cleanup ${timestamp}`,
      normalized_name: `cleanup ${timestamp}`,
      owner_user_id: owner.id,
      visibility: 'private',
      context_key: 'search.blended.global',
      context_owner: 'user',
      context_schema_version: 1,
      criteria_payload: { filter: null, textQuery: null, sort: [], projection: [] },
      criteria_checksum: 'a'.repeat(64),
      presentation_payload: {},
      last_successful_migration_version: 1,
      canonical_payload_bytes: 64,
    })
    await db.table('filter_saved_view_grants').insert({
      id: testId(),
      saved_view_id: viewId,
      grantee_type: 'user',
      grantee_id: owner.id,
      can_read: true,
      can_edit: false,
      can_share: false,
      can_subscribe: false,
      created_by: owner.id,
    })
    await db.table('filter_alerts').insert({
      id: testId(),
      saved_view_id: viewId,
      owner_user_id: owner.id,
      saved_view_lock_version: 1,
      interval_minutes: 30,
      timezone: 'UTC',
      next_run_at: new Date(),
    })

    const cleanupResponse = await client.post('/api/testing/seed-cleanup').form({ timestamp })
    cleanupResponse.assertStatus(200)

    assert.isNull(await db.from('filter_saved_views').where('id', viewId).first())
    assert.isNull(await db.from('filter_saved_view_grants').where('saved_view_id', viewId).first())
    assert.isNull(await db.from('filter_alerts').where('saved_view_id', viewId).first())
  })

  test('taxonomy repair roleplay transition is token-bound and pauses the linked alert', async ({
    assert,
    client,
  }) => {
    const timestamp = Date.now()
    const nonce = 'taxonomy-repair-roleplay'
    const seedResponse = await client.post('/api/testing/seed-task-submission-flow').form({
      timestamp,
      nonce,
    })
    seedResponse.assertStatus(200)

    const seedBody = seedResponse.body() as { data: { assigneeEmail: string; assigneeId: string } }
    const viewId = testId()
    const oldTermId = `rp-fst-07-legacy-${viewId}`
    const semanticState = {
      filter: {
        kind: 'condition',
        field: 'taxonomy.requiredSkills',
        operator: 'contains_any',
        effect: 'require',
        unknown: 'exclude',
        value: { kind: 'set', values: [oldTermId] },
      },
      textQuery: null,
      sort: [],
      projection: [],
    }
    await db.table('filter_saved_views').insert({
      id: viewId,
      name: `Taxonomy repair ${timestamp}`,
      normalized_name: `taxonomy repair ${timestamp}`,
      owner_user_id: seedBody.data.assigneeId,
      visibility: 'private',
      context_key: 'tasks.discovery.member',
      context_owner: 'tasks',
      context_schema_version: 1,
      criteria_payload: semanticState,
      criteria_checksum: hashTestingSemanticState(semanticState),
      presentation_payload: {},
      alert_status: 'active',
      last_successful_migration_version: 1,
      canonical_payload_bytes: 512,
    })
    await db.table('filter_alerts').insert({
      id: testId(),
      saved_view_id: viewId,
      owner_user_id: seedBody.data.assigneeId,
      saved_view_lock_version: 1,
      status: 'active',
      interval_minutes: 30,
      timezone: 'UTC',
      next_run_at: new Date(Date.now() + 30 * 60_000),
    })

    const transitionResponse = await client.post('/api/testing/seed-taxonomy-repair-roleplay').form({
      timestamp,
      nonce,
      viewId,
    })
    transitionResponse.assertStatus(200)
    const transitionBody = transitionResponse.body() as {
      data: { viewId: string; oldTermId: string; replacementTermId: string }
    }
    assert.deepEqual(transitionBody.data, {
      viewId,
      oldTermId,
      replacementTermId: `rp-fst-07-replacement-${viewId}`,
    })

    const transitionedView = (await db.from('filter_saved_views').where('id', viewId).first()) as unknown as TransitionedViewRow | undefined
    const transitionedAlert = (await db.from('filter_alerts').where('saved_view_id', viewId).first()) as unknown as TransitionedAlertRow | undefined
    assert.equal(transitionedView?.migration_state, 'requires_repair')
    assert.equal(transitionedView?.alert_status, 'paused')
    assert.equal(transitionedView?.alert_reason, 'taxonomy_requires_repair')
    assert.equal(transitionedAlert?.status, 'paused')
    assert.equal(transitionedAlert?.pause_reason, 'taxonomy_requires_repair')
    assert.equal(Number(transitionedAlert?.saved_view_lock_version), 2)

    await client.post('/api/testing/seed-cleanup').form({ timestamp })
    assert.isNull(await db.from('filter_saved_views').where('id', viewId).first())
    assert.isNull(await db.from('filter_alerts').where('saved_view_id', viewId).first())
    assert.isString(seedBody.data.assigneeEmail)
  })

  test('seeds the marketplace search flow without an application', async ({ client }) => {
    const response = await client.post('/api/testing/seed-marketplace-application-flow').json({
      timestamp: Date.now(),
      nonce: `search-${Date.now()}`,
      withApplication: false,
    })

    response.assertStatus(200)
  })
})
