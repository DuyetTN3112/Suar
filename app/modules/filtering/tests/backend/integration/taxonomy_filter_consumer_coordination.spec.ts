import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { CoordinateTaxonomyFilterConsumersCommand } from '#modules/filtering/actions/commands/filtering-observability/coordinate_taxonomy_filter_consumers_command'
import { createFilterAlert } from '#modules/filtering/domain/filter-alert/filter_alert'
import { createSavedFilterView } from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
import { PostgresFilterAlertPauseAdapter } from '#modules/filtering/infra/adapters/filter-alert/postgres_filter_alert_pause_adapter'
import { LucidFilterTransactionRunner } from '#modules/filtering/infra/adapters/filtering-runtime/lucid_filter_transaction_runner'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'
import { PostgresFilterTaxonomyMigrationRunRepository } from '#modules/filtering/infra/repositories/filter_taxonomy_migration_run_repository'
import { PostgresFilterAlertRepository } from '#modules/filtering/infra/repositories/saved-filter-views/postgres_filter_alert_repository'
import { PostgresFilterSavedViewMigrationRunRepository } from '#modules/filtering/infra/repositories/saved-filter-views/postgres_filter_saved_view_migration_run_repository'
import { PostgresFilterSavedViewRepository } from '#modules/filtering/infra/repositories/saved-filter-views/postgres_filter_saved_view_repository'
import { PostgresFilterSavedViewTaxonomyReferenceRepository } from '#modules/filtering/infra/repositories/saved-filter-views/postgres_filter_saved_view_taxonomy_reference_repository'
import { TaxonomyReferenceProjectingFilterSavedViewRepository } from '#modules/filtering/infra/repositories/saved-filter-views/taxonomy_reference_projecting_filter_saved_view_repository'
import type { FilterSavedViewMigrationRunRepository } from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_migration_run_repository'
import { previewTaxonomyChange } from '#modules/taxonomy/domain/taxonomy-governance/taxonomy_migration_plan'
import { NodeTaxonomyMigrationPlanTokenGenerator } from '#modules/taxonomy/infra/adapters/taxonomy-governance/node_taxonomy_migration_plan_token_generator'
import { PostgresTaxonomyMigrationRepository } from '#modules/taxonomy/infra/repositories/taxonomy-governance/postgres_taxonomy_migration_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

