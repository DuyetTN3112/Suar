import { test } from '@japa/runner'

import { ApplyTaxonomyChangeCommand } from '#modules/taxonomy/actions/commands/taxonomy-governance/apply_taxonomy_change_command'
import { TaxonomyGovernanceCommand } from '#modules/taxonomy/actions/commands/taxonomy-governance/taxonomy_governance_command'
import type { TaxonomyConsumerCoordinator } from '#modules/taxonomy/actions/ports/outbound/taxonomy-governance/taxonomy_consumer_coordinator'
import type { TaxonomyConsumerImpactReader } from '#modules/taxonomy/actions/ports/outbound/taxonomy-governance/taxonomy_consumer_impact_reader'
import type { TaxonomyMigrationRepository, TaxonomyMigrationRun } from '#modules/taxonomy/actions/ports/outbound/taxonomy-governance/taxonomy_migration_repository'
import type { TaxonomyVersionReader } from '#modules/taxonomy/actions/ports/outbound/taxonomy-governance/taxonomy_version_reader'
import { PreviewTaxonomyChangeQuery } from '#modules/taxonomy/actions/queries/taxonomy-governance/preview_taxonomy_change_query'
import { NodeTaxonomyMigrationIdGenerator } from '#modules/taxonomy/infra/adapters/taxonomy-governance/node_taxonomy_migration_id_generator'
import { NodeTaxonomyMigrationPlanTokenGenerator } from '#modules/taxonomy/infra/adapters/taxonomy-governance/node_taxonomy_migration_plan_token_generator'
import type { TaxonomyChange } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_change_criteria_mapping'

const changes: TaxonomyChange[] = [{
  kind: 'merge',
  from: { namespace: 'skills', termId: 'old' },
  to: { namespace: 'skills', termId: 'new' },
}]

function repository(): TaxonomyMigrationRepository {
  const runs = new Map<string, TaxonomyMigrationRun>()
  return {
    create(input) {
      const run = { id: input.id, plan: input.plan, status: 'planned' as const, completedItemIds: [], nextCursor: null, expectedVersion: input.plan.fromVersion, lockVersion: 1, createdAt: input.now, updatedAt: input.now, publishedAt: null }
      runs.set(input.plan.planToken, run)
      return Promise.resolve(run)
    },
    findByPlanToken(token) { return Promise.resolve(runs.get(token) ?? null) },
    checkpoint() { return Promise.resolve(null) },
  }
}

function governance(
  versionReader: TaxonomyVersionReader,
  impactReader: TaxonomyConsumerImpactReader,
  migrationRepository: TaxonomyMigrationRepository = repository(),
  consumerCoordinator?: TaxonomyConsumerCoordinator
): TaxonomyGovernanceCommand {
  return new TaxonomyGovernanceCommand(
    versionReader,
    impactReader,
    migrationRepository,
    new PreviewTaxonomyChangeQuery(new NodeTaxonomyMigrationPlanTokenGenerator()),
    new ApplyTaxonomyChangeCommand(migrationRepository),
    new NodeTaxonomyMigrationIdGenerator(),
    consumerCoordinator
  )
}

function makeApplyRepository(version: number) {
  const runs = new Map<string, TaxonomyMigrationRun>()
  const migrationRepository: TaxonomyMigrationRepository = {
    create(input) {
      const run: TaxonomyMigrationRun = { id: input.id, plan: input.plan, status: 'planned', completedItemIds: [], nextCursor: null, expectedVersion: input.plan.fromVersion, lockVersion: 1, createdAt: input.now, updatedAt: input.now, publishedAt: null }
      runs.set(input.plan.planToken, run)
      return Promise.resolve(run)
    },
    findByPlanToken(token) { return Promise.resolve(runs.get(token) ?? null) },
    checkpoint(input) {
      const run = runs.get(input.planToken)
      if (!run || run.lockVersion !== input.expectedLockVersion) return Promise.resolve(null)
      const updated: TaxonomyMigrationRun = { ...run, status: input.status, completedItemIds: input.completedItemIds, nextCursor: input.nextCursor, lockVersion: run.lockVersion + 1, updatedAt: input.now }
      runs.set(input.planToken, updated)
      return Promise.resolve(updated)
    },
  }
  return { repository: migrationRepository, version }
}

