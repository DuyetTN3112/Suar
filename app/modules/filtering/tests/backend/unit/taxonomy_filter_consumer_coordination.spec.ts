import { test } from '@japa/runner'

import { CoordinateTaxonomyFilterConsumersCommand } from '#modules/filtering/actions/commands/filtering-observability/coordinate_taxonomy_filter_consumers_command'
import type { FilterAlertPausePort } from '#modules/filtering/actions/ports/outbound/filter_alert_pause_port'
import type { FilterSavedViewRepository } from '#modules/filtering/actions/ports/outbound/filter_saved_view_repository'
import type {
  FilterTaxonomyMigrationRun,
  FilterTaxonomyMigrationRunPort,
} from '#modules/filtering/actions/ports/outbound/filter_taxonomy_migration_run_port'
import type { FilterTransactionRunner } from '#modules/filtering/actions/ports/outbound/filter_transaction_runner'
import type {
  FilterSavedViewMigrationRunRecord,
  FilterSavedViewMigrationRunRepository,
} from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_migration_run_repository'
import type { FilterSavedViewTaxonomyReferenceRepository } from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_taxonomy_references'
import { createSavedFilterView } from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'
import { previewTaxonomyChange } from '#modules/taxonomy/domain/taxonomy-governance/taxonomy_migration_plan'
import { NodeTaxonomyMigrationPlanTokenGenerator } from '#modules/taxonomy/infra/adapters/taxonomy-governance/node_taxonomy_migration_plan_token_generator'

const semanticState = {
  filter: {
    kind: 'condition' as const,
    field: 'skill',
    operator: 'eq',
    effect: 'require' as const,
    unknown: 'exclude' as const,
    value: { kind: 'scalar' as const, value: 'skills:old' },
  },
  textQuery: null,
  sort: [],
  projection: [],
}

const view = createSavedFilterView({
  id: 'view-1',
  name: 'Skills',
  description: null,
  ownerId: 'user-1',
  visibility: 'private',
  organizationId: null,
  teamId: null,
  context: { key: 'tasks.discovery.public', owner: 'tasks', schemaVersion: 1 },
  semanticState,
  presentationState: {},
  isDefault: false,
  isPinned: false,
  alertState: { status: 'active', reason: null },
  createdAt: '2026-08-09T00:00:00.000Z',
  updatedAt: '2026-08-09T00:00:00.000Z',
  lastSuccessfulMigrationVersion: 1,
}, {}, new NodeFilterHashGenerator())

const record = {
  owner: { type: 'user' as const, id: 'user-1' },
  view,
  normalizedName: 'skills',
  lockVersion: 1,
  migrationState: 'current' as const,
  deletedAt: null,
}

const plan = previewTaxonomyChange({
  namespace: 'skills',
  currentVersion: 4,
  expectedVersion: 4,
  changes: [{ kind: 'rename', from: { namespace: 'skills', termId: 'old' }, to: { namespace: 'skills', termId: 'new' } }],
  impact: { assignments: 1, savedViews: 1, alerts: 1, projections: 1, indices: 1 },
}, new NodeTaxonomyMigrationPlanTokenGenerator())

function transactionRunner(): FilterTransactionRunner {
  return { run: async <T>(work: (transaction: object) => Promise<T>) => work({}) }
}

function runPort(overrides: Partial<FilterTaxonomyMigrationRunPort> = {}): FilterTaxonomyMigrationRunPort {
  return {
    findByPlanToken: () => Promise.resolve({ plan, status: 'applying' as const, scanPass: 'initial' as const, completedItemIds: [], nextCursor: null, lockVersion: 1 }),
      checkpoint: (input) => Promise.resolve({ plan, status: input.status, scanPass: input.scanPass, completedItemIds: input.completedItemIds, nextCursor: input.nextCursor, lockVersion: 2 }),
    ...overrides,
  }
}

