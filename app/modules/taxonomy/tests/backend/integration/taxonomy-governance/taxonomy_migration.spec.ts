import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { previewTaxonomyChange } from '#modules/taxonomy/domain/taxonomy-governance/taxonomy_migration_plan'
import { NodeTaxonomyMigrationPlanTokenGenerator } from '#modules/taxonomy/infra/adapters/taxonomy-governance/node_taxonomy_migration_plan_token_generator'
import { PostgresTaxonomyMigrationRepository } from '#modules/taxonomy/infra/repositories/taxonomy-governance/postgres_taxonomy_migration_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

const PLAN = previewTaxonomyChange({ namespace: 'skills', currentVersion: 4, expectedVersion: 4, changes: [{ kind: 'merge', from: { namespace: 'skills', termId: 'old' }, to: { namespace: 'skills', termId: 'new' } }], impact: { assignments: 1, savedViews: 0, alerts: 0, projections: 1, indices: 1 } }, new NodeTaxonomyMigrationPlanTokenGenerator())
const ID = '44444444-4444-4444-8444-444444444444'
const NOW = '2026-08-09T00:00:00.000Z'

test.group('Integration | Taxonomy migration repository', (group) => {
  group.setup(async () => { await setupApp() })
  group.teardown(async () => { await db.from('taxonomy_migration_runs').where('id', ID).delete(); await teardownApp() })

  test('persists a versioned plan and fences checkpoints', async ({ assert }) => {
    const repository = new PostgresTaxonomyMigrationRepository()
    const created = await repository.create({ id: ID, plan: PLAN, now: NOW })
    assert.equal(created.status, 'planned')
    const checkpoint = await repository.checkpoint({ planToken: PLAN.planToken, expectedLockVersion: 1, status: 'applying', completedItemIds: ['view-1'], nextCursor: 'view-2', now: NOW })
    assert.equal(checkpoint?.lockVersion, 2)
    assert.isNull(await repository.checkpoint({ planToken: PLAN.planToken, expectedLockVersion: 1, status: 'completed', completedItemIds: ['view-1'], nextCursor: null, now: NOW }))
    const found = await repository.findByPlanToken(PLAN.planToken)
    assert.deepEqual(found?.completedItemIds, ['view-1'])
  })
})
