import { test } from '@japa/runner'

import { ActivateSearchProjectionGenerationCommand } from '#modules/search/actions/commands/projection-generation/activate_search_projection_generation_command'
import type { SearchProjectionGenerationRepository } from '#modules/search/actions/ports/outbound/search_projection_generation_repository'
import type { SearchProjectionGeneration } from '#modules/search/domain/projection-generation/search_projection_generation'

class Repository implements SearchProjectionGenerationRepository {
  generation: SearchProjectionGeneration = {
    id: 'gen-1', target: 'tasks', generation: '20260809t000000', physicalIndexName: 'tasks_v1_20260809t000000', status: 'ready', sourceEntityRevision: 'rev-1', contextVersion: 'ctx-v1', taxonomyVersions: { skills: 4 }, enrichmentVersion: 'enrich-v1', checkpoint: 'outbox-1', documentCount: 2, completenessChecksum: 'sha-1', createdAt: '2026-08-09T00:00:00.000Z', updatedAt: '2026-08-09T00:00:00.000Z',
  }
  findById() { return Promise.resolve(this.generation) }
  listByTarget(target: string) { return Promise.resolve(this.generation.target === target ? [{ generation: this.generation, lockVersion: 1 }] : []) }
  withTargetLock<T>(_target: string, callback: (repository: SearchProjectionGenerationRepository) => Promise<T>): Promise<T> { return callback(this) }
  create(generation: SearchProjectionGeneration) { this.generation = generation; return Promise.resolve(generation) }
  transition(input: Parameters<SearchProjectionGenerationRepository['transition']>[0]) {
    this.generation = { ...this.generation, status: input.status, updatedAt: input.updatedAt }
    return Promise.resolve({ generation: this.generation, lockVersion: input.expectedLockVersion + 1 })
  }
}

test.group('Unit | Activate search projection generation command', () => {
  test('activates the alias only for a ready ledger generation and records active state', async ({ assert }) => {
    const repository = new Repository()
    const activations: unknown[] = []
    const result = await new ActivateSearchProjectionGenerationCommand(repository, {
      activateGeneration: (index, expected) => { activations.push([index, expected]); return Promise.resolve() },
    }).handle({ id: 'gen-1', expectedLockVersion: 1, expectedCurrentIndexNames: ['tasks_v1'], now: '2026-08-09T00:02:00.000Z' })
    assert.equal(result.status, 'active')
    assert.deepEqual(activations, [['tasks_v1_20260809t000000', ['tasks_v1']]])
  })

  test('refuses to call the alias lifecycle for a non-ready generation', async ({ assert }) => {
    const repository = new Repository()
    repository.generation = { ...repository.generation, status: 'requires_repair' }
    let called = false
    await assert.rejects(() => new ActivateSearchProjectionGenerationCommand(repository, { activateGeneration: () => { called = true; return Promise.resolve() } }).handle({ id: 'gen-1', expectedLockVersion: 1, now: '2026-08-09T00:02:00.000Z' }), /not_ready/u)
    assert.isFalse(called)
  })

})