test.group('Unit | Taxonomy governance service', () => {
  test('builds a governed aggregate-impact plan and starts a durable run', async ({ assert }) => {
    const versionReader: TaxonomyVersionReader = { getVersion: () => Promise.resolve(4) }
    const impactReader: TaxonomyConsumerImpactReader = { estimate: () => Promise.resolve({ assignments: 3, savedViews: 2, alerts: 1, projections: 4, indices: 1 }) }
    const service = governance(versionReader, impactReader)

    const preview = await service.preview({ namespace: 'skills', expectedVersion: 4, changes })
    assert.equal(preview.impactVisibility, 'aggregate')
    assert.equal(preview.plan.impact.savedViews, 2)
    assert.equal(preview.plan.outcome, 'migrated')
    const started = await service.start(preview.plan, '2026-08-09T00:00:00.000Z')
    assert.equal(started.status, 'planned')
    const status = await service.status(preview.plan.planToken)
    assert.equal(status?.id, started.id)
  })

  test('exposes preview and durable-run creation as one application intent', async ({ assert }) => {
    const versionReader: TaxonomyVersionReader = { getVersion: () => Promise.resolve(4) }
    const impactReader: TaxonomyConsumerImpactReader = {
      estimate: () => Promise.resolve({ assignments: 0, savedViews: 0, alerts: 0, projections: 0, indices: 0 }),
    }
    const service = governance(versionReader, impactReader)

    const result = await service.previewAndStartAndWrap({ namespace: 'skills', expectedVersion: 4, changes }, '2026-08-09T00:00:00.000Z')

    assert.isTrue(result.isSuccess())
    assert.equal(result.getValue().run.status, 'planned')
    assert.equal(result.getValue().preview.plan.namespace, 'skills')
  })

  test('uses the provider version as authoritative and rejects stale preview state', async ({ assert }) => {
    const versionReader: TaxonomyVersionReader = { getVersion: () => Promise.resolve(5) }
    const impactReader: TaxonomyConsumerImpactReader = { estimate: () => Promise.resolve({ assignments: 0, savedViews: 0, alerts: 0, projections: 0, indices: 0 }) }
    const service = governance(versionReader, impactReader)

    await assert.rejects(() => service.preview({ namespace: 'skills', expectedVersion: 4, changes }), 'stale_taxonomy_migration_plan')
  })

  test('exposes governance failures through the local Result boundary', async ({ assert }) => {
    const versionReader: TaxonomyVersionReader = { getVersion: () => Promise.resolve(5) }
    const impactReader: TaxonomyConsumerImpactReader = {
      estimate: () => Promise.resolve({ assignments: 0, savedViews: 0, alerts: 0, projections: 0, indices: 0 }),
    }
    const service = governance(versionReader, impactReader)

    const result = await service.previewAndWrap({ namespace: 'skills', expectedVersion: 4, changes })

    assert.isTrue(result.isFailure())
    assert.equal(result.getError().message, 'stale_taxonomy_migration_plan')
  })

  test('re-reads provider version before applying a previously previewed plan', async ({ assert }) => {
    const state = makeApplyRepository(4)
    const versionReader: TaxonomyVersionReader = { getVersion: () => Promise.resolve(state.version) }
    const impactReader: TaxonomyConsumerImpactReader = { estimate: () => Promise.resolve({ assignments: 0, savedViews: 0, alerts: 0, projections: 0, indices: 0 }) }
    const service = governance(versionReader, impactReader, state.repository)
    const preview = await service.preview({ namespace: 'skills', expectedVersion: 4, changes })
    await service.start(preview.plan, '2026-08-09T00:00:00.000Z')
    state.version = 5

    await assert.rejects(
      () => service.apply({ planToken: preview.plan.planToken, expectedLockVersion: 1, publishedVersion: 4, items: [{ id: 'view-1', source: 'skills:old', target: 'skills:new' }], limit: 1, now: '2026-08-09T00:01:00.000Z' }),
      /stale_taxonomy_migration_plan/u
    )
  })

  test('does not apply the parent taxonomy mutation while a consumer batch is still applying', async ({ assert }) => {
    const state = makeApplyRepository(4)
    let coordinated = false
    const consumerCoordinator: TaxonomyConsumerCoordinator = {
      coordinate: () => {
        coordinated = true
        return Promise.resolve({ status: 'applying', nextCursor: 'view-2', lockVersion: 2 })
      },
    }
    const versionReader: TaxonomyVersionReader = { getVersion: () => Promise.resolve(state.version) }
    const impactReader: TaxonomyConsumerImpactReader = {
      estimate: () => Promise.resolve({ assignments: 0, savedViews: 1, alerts: 1, projections: 0, indices: 0 }),
    }
    const service = governance(versionReader, impactReader, state.repository, consumerCoordinator)
    const preview = await service.preview({ namespace: 'skills', expectedVersion: 4, changes })
    await service.start(preview.plan, '2026-08-09T00:00:00.000Z')

    await assert.rejects(
      () => service.apply({
        planToken: preview.plan.planToken,
        expectedLockVersion: 1,
        publishedVersion: 4,
        items: [],
        limit: 1,
        now: '2026-08-09T00:01:00.000Z',
      }),
      /taxonomy_consumer_coordination_pending/u
    )
    assert.isTrue(coordinated)
    const run = await state.repository.findByPlanToken(preview.plan.planToken)
    assert.equal(run?.status, 'planned')
    assert.equal(run?.lockVersion, 1)
  })

  test('applies the parent only after the consumer coordinator reports completion', async ({ assert }) => {
    const state = makeApplyRepository(4)
    const consumerCoordinator: TaxonomyConsumerCoordinator = {
      coordinate: () => Promise.resolve({ status: 'completed', nextCursor: null, lockVersion: 2 }),
    }
    const service = governance(
      { getVersion: () => Promise.resolve(state.version) },
      { estimate: () => Promise.resolve({ assignments: 0, savedViews: 1, alerts: 0, projections: 0, indices: 0 }) },
      state.repository,
      consumerCoordinator
    )
    const preview = await service.preview({ namespace: 'skills', expectedVersion: 4, changes })
    await service.start(preview.plan, '2026-08-09T00:00:00.000Z')

    const result = await service.apply({
      planToken: preview.plan.planToken,
      expectedLockVersion: 1,
      publishedVersion: 4,
      items: [{ id: 'client-invented-view', source: 'skills:old', target: 'skills:new' }],
      limit: 1,
      now: '2026-08-09T00:01:00.000Z',
    })
    assert.equal(result.run.status, 'completed')
    assert.deepEqual(result.run.completedItemIds, [])
    assert.equal(result.run.publishedAt, null)
  })

  test('fences publication when a persisted plan contains an unsupported impact kind', async ({ assert }) => {
    const state = makeApplyRepository(4)
    let coordinated = false
    const consumerCoordinator: TaxonomyConsumerCoordinator = {
      coordinate: () => {
        coordinated = true
        return Promise.resolve({ status: 'completed' as const, nextCursor: null, lockVersion: 2 })
      },
    }
    const service = governance(
      { getVersion: () => Promise.resolve(state.version) },
      { estimate: () => Promise.resolve({ assignments: 0, savedViews: 0, alerts: 0, projections: 0, indices: 0 }) },
      state.repository,
      consumerCoordinator
    )
    const preview = await service.preview({ namespace: 'skills', expectedVersion: 4, changes })
    await service.start({
      ...preview.plan,
      impact: { ...preview.plan.impact, searchExports: 1 },
    }, '2026-08-09T00:00:00.000Z')

    await assert.rejects(
      () => service.apply({
        planToken: preview.plan.planToken,
        expectedLockVersion: 1,
        publishedVersion: 4,
        items: [],
        limit: 1,
        now: '2026-08-09T00:01:00.000Z',
      }),
      /taxonomy_consumer_coordination_required/u
    )
    assert.isFalse(coordinated)
    const run = await state.repository.findByPlanToken(preview.plan.planToken)
    assert.equal(run?.status, 'planned')
    assert.equal(run?.lockVersion, 1)
  })

  test('does not let a stale parent lock mutate the child consumer', async ({ assert }) => {
    const state = makeApplyRepository(4)
    let coordinated = false
    const service = governance(
      { getVersion: () => Promise.resolve(state.version) },
      { estimate: () => Promise.resolve({ assignments: 0, savedViews: 1, alerts: 0, projections: 0, indices: 0 }) },
      state.repository,
      {
        coordinate: () => {
          coordinated = true
          return Promise.resolve({ status: 'completed', nextCursor: null, lockVersion: 2 })
        },
      }
    )
    const preview = await service.preview({ namespace: 'skills', expectedVersion: 4, changes })
    await service.start(preview.plan, '2026-08-09T00:00:00.000Z')

    await assert.rejects(
      () => service.apply({
        planToken: preview.plan.planToken,
        expectedLockVersion: 2,
        publishedVersion: 4,
        items: [],
        limit: 1,
        now: '2026-08-09T00:01:00.000Z',
      }),
      /stale_taxonomy_migration_plan/u
    )
    assert.isFalse(coordinated)
  })

})