test.group('Integration | Taxonomy filter consumer coordination', (group) => {

const VIEW_ID = '55555555-5555-4555-8555-555555555555'
const ALERT_ID = '66666666-6666-4666-8666-666666666666'
const RUN_ID = '77777777-7777-4777-8777-777777777777'
const OWNER_ID = '88888888-8888-4888-8888-888888888888'
const CRASH_VIEW_ID = '99999999-9999-4999-8999-999999999998'
const CRASH_RUN_ID = '77777777-7777-4777-8777-777777777778'
const CRASH_OWNER_ID = '88888888-8888-4888-8888-888888888889'
const NOW = '2026-08-09T00:00:00.000Z'

const plan = previewTaxonomyChange({
  namespace: 'skills', currentVersion: 4, expectedVersion: 4,
  changes: [{ kind: 'split', from: { namespace: 'skills', termId: 'old' }, replacements: [{ namespace: 'skills', termId: 'a' }, { namespace: 'skills', termId: 'b' }] }],
  impact: { assignments: 1, savedViews: 1, alerts: 1, projections: 1, indices: 1 },
}, new NodeTaxonomyMigrationPlanTokenGenerator())


  group.setup(async () => {
    await setupApp()
    await db.from('filter_saved_view_migration_runs').where('saved_view_id', VIEW_ID).delete()
    await db.from('filter_alerts').where('id', ALERT_ID).delete()
    await db.from('filter_saved_views').where('id', VIEW_ID).delete()
    await db.from('taxonomy_migration_runs').where('id', RUN_ID).delete()
  })
  group.teardown(async () => {
    await db.from('filter_saved_view_migration_runs').where('saved_view_id', VIEW_ID).delete()
    await db.from('filter_alerts').where('id', ALERT_ID).delete()
    await db.from('filter_saved_views').where('id', VIEW_ID).delete()
    await db.from('taxonomy_migration_runs').where('id', RUN_ID).delete()
    await teardownApp()
  })

  test('preserves repair criteria, pauses the alert, and durably checkpoints the migration', async ({ assert }) => {
    const references = new PostgresFilterSavedViewTaxonomyReferenceRepository()
    const views = new TaxonomyReferenceProjectingFilterSavedViewRepository(
      new PostgresFilterSavedViewRepository(),
      references,
      { getVersion: () => Promise.resolve(4) }
    )
    const alerts = new PostgresFilterAlertRepository()
    const transactions = new LucidFilterTransactionRunner()
    const view = createSavedFilterView({
      id: VIEW_ID, name: 'Taxonomy coordination fixture', description: null, ownerId: OWNER_ID,
      visibility: 'private', organizationId: null, teamId: null,
      context: { key: 'tasks.discovery.public', owner: 'tasks', schemaVersion: 1 },
      semanticState: {
        filter: { kind: 'condition', field: 'skill', operator: 'eq', effect: 'require', unknown: 'exclude', value: { kind: 'scalar', value: 'skills:old' } },
        textQuery: null, sort: [], projection: [],
      },
      presentationState: {}, isDefault: false, isPinned: false,
      alertState: { status: 'active', reason: null }, createdAt: NOW, updatedAt: NOW, lastSuccessfulMigrationVersion: 1,
    }, {}, new NodeFilterHashGenerator())
    await db.transaction(async (transaction) => views.create({ owner: { type: 'user', id: OWNER_ID }, view }, transaction))
    await alerts.create(createFilterAlert({ id: ALERT_ID, savedViewId: VIEW_ID, ownerId: OWNER_ID, savedViewLockVersion: 1, intervalMinutes: 30, timezone: 'UTC', now: NOW }))

    const parentRuns = new PostgresTaxonomyMigrationRepository()
    await parentRuns.create({ id: RUN_ID, plan, now: NOW })
    const runs = new PostgresFilterTaxonomyMigrationRunRepository()
    const result = await Promise.all([
      new CoordinateTaxonomyFilterConsumersCommand(
        views,
        references,
        new PostgresFilterSavedViewMigrationRunRepository(),
        transactions,
        new PostgresFilterAlertPauseAdapter(alerts),
        runs,
        new NodeFilterHashGenerator()
      ).handle({ planToken: plan.planToken, limit: 10, now: NOW }),
      new CoordinateTaxonomyFilterConsumersCommand(
        views,
        references,
        new PostgresFilterSavedViewMigrationRunRepository(),
        transactions,
        new PostgresFilterAlertPauseAdapter(alerts),
        runs,
        new NodeFilterHashGenerator()
      ).handle({ planToken: plan.planToken, limit: 10, now: NOW }),
    ])

    const migrated = await views.findById(VIEW_ID)
    const paused = await alerts.findBySavedViewId(VIEW_ID)
    assert.deepEqual(result.map((checkpoint) => checkpoint.completedItemIds), [[VIEW_ID], [VIEW_ID]])
    assert.equal(migrated?.migrationState, 'requires_repair')
    assert.deepEqual(migrated?.view.semanticState, view.semanticState)
    assert.equal(paused?.alert.status, 'paused')
    assert.equal(paused?.alert.pauseReason, 'taxonomy_requires_repair')
    const childCheckpoint = await runs.findByPlanToken(plan.planToken)
    const parentCheckpoint = await parentRuns.findByPlanToken(plan.planToken)
    assert.equal(childCheckpoint?.status, 'requires_repair')
    assert.equal(childCheckpoint?.lockVersion, 3)
    assert.equal(parentCheckpoint?.status, 'planned')
    assert.equal(parentCheckpoint?.lockVersion, 1)

    const repeated = await new CoordinateTaxonomyFilterConsumersCommand(
        views,
        references,
        new PostgresFilterSavedViewMigrationRunRepository(),
        transactions,
        new PostgresFilterAlertPauseAdapter(alerts),
        runs,
        new NodeFilterHashGenerator()
      ).handle({ planToken: plan.planToken, limit: 10, now: NOW })
    assert.equal(repeated?.status, 'requires_repair')
    const afterStalePlan = await views.findById(VIEW_ID)
    assert.equal(afterStalePlan?.lockVersion, migrated?.lockVersion)
    if (!migrated) throw new Error('Expected the repair fixture to remain persisted')

    const repairedView = createSavedFilterView({
      ...migrated.view,
      semanticState: {
        filter: { kind: 'condition', field: 'skill', operator: 'eq', effect: 'require', unknown: 'exclude', value: { kind: 'scalar', value: 'skills:a' } },
        textQuery: null, sort: [], projection: [],
      },
      updatedAt: '2026-08-09T00:03:00.000Z',
    }, {}, new NodeFilterHashGenerator())
    await views.update({
      record: { ...migrated, view: repairedView, migrationState: 'current' },
      expectedLockVersion: migrated.lockVersion,
    })

    const resumed = await new CoordinateTaxonomyFilterConsumersCommand(
      views,
      references,
      new PostgresFilterSavedViewMigrationRunRepository(),
      transactions,
      new PostgresFilterAlertPauseAdapter(alerts),
      runs,
      new NodeFilterHashGenerator()
    ).handle({ planToken: plan.planToken, limit: 10, now: '2026-08-09T00:03:00.000Z' })
    assert.equal(resumed?.status, 'completed')
    assert.equal(resumed?.scanPass, 'final_rescan')
    const resumedRun = await runs.findByPlanToken(plan.planToken)
    assert.equal(resumedRun?.status, 'completed')

    const beforeRollback = await views.findById(VIEW_ID)
    const renamePlan = previewTaxonomyChange({
      namespace: 'skills', currentVersion: 4, expectedVersion: 4,
      changes: [{ kind: 'rename', from: { namespace: 'skills', termId: 'old' }, to: { namespace: 'skills', termId: 'renamed' } }],
      impact: { assignments: 1, savedViews: 1, alerts: 1, projections: 1, indices: 1 },
    }, new NodeTaxonomyMigrationPlanTokenGenerator())
    const failingRuns = {
      findByPlanToken: () => Promise.resolve({ plan: renamePlan, status: 'applying' as const, scanPass: 'initial' as const, completedItemIds: [], lockVersion: 1 }),
      checkpoint: () => Promise.resolve(null),
    }
    await assert.rejects(
      () => new CoordinateTaxonomyFilterConsumersCommand(
        views,
        references,
        new PostgresFilterSavedViewMigrationRunRepository(),
        transactions,
        new PostgresFilterAlertPauseAdapter(alerts),
        failingRuns,
        new NodeFilterHashGenerator()
      ).handle({ planToken: renamePlan.planToken, limit: 10, now: NOW }),
      /stale_taxonomy_migration_plan/
    )
    const afterRollback = await views.findById(VIEW_ID)
    assert.equal(afterRollback?.migrationState, beforeRollback?.migrationState)
    assert.deepEqual(afterRollback?.view.semanticState, beforeRollback?.view.semanticState)
    assert.equal(afterRollback?.lockVersion, beforeRollback?.lockVersion)
  })

  test('rolls back a worker crash before the receipt and retries after an external edit', async ({ assert }) => {
    const cleanup = async () => {
      await db.from('filter_saved_view_migration_runs').where('saved_view_id', CRASH_VIEW_ID).delete()
      await db.from('filter_saved_view_taxonomy_refs').where('saved_view_id', CRASH_VIEW_ID).delete()
      await db.from('filter_saved_views').where('id', CRASH_VIEW_ID).delete()
      await db.from('taxonomy_migration_runs').where('id', CRASH_RUN_ID).delete()
    }

    await cleanup()
    try {
      const references = new PostgresFilterSavedViewTaxonomyReferenceRepository()
      const views = new TaxonomyReferenceProjectingFilterSavedViewRepository(
        new PostgresFilterSavedViewRepository(),
        references,
        { getVersion: () => Promise.resolve(4) }
      )
      const transactions = new LucidFilterTransactionRunner()
      const crashPlan = previewTaxonomyChange({
        namespace: 'skills', currentVersion: 4, expectedVersion: 4,
        changes: [{ kind: 'rename', from: { namespace: 'skills', termId: 'old' }, to: { namespace: 'skills', termId: 'new' } }],
        impact: { assignments: 1, savedViews: 1, alerts: 1, projections: 1, indices: 1 },
      }, new NodeTaxonomyMigrationPlanTokenGenerator())
      const crashView = createSavedFilterView({
        id: CRASH_VIEW_ID, name: 'Crash recovery fixture', description: null, ownerId: CRASH_OWNER_ID,
        visibility: 'private', organizationId: null, teamId: null,
        context: { key: 'tasks.discovery.public', owner: 'tasks', schemaVersion: 1 },
        semanticState: {
          filter: { kind: 'condition', field: 'skill', operator: 'eq', effect: 'require', unknown: 'exclude', value: { kind: 'scalar', value: 'skills:old' } },
          textQuery: null, sort: [], projection: [],
        },
        presentationState: {}, isDefault: false, isPinned: false,
        alertState: { status: 'disabled', reason: null }, createdAt: NOW, updatedAt: NOW, lastSuccessfulMigrationVersion: 1,
      }, {}, new NodeFilterHashGenerator())
      await db.transaction(async (transaction) => views.create({ owner: { type: 'user', id: CRASH_OWNER_ID }, view: crashView }, transaction))
      await new PostgresTaxonomyMigrationRepository().create({ id: CRASH_RUN_ID, plan: crashPlan, now: NOW })

      const durableMigrations = new PostgresFilterSavedViewMigrationRunRepository()
      let shouldCrash = true
      const crashingMigrations: FilterSavedViewMigrationRunRepository = {
        findByIdempotency(input, transaction) {
          return durableMigrations.findByIdempotency(input, transaction)
        },
        async record(input, transaction) {
          if (shouldCrash) {
            shouldCrash = false
            throw new Error('simulated_worker_crash')
          }
          return durableMigrations.record(input, transaction)
        },
      }
      const run = new PostgresFilterTaxonomyMigrationRunRepository()
      const command = (migrationRuns: FilterSavedViewMigrationRunRepository) => new CoordinateTaxonomyFilterConsumersCommand(
        views,
        references,
        migrationRuns,
        transactions,
        { pauseForSavedView: () => Promise.resolve() },
        run,
        new NodeFilterHashGenerator()
      )

      await assert.rejects(
        () => command(crashingMigrations).handle({ planToken: crashPlan.planToken, limit: 10, now: NOW }),
        /simulated_worker_crash/
      )

      const rolledBack = await views.findById(CRASH_VIEW_ID)
      assert.equal(rolledBack?.lockVersion, 1)
      assert.deepEqual(rolledBack?.view.semanticState, crashView.semanticState)
      assert.isNull(await db.from('filter_taxonomy_migration_runs').where('plan_token', crashPlan.planToken).first())
      assert.isNull(await durableMigrations.findByIdempotency({
        savedViewId: CRASH_VIEW_ID,
        migrationId: crashPlan.planToken,
        inputChecksum: crashView.semanticChecksum,
      }))
      if (!rolledBack) throw new Error('Expected the crash fixture to remain persisted')

      const externalEdit = createSavedFilterView({
        ...rolledBack.view,
        name: 'External edit after crash',
        updatedAt: '2026-08-09T00:01:00.000Z',
      }, {}, new NodeFilterHashGenerator())
      await db.transaction(async (transaction) => {
        await views.update({
          record: { ...rolledBack, view: externalEdit },
          expectedLockVersion: rolledBack.lockVersion,
        }, transaction)
      })

      const retried = await command(durableMigrations).handle({
        planToken: crashPlan.planToken,
        limit: 10,
        now: '2026-08-09T00:02:00.000Z',
      })
      assert.equal(retried?.status, 'applying')
      assert.equal(retried?.scanPass, 'final_rescan')
      const migrated = await views.findById(CRASH_VIEW_ID)
      assert.equal(migrated?.view.name, 'External edit after crash')
      assert.equal(migrated?.view.semanticState.filter?.value?.value, 'skills:new')

      const completed = await command(durableMigrations).handle({
        planToken: crashPlan.planToken,
        limit: 10,
        now: '2026-08-09T00:03:00.000Z',
      })
      assert.equal(completed?.status, 'completed')
      assert.deepEqual(completed?.completedItemIds, [CRASH_VIEW_ID])
      const receipt = await durableMigrations.findByIdempotency({
        savedViewId: CRASH_VIEW_ID,
        migrationId: crashPlan.planToken,
        inputChecksum: crashView.semanticChecksum,
      })
      assert.equal(receipt?.outcome, 'migrated')
    } finally {
      await cleanup()
    }
  })
})