function migrationRunPort(
  existing: FilterSavedViewMigrationRunRecord | null = null
): FilterSavedViewMigrationRunRepository {
  return {
    findByIdempotency: () => Promise.resolve(existing),
    record: (input) => Promise.resolve({
      id: 'receipt-1',
      savedViewId: input.savedViewId,
      migrationId: input.migrationId,
      fromVersion: input.fromVersion,
      toVersion: input.toVersion,
      inputChecksum: input.inputChecksum,
      outputChecksum: input.outputChecksum,
      outcome: input.outcome,
      atomicPayload: input.atomicPayload,
      diagnosticCode: input.diagnosticCode,
    }),
  }
}

test.group('Unit | Taxonomy filter consumer coordination', () => {
  test('discovers candidates from the persisted plan and records an idempotent receipt', async ({ assert }) => {
    let discoveredNamespace = ''
    let discoveredTermIds: readonly string[] = []
    let readOptions: unknown
    let updated: typeof record | undefined
    let receiptSaved = false
    const views = {
      findById: (_viewId: string, _transaction: object | undefined, options: unknown) => {
        readOptions = options
        return Promise.resolve(record)
      },
      update: (input: { record: typeof record }) => {
        updated = input.record
        return Promise.resolve(input.record)
      },
    } as unknown as FilterSavedViewRepository
    const references: FilterSavedViewTaxonomyReferenceRepository = {
      replaceForSavedView: () => Promise.resolve(),
      listByTaxonomyReferences: (input) => {
        discoveredNamespace = input.namespace
        discoveredTermIds = input.termIds
        return Promise.resolve({ viewIds: ['view-1'], nextCursor: null })
      },
    }
    const migrations = migrationRunPort()
    migrations.record = (input) => {
      receiptSaved = true
      return Promise.resolve({
        id: 'receipt-1', savedViewId: input.savedViewId, migrationId: input.migrationId,
        fromVersion: input.fromVersion, toVersion: input.toVersion, inputChecksum: input.inputChecksum,
        outputChecksum: input.outputChecksum, outcome: input.outcome, atomicPayload: input.atomicPayload,
        diagnosticCode: input.diagnosticCode,
      })
    }

    const result = await new CoordinateTaxonomyFilterConsumersCommand(
      views,
      references,
      migrations,
      transactionRunner(),
      { pauseForSavedView: () => Promise.resolve() },
      runPort(),
      new NodeFilterHashGenerator()
    ).handle({ planToken: plan.planToken, limit: 10, now: '2026-08-09T00:00:00.000Z' })

    assert.equal(discoveredNamespace, 'skills')
    assert.deepEqual(discoveredTermIds, ['old'])
    assert.equal(updated?.view.semanticState.filter?.value?.value, 'skills:new')
    assert.isTrue(receiptSaved)
    assert.deepEqual(result?.completedItemIds, ['view-1'])
    assert.deepEqual(readOptions, { lock: 'for_update' })
  })

  test('loads the child run through the same transaction as candidate processing', async ({ assert }) => {
    let observedTransaction: object | undefined
    const runs = runPort({
      findByPlanToken: (_planToken, transaction) => {
        observedTransaction = transaction
        return Promise.resolve({
          plan,
          status: 'applying' as const,
          scanPass: 'initial' as const,
          completedItemIds: [],
          nextCursor: null,
          lockVersion: 1,
        })
      },
    })
    const references: FilterSavedViewTaxonomyReferenceRepository = {
      replaceForSavedView: () => Promise.resolve(),
      listByTaxonomyReferences: () => Promise.resolve({ viewIds: [], nextCursor: null }),
    }

    await new CoordinateTaxonomyFilterConsumersCommand(
      { findById: () => Promise.resolve(null) } as unknown as FilterSavedViewRepository,
      references,
      migrationRunPort(),
      transactionRunner(),
      { pauseForSavedView: () => Promise.resolve() },
      runs,
      new NodeFilterHashGenerator()
    ).handle({ planToken: plan.planToken, limit: 10, now: '2026-08-09T00:00:00.000Z' })

    assert.isObject(observedTransaction)
  })

  test('does not mutate a split view, pauses its alert, and leaves the parent run repair-required', async ({ assert }) => {
    const repairPlan = previewTaxonomyChange({
      namespace: 'skills', currentVersion: 4, expectedVersion: 4,
      changes: [{ kind: 'split', from: { namespace: 'skills', termId: 'old' }, replacements: [{ namespace: 'skills', termId: 'a' }, { namespace: 'skills', termId: 'b' }] }],
      impact: { assignments: 1, savedViews: 1, alerts: 1, projections: 1, indices: 1 },
    }, new NodeTaxonomyMigrationPlanTokenGenerator())
    let paused = false
    let updated: typeof record | undefined
    let status = ''
    const views = {
      findById: () => Promise.resolve(record),
      update: (input: { record: typeof record }) => { updated = input.record; return Promise.resolve(input.record) },
    } as unknown as FilterSavedViewRepository
    const references: FilterSavedViewTaxonomyReferenceRepository = {
      replaceForSavedView: () => Promise.resolve(),
      listByTaxonomyReferences: () => Promise.resolve({ viewIds: ['view-1'], nextCursor: null }),
    }
    const runs = runPort({
      findByPlanToken: () => Promise.resolve({ plan: repairPlan, status: 'applying' as const, scanPass: 'initial' as const, completedItemIds: [], nextCursor: null, lockVersion: 1 }),
      checkpoint: (input) => { status = input.status; return Promise.resolve({ plan: repairPlan, status: input.status, scanPass: input.scanPass, completedItemIds: input.completedItemIds, nextCursor: input.nextCursor, lockVersion: 2 }) },
    })

    const result = await new CoordinateTaxonomyFilterConsumersCommand(
      views,
      references,
      migrationRunPort(),
      transactionRunner(),
      { pauseForSavedView: () => { paused = true; return Promise.resolve() } } satisfies FilterAlertPausePort,
      runs,
      new NodeFilterHashGenerator()
    ).handle({ planToken: repairPlan.planToken, limit: 10, now: '2026-08-09T00:00:00.000Z' })

    assert.isTrue(paused)
    assert.equal(updated?.migrationState, 'requires_repair')
    assert.deepEqual(updated?.view.semanticState, semanticState)
    assert.equal(status, 'requires_repair')
    assert.deepEqual(result?.completedItemIds, ['view-1'])
  })

  test('resumes a repaired child with a final rescan once the stale reference disappears', async ({ assert }) => {
    let currentRun: FilterTaxonomyMigrationRun = {
      plan,
      status: 'requires_repair',
      scanPass: 'initial',
      completedItemIds: ['view-1'],
      nextCursor: null,
      lockVersion: 2,
    }
    let listedAfterCursor: string | null | undefined
    const references: FilterSavedViewTaxonomyReferenceRepository = {
      replaceForSavedView: () => Promise.resolve(),
      listByTaxonomyReferences: (input) => {
        listedAfterCursor = input.afterViewId
        return Promise.resolve({ viewIds: [], nextCursor: null })
      },
    }
    const runs = runPort({
      findByPlanToken: () => Promise.resolve(currentRun),
      checkpoint: (input) => {
        currentRun = {
          ...currentRun,
          status: input.status,
          scanPass: input.scanPass,
          completedItemIds: input.completedItemIds,
          nextCursor: input.nextCursor,
          lockVersion: currentRun.lockVersion + 1,
        }
        return Promise.resolve(currentRun)
      },
    })

    const result = await new CoordinateTaxonomyFilterConsumersCommand(
      { findById: () => Promise.resolve(null) } as unknown as FilterSavedViewRepository,
      references,
      migrationRunPort(),
      transactionRunner(),
      { pauseForSavedView: () => Promise.resolve() },
      runs,
      new NodeFilterHashGenerator()
    ).handle({ planToken: plan.planToken, limit: 10, now: '2026-08-09T00:02:00.000Z' })

    assert.isNull(listedAfterCursor)
    assert.equal(result?.status, 'completed')
    assert.equal(result?.scanPass, 'final_rescan')
  })

  test('fails closed when the persisted impact reports saved views but the reference projection is empty', async ({ assert }) => {
    let status = ''
    const runs = runPort({
      checkpoint: (input) => {
        status = input.status
        return Promise.resolve({
          plan,
          status: input.status,
          scanPass: input.scanPass,
          completedItemIds: input.completedItemIds,
          nextCursor: input.nextCursor,
          lockVersion: 2,
        })
      },
    })
    const references: FilterSavedViewTaxonomyReferenceRepository = {
      replaceForSavedView: () => Promise.resolve(),
      listByTaxonomyReferences: () => Promise.resolve({ viewIds: [], nextCursor: null }),
    }

    const result = await new CoordinateTaxonomyFilterConsumersCommand(
      {
        findById: () => Promise.resolve(null),
      } as unknown as FilterSavedViewRepository,
      references,
      migrationRunPort(),
      transactionRunner(),
      { pauseForSavedView: () => Promise.resolve() },
      runs,
      new NodeFilterHashGenerator()
    ).handle({ planToken: plan.planToken, limit: 10, now: '2026-08-09T00:00:00.000Z' })

    assert.equal(status, 'requires_repair')
    assert.equal(result?.status, 'requires_repair')
  })

  test('rescans references before completing after a page cursor is exhausted', async ({ assert }) => {
    let listCalls = 0
    let status = ''
    let currentRun: FilterTaxonomyMigrationRun = {
      plan,
      status: 'applying' as const,
      scanPass: 'initial' as const,
      completedItemIds: ['view-1'],
      nextCursor: 'view-2',
      lockVersion: 1,
    }
    const references: FilterSavedViewTaxonomyReferenceRepository = {
      replaceForSavedView: () => Promise.resolve(),
      listByTaxonomyReferences: () => {
        listCalls += 1
        return Promise.resolve(
          listCalls === 1
            ? { viewIds: [], nextCursor: null }
            : { viewIds: ['view-2'], nextCursor: null }
        )
      },
    }
    const runs = runPort({
      findByPlanToken: () => Promise.resolve(currentRun),
      checkpoint: (input) => {
        status = input.status
        currentRun = {
          plan,
          status: input.status,
          scanPass: input.scanPass,
          completedItemIds: input.completedItemIds,
          nextCursor: input.nextCursor,
          lockVersion: 2,
        }
        return Promise.resolve(currentRun)
      },
    })

    const firstResult = await new CoordinateTaxonomyFilterConsumersCommand(
      { findById: () => Promise.resolve(null) } as unknown as FilterSavedViewRepository,
      references,
      migrationRunPort(),
      transactionRunner(),
      { pauseForSavedView: () => Promise.resolve() },
      runs,
      new NodeFilterHashGenerator()
    ).handle({ planToken: plan.planToken, limit: 10, now: '2026-08-09T00:00:00.000Z' })

    assert.equal(listCalls, 1)
    assert.equal(status, 'applying')
    assert.equal(firstResult?.status, 'applying')
    assert.equal(firstResult?.scanPass, 'final_rescan')
    assert.isNull(firstResult?.nextCursor)

    const finalResult = await new CoordinateTaxonomyFilterConsumersCommand(
      { findById: () => Promise.resolve(null) } as unknown as FilterSavedViewRepository,
      references,
      migrationRunPort(),
      transactionRunner(),
      { pauseForSavedView: () => Promise.resolve() },
      runs,
      new NodeFilterHashGenerator()
    ).handle({ planToken: plan.planToken, limit: 10, now: '2026-08-09T00:01:00.000Z' })

    assert.equal(listCalls, 2)
    assert.equal(finalResult?.status, 'completed')
    assert.equal(finalResult?.scanPass, 'final_rescan')
  })
})
