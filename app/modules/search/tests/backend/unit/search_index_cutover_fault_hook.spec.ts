import { test } from '@japa/runner'

import { ApplySearchIndexActivationCommand } from '#modules/search/actions/commands/index-administration/apply_search_index_activation_command'
import { ReconcileSearchProjectionGenerationCommand } from '#modules/search/actions/commands/projection-generation/reconcile_search_projection_generation_command'
import type { SearchIndexCutoverFaultEvent } from '#modules/search/actions/ports/outbound/search_index_cutover_fault_hook'
import type { SearchProjectionGenerationRepository } from '#modules/search/actions/ports/outbound/search_projection_generation_repository'
import { PreviewSearchIndexActivationQuery } from '#modules/search/actions/queries/index-administration/preview_search_index_activation_query'
import type { SearchProjectionGeneration } from '#modules/search/domain/projection-generation/search_projection_generation'
import { NodeSearchIndexPlanTokenGenerator } from '#modules/search/infra/adapters/index-administration/node_search_index_plan_token_generator'

const oldGeneration: SearchProjectionGeneration = {
  id: 'fault-old', target: 'tasks', generation: 'old', physicalIndexName: 'tasks_old', status: 'active',
  sourceEntityRevision: 'rev-1', contextVersion: 'ctx-1', taxonomyVersions: { skills: 1 }, enrichmentVersion: 'enrich-1',
  checkpoint: 'outbox-1', documentCount: 1, completenessChecksum: 'sha-1', createdAt: '2026-08-09T00:00:00.000Z', updatedAt: '2026-08-09T00:00:00.000Z',
}
const readyGeneration: SearchProjectionGeneration = {
  ...oldGeneration, id: 'fault-ready', generation: 'ready', physicalIndexName: 'tasks_ready', status: 'ready',
  sourceEntityRevision: 'rev-2', checkpoint: 'outbox-2', completenessChecksum: 'sha-2',
}

function fixture(initialBacking = ['tasks_old']) {
  let rows = [
    { generation: { ...oldGeneration }, lockVersion: 4 },
    { generation: { ...readyGeneration }, lockVersion: 7 },
  ]
  let backing = initialBacking
  const repository: SearchProjectionGenerationRepository = {
    create: (value) => Promise.resolve(value),
    findById: (id) => Promise.resolve(rows.find(({ generation }) => generation.id === id)?.generation ?? null),
    listByTarget: (target) => Promise.resolve(rows.filter(({ generation }) => generation.target === target)),
    withTargetLock: (_target, callback) => callback(repository),
    transition: (input) => {
      const index = rows.findIndex(({ generation, lockVersion }) => generation.id === input.id && lockVersion === input.expectedLockVersion)
      if (index < 0) return Promise.resolve(null)
      const row = rows[index]
      if (!row) return Promise.resolve(null)
      const next = { ...row, lockVersion: row.lockVersion + 1, generation: { ...row.generation, status: input.status, updatedAt: input.updatedAt } }
      rows = rows.toSpliced(index, 1, next)
      return Promise.resolve(next)
    },
  }
  const routing = {
    aliasName: 'tasks',
    getBackingIndices: () => Promise.resolve(backing),
    activateGeneration: (indexName: string) => { backing = [indexName]; return Promise.resolve() },
    reconcileAliasToGeneration: (indexName: string) => { backing = [indexName]; return Promise.resolve() },
  }
  return { repository, routing, rows: () => rows, backing: () => backing }
}

test.group('Unit | Search index cutover fault hook', () => {
  test('emits deterministic alias and ledger boundary events', async ({ assert }) => {
    const state = fixture()
    const events: SearchIndexCutoverFaultEvent[] = []
    const previewToken = new NodeSearchIndexPlanTokenGenerator()
    const preview = await new PreviewSearchIndexActivationQuery(state.repository, state.routing, previewToken).handle({ id: readyGeneration.id })
    const expectedStateToken = preview.expectedStateToken

    await new ApplySearchIndexActivationCommand(state.repository, state.routing, previewToken, (event) => { events.push(event) }).handle({
      id: readyGeneration.id, expectedLockVersion: 7, expectedCurrentIndexNames: ['tasks_old'], expectedStateToken, now: '2026-08-09T00:02:00.000Z',
    })

    assert.deepEqual(events.map(({ point, generationId, fromStatus, toStatus }) => ({ point, generationId, fromStatus, toStatus })), [
      { point: 'after_alias_swap', generationId: 'fault-ready', fromStatus: undefined, toStatus: undefined },
      { point: 'after_ledger_transition', generationId: 'fault-old', fromStatus: 'active', toStatus: 'requires_repair' },
      { point: 'after_ledger_transition', generationId: 'fault-ready', fromStatus: 'ready', toStatus: 'active' },
    ])
  })

  test('reconciles an activation interrupted after alias swap', async ({ assert }) => {
    const state = fixture()
    const token = new NodeSearchIndexPlanTokenGenerator()
    const preview = await new PreviewSearchIndexActivationQuery(state.repository, state.routing, token).handle({ id: readyGeneration.id })
    await assert.rejects(() => new ApplySearchIndexActivationCommand(state.repository, state.routing, token, (event) => {
      if (event.point === 'after_alias_swap') throw new Error('simulated_process_exit_after_alias_swap')
    }).handle({ id: readyGeneration.id, expectedLockVersion: 7, expectedCurrentIndexNames: preview.activeIndexNames, expectedStateToken: preview.expectedStateToken, now: '2026-08-09T00:02:00.000Z' }), /simulated_process_exit_after_alias_swap/u)

    const result = await new ReconcileSearchProjectionGenerationCommand(state.repository, state.routing).handle({ target: 'tasks' })
    assert.equal(result.generationId, readyGeneration.id)
    assert.deepEqual(state.backing(), ['tasks_ready'])
    assert.deepEqual(state.rows().map(({ generation }) => generation.status), ['requires_repair', 'active'])
  })

  test('reconciles cleanly after a fault injected after the final ledger transition', async ({ assert }) => {
    const state = fixture()
    const token = new NodeSearchIndexPlanTokenGenerator()
    const preview = await new PreviewSearchIndexActivationQuery(state.repository, state.routing, token).handle({ id: readyGeneration.id })
    await assert.rejects(() => new ApplySearchIndexActivationCommand(state.repository, state.routing, token, (event) => {
      if (event.point === 'after_ledger_transition' && event.generationId === readyGeneration.id) throw new Error('simulated_process_exit_after_ledger_transition')
    }).handle({ id: readyGeneration.id, expectedLockVersion: 7, expectedCurrentIndexNames: preview.activeIndexNames, expectedStateToken: preview.expectedStateToken, now: '2026-08-09T00:02:00.000Z' }), /simulated_process_exit_after_ledger_transition/u)

    const result = await new ReconcileSearchProjectionGenerationCommand(state.repository, state.routing).handle({ target: 'tasks' })
    assert.isFalse(result.changed)
    assert.equal(result.generationId, readyGeneration.id)
  })

  test('emits the alias boundary event when reconcile repairs routing', async ({ assert }) => {
    const state = fixture(['tasks_stale'])
    const events: SearchIndexCutoverFaultEvent[] = []
    const result = await new ReconcileSearchProjectionGenerationCommand(state.repository, state.routing, (event) => { events.push(event) }).handle({ target: 'tasks' })
    assert.isTrue(result.changed)
    assert.deepEqual(events.map(({ point, generationId }) => ({ point, generationId })), [{ point: 'after_alias_swap', generationId: 'fault-old' }])
  })
})
