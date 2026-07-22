import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { createSearchProjectionGeneration } from '#modules/search/domain/projection-generation/search_projection_generation'
import { PostgresSearchProjectionGenerationRepository } from '#modules/search/infra/repositories/projection-generation/postgres_search_projection_generation_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

const ID = '55555555-5555-4555-8555-555555555555'
const ACTIVE_ID = '55555555-5555-4555-8555-555555555556'
const NOW = '2026-08-09T00:00:00.000Z'

test.group('Integration | Search projection generation repository', (group) => {
  group.setup(async () => { await setupApp(); await db.from('search_projection_generations').whereIn('id', [ID, ACTIVE_ID]).delete() })
  group.teardown(async () => { await db.from('search_projection_generations').whereIn('id', [ID, ACTIVE_ID]).delete(); await teardownApp() })

  test('persists JSON taxonomy metadata and fences transitions', async ({ assert }) => {
    const repository = new PostgresSearchProjectionGenerationRepository()
    const generation = createSearchProjectionGeneration({ id: ID, target: 'tasks', generation: '20260809t000003', physicalIndexName: 'suar_test_tasks_v1_20260809t000003', sourceEntityRevision: 'rev-10', contextVersion: 'ctx-v1', taxonomyVersions: { skills: 4 }, enrichmentVersion: 'enrich-v1', now: NOW })
    const created = await repository.create(generation)
    assert.deepEqual(created.taxonomyVersions, { skills: 4 })
    assert.equal(created.contextVersion, 'ctx-v1')
    assert.equal(created.enrichmentVersion, 'enrich-v1')
    const transitioned = await repository.transition({ id: ID, expectedLockVersion: 1, status: 'catching_up', sourceEntityRevision: 'rev-11', checkpoint: 'outbox-11', documentCount: null, completenessChecksum: null, updatedAt: NOW })
    assert.equal(transitioned?.lockVersion, 2)
    assert.isNull(await repository.transition({ id: ID, expectedLockVersion: 1, status: 'validating', sourceEntityRevision: 'rev-11', checkpoint: 'outbox-11', documentCount: 1, completenessChecksum: 'sha', updatedAt: NOW }))
  })

  test('lists target generations with lock versions for safe reconciliation', async ({ assert }) => {
    const repository = new PostgresSearchProjectionGenerationRepository()
    const generation = createSearchProjectionGeneration({ id: ACTIVE_ID, target: 'tasks', generation: '20260809t000004', physicalIndexName: 'suar_test_tasks_v1_20260809t000004', sourceEntityRevision: 'rev-10', contextVersion: 'ctx-v1', taxonomyVersions: { skills: 4 }, enrichmentVersion: 'enrich-v1', now: NOW })
    await repository.create(generation)
    const transitioned = await repository.transition({ id: ACTIVE_ID, expectedLockVersion: 1, status: 'catching_up', sourceEntityRevision: 'rev-10', checkpoint: 'outbox-10', documentCount: null, completenessChecksum: null, updatedAt: NOW })
    assert.equal(transitioned?.lockVersion, 2)

    const records = await repository.withTargetLock('tasks', (lockedRepository) => lockedRepository.listByTarget('tasks'))
    const record = records.find((candidate) => candidate.generation.id === ACTIVE_ID)
    assert.equal(record?.lockVersion, 2)
    assert.equal(record?.generation.status, 'catching_up')
  })
})
