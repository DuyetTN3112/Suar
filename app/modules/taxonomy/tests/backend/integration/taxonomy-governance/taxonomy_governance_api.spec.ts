import { createHash } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, UserFactory } from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Taxonomy governance API', (group) => {
  group.setup(async () => { await setupApp() })
  group.teardown(() => teardownApp())
  group.each.teardown(async () => {
    await db.from('taxonomy_migration_runs').where('namespace', 'skills').delete()
    await db.from('filter_saved_views').where('name', 'taxonomy-governance-test').delete()
    await cleanupTestData()
  })

  test('system admin can preview and inspect an aggregate-only run, while unsafe no-op apply is rejected', async ({ assert, client }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const revision = (await db.from('skill_taxonomy_revision').select('revision').first()) as { revision: number | string }
    const expectedVersion = Number(revision.revision)
    const suffix = Date.now().toString()
    const viewCriteria = { filter: { skills: [`skills:old-term-${suffix}`] } }
    const criteriaPayload = JSON.stringify(viewCriteria)
    const now = new Date().toISOString()
    await db.table('filter_saved_views').insert({
      id: testId(),
      name: 'taxonomy-governance-test',
      normalized_name: 'taxonomy-governance-test',
      description: null,
      owner_user_id: superadmin.id,
      owner_organization_id: null,
      visibility: 'private',
      organization_id: null,
      team_id: null,
      context_key: 'tasks.my_tasks',
      context_owner: 'system',
      context_schema_version: 1,
      criteria_payload: criteriaPayload,
      criteria_checksum: createHash('sha256').update(criteriaPayload).digest('hex'),
      presentation_payload: '{}',
      is_default: false,
      is_pinned: false,
      alert_status: 'disabled',
      alert_reason: null,
      lock_version: 1,
      migration_state: 'current',
      last_successful_migration_version: 1,
      canonical_payload_bytes: Buffer.byteLength(criteriaPayload),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    })

    const preview = await client
      .post('/api/admin/taxonomy/governance/preview')
      .loginAs(superadmin)
      .header('accept', 'application/json')
      .json({
        namespace: 'skills',
        expectedVersion,
        changes: [{
          kind: 'merge',
          from: { namespace: 'skills', termId: `old-term-${suffix}` },
          to: { namespace: 'skills', termId: `new-term-${suffix}` },
        }],
      })

    preview.assertStatus(201)
    const previewBody = preview.body() as {
      data: {
        plan: { planToken: string; fromVersion: number; toVersion: number; impact: Record<string, number> }
        run: { status: string; lockVersion: number }
        impactVisibility: string
      }
    }
    assert.equal(previewBody.data.impactVisibility, 'aggregate')
    assert.equal(previewBody.data.plan.fromVersion, expectedVersion)
    assert.equal(previewBody.data.plan.toVersion, expectedVersion + 1)
    assert.equal(previewBody.data.run.status, 'planned')
    assert.equal(previewBody.data.run.lockVersion, 1)
    assert.equal(previewBody.data.plan.impact['savedViews'], 1)
    assert.deepEqual(Object.keys(previewBody.data.plan.impact).sort(), ['alerts', 'assignments', 'indices', 'projections', 'savedViews'].sort())
    assert.notProperty(previewBody.data, 'consumerRecords')

    const status = await client
      .get(`/api/admin/taxonomy/governance/runs/${previewBody.data.plan.planToken}`)
      .loginAs(superadmin)
      .header('accept', 'application/json')
    status.assertStatus(200)
    assert.equal((status.body() as { data: { planToken: string } }).data.planToken, previewBody.data.plan.planToken)

    const applied = await client
      .post(`/api/admin/taxonomy/governance/runs/${previewBody.data.plan.planToken}/apply`)
      .loginAs(superadmin)
      .header('accept', 'application/json')
      .json({ expectedLockVersion: 1, publishedVersion: expectedVersion, items: [], limit: 10 })
    applied.assertStatus(422)
    const unchanged = await client
      .get(`/api/admin/taxonomy/governance/runs/${previewBody.data.plan.planToken}`)
      .loginAs(superadmin)
      .header('accept', 'application/json')
    assert.equal((unchanged.body() as { data: { status: string; lockVersion: number } }).data.status, 'planned')
    assert.equal((unchanged.body() as { data: { status: string; lockVersion: number } }).data.lockVersion, 1)
  })

  test('non-admin and guest requests cannot observe governance diagnostics', async ({ assert, client }) => {
    const regularUser = await UserFactory.create({ system_role: 'registered_user' })
    const regular = await client
      .post('/api/admin/taxonomy/governance/preview')
      .loginAs(regularUser)
      .header('accept', 'application/json')
      .json({ namespace: 'skills', expectedVersion: 1, changes: [] })
    const guest = await client
      .post('/api/admin/taxonomy/governance/preview')
      .header('accept', 'application/json')
      .json({ namespace: 'skills', expectedVersion: 1, changes: [] })

    assert.include([401, 403], regular.status())
    assert.equal(guest.status(), 401)
    for (const response of [regular, guest]) {
      assert.notInclude(response.text(), 'consumerRecords')
      assert.notInclude(response.text(), 'old-term')
    }
  })

  test('does not accept a client-supplied consumer item for an impacted run', async ({ assert, client }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const revision = (await db.from('skill_taxonomy_revision').select('revision').first()) as { revision: number | string }
    const expectedVersion = Number(revision.revision)
    const suffix = Date.now().toString()
    const criteriaPayload = JSON.stringify({ filter: { skills: [`skills:old-term-${suffix}`] } })
    const now = new Date().toISOString()

    await db.table('filter_saved_views').insert({
      id: testId(),
      name: 'taxonomy-governance-test',
      normalized_name: 'taxonomy-governance-test',
      description: null,
      owner_user_id: superadmin.id,
      owner_organization_id: null,
      visibility: 'private',
      organization_id: null,
      team_id: null,
      context_key: 'tasks.my_tasks',
      context_owner: 'system',
      context_schema_version: 1,
      criteria_payload: criteriaPayload,
      criteria_checksum: createHash('sha256').update(criteriaPayload).digest('hex'),
      presentation_payload: '{}',
      is_default: false,
      is_pinned: false,
      alert_status: 'disabled',
      alert_reason: null,
      lock_version: 1,
      migration_state: 'current',
      last_successful_migration_version: 1,
      canonical_payload_bytes: Buffer.byteLength(criteriaPayload),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    })

    const preview = await client
      .post('/api/admin/taxonomy/governance/preview')
      .loginAs(superadmin)
      .header('accept', 'application/json')
      .json({
        namespace: 'skills',
        expectedVersion,
        changes: [{
          kind: 'merge',
          from: { namespace: 'skills', termId: `old-term-${suffix}` },
          to: { namespace: 'skills', termId: `new-term-${suffix}` },
        }],
      })
    preview.assertStatus(201)
    const planToken = (preview.body() as { data: { plan: { planToken: string } } }).data.plan.planToken

    const response = await client
      .post(`/api/admin/taxonomy/governance/runs/${planToken}/apply`)
      .loginAs(superadmin)
      .header('accept', 'application/json')
      .json({
        expectedLockVersion: 1,
        publishedVersion: expectedVersion,
        items: [{ id: 'client-invented-view', source: 'skills:old', target: 'skills:new' }],
        limit: 1,
      })

    response.assertStatus(422)
    assert.include(response.text(), 'consumer')

    const status = await client
      .get(`/api/admin/taxonomy/governance/runs/${planToken}`)
      .loginAs(superadmin)
      .header('accept', 'application/json')
    assert.equal((status.body() as { data: { status: string; lockVersion: number } }).data.status, 'planned')
    assert.equal((status.body() as { data: { status: string; lockVersion: number } }).data.lockVersion, 1)
  })

  test('rejects a stale expected taxonomy version before creating a durable run', async ({ assert, client }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const revision = (await db.from('skill_taxonomy_revision').select('revision').first()) as { revision: number | string }
    const response = await client
      .post('/api/admin/taxonomy/governance/preview')
      .loginAs(superadmin)
      .header('accept', 'application/json')
      .json({ namespace: 'skills', expectedVersion: Number(revision.revision) + 1, changes: [] })

    response.assertStatus(409)
    assert.equal(Number((await db.from('taxonomy_migration_runs').where('namespace', 'skills').count('* as total').first() as { total: number | string }).total), 0)
  })

  test('serves the operator page only to system admins', async ({ assert, client }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const regularUser = await UserFactory.create({ system_role: 'registered_user' })
    const adminPage = await client
      .get('/admin/taxonomy/governance')
      .loginAs(superadmin)
      .header('X-Inertia', 'true')
      .header('X-Inertia-Version', '1')
    const deniedPage = await client.get('/admin/taxonomy/governance').loginAs(regularUser)

    adminPage.assertStatus(200)
    assert.include(adminPage.text(), 'taxonomy_governance')
    assert.include([401, 403], deniedPage.status())
  })
})
