import { test } from '@japa/runner'

import { ReconcileSearchProjectionGenerationCommand } from '#modules/search/actions/commands/projection-generation/reconcile_search_projection_generation_command'
import type { SearchProjectionGenerationRepository } from '#modules/search/actions/ports/outbound/search_projection_generation_repository'
import type { SearchProjectionGeneration } from '#modules/search/domain/projection-generation/search_projection_generation'

const generation: SearchProjectionGeneration = {
  id: 'generation-1',
  target: 'tasks',
  generation: '20260809t000010',
  physicalIndexName: 'suar_tasks_v1_20260809t000010',
  status: 'active',
  sourceEntityRevision: 'rev-10',
  contextVersion: 'ctx-v1',
  taxonomyVersions: { skills: 4 },
  enrichmentVersion: 'enrich-v1',
  checkpoint: 'outbox-10',
  documentCount: 10,
  completenessChecksum: 'sha-10',
  createdAt: '2026-08-09T00:00:00.000Z',
  updatedAt: '2026-08-09T00:00:00.000Z',
}

function createRepository(rows: readonly { generation: SearchProjectionGeneration; lockVersion: number }[]) {
  let lockAcquired = false
  let currentRows = rows.map((row) => ({ ...row, generation: { ...row.generation } }))
  const value: SearchProjectionGenerationRepository = {
    create: () => Promise.resolve(generation),
    findById: () => Promise.resolve(generation),
    listByTarget: () => Promise.resolve(currentRows),
    transition: (input) => {
      const index = currentRows.findIndex(
        (row) => row.generation.id === input.id && row.lockVersion === input.expectedLockVersion
      )
      const row = currentRows[index]
      if (index < 0 || !row) return Promise.resolve(null)
      const next = {
        ...row,
        lockVersion: row.lockVersion + 1,
        generation: {
          ...row.generation,
          status: input.status,
          sourceEntityRevision: input.sourceEntityRevision,
          checkpoint: input.checkpoint,
          documentCount: input.documentCount,
          completenessChecksum: input.completenessChecksum,
          updatedAt: input.updatedAt,
        },
      }
      currentRows = currentRows.toSpliced(index, 1, next)
      return Promise.resolve(next)
    },
    withTargetLock: (_target, callback) => {
      lockAcquired = true
      return callback(value)
    },
  }
  return { value, lockWasAcquired: () => lockAcquired, records: () => currentRows }
}

function lifecycle(backingIndices: string[]) {
  const calls: Array<{ physicalIndexName: string; expectedCurrentIndexNames: readonly string[] }> = []
  return {
    value: {
      aliasName: 'suar_tasks',
      getBackingIndices: () => Promise.resolve(backingIndices),
      reconcileAliasToGeneration: (physicalIndexName: string, expectedCurrentIndexNames: readonly string[]) => {
        calls.push({ physicalIndexName, expectedCurrentIndexNames: [...expectedCurrentIndexNames] })
        backingIndices.splice(0, backingIndices.length, physicalIndexName)
        return Promise.resolve()
      },
    },
    calls,
  }
}

test.group('Unit | Reconcile search projection generation command', () => {
  test('routes the alias to the single DB-active generation under a target lock', async ({ assert }) => {
    const repository = createRepository([{ generation, lockVersion: 7 }])
    const routing = lifecycle(['suar_tasks_v1'])

    const result = await new ReconcileSearchProjectionGenerationCommand(repository.value, routing.value).handle({ target: 'tasks' })

    assert.deepEqual(result, {
      target: 'tasks',
      aliasName: 'suar_tasks',
      generationId: 'generation-1',
      physicalIndexName: generation.physicalIndexName,
      changed: true,
      lockVersion: 7,
    })
    assert.isTrue(repository.lockWasAcquired())
    assert.deepEqual(routing.calls, [{ physicalIndexName: generation.physicalIndexName, expectedCurrentIndexNames: ['suar_tasks_v1'] }])
  })

  test('is idempotent when alias routing already matches DB-active generation', async ({ assert }) => {
    const repository = createRepository([{ generation, lockVersion: 8 }])
    const routing = lifecycle([generation.physicalIndexName])

    const result = await new ReconcileSearchProjectionGenerationCommand(repository.value, routing.value).handle({ target: 'tasks' })

    assert.isFalse(result.changed)
    assert.deepEqual(routing.calls, [])
  })

  test('adopts a ready generation when an alias swap completed before DB state persistence', async ({ assert }) => {
    const adopted = {
      ...generation,
      id: 'generation-2',
      generation: '20260809t000011',
      physicalIndexName: 'suar_tasks_v1_20260809t000011',
      status: 'ready' as const,
    }
    const repository = createRepository([
      { generation, lockVersion: 7 },
      { generation: adopted, lockVersion: 3 },
    ])
    const routing = lifecycle([adopted.physicalIndexName])

    const result = await new ReconcileSearchProjectionGenerationCommand(repository.value, routing.value).handle({ target: 'tasks' })

    assert.equal(result.generationId, adopted.id)
    assert.isTrue(result.changed)
    assert.deepEqual(repository.records().map(({ generation: value }) => value.status), ['requires_repair', 'active'])
    assert.deepEqual(routing.calls, [])
  })

  test('fails closed when DB has no unique active generation', async ({ assert }) => {
    for (const rows of [[], [{ generation: { ...generation, id: 'a' }, lockVersion: 1 }, { generation: { ...generation, id: 'b' }, lockVersion: 1 }]]) {
      const repository = createRepository(rows)
      const routing = lifecycle(['suar_tasks_v1'])

      await assert.rejects(
        () => new ReconcileSearchProjectionGenerationCommand(repository.value, routing.value).handle({ target: 'tasks' }),
        /search_projection_reconcile_active_generation_count/u,
      )
      assert.deepEqual(routing.calls, [])
    }
  })
})
