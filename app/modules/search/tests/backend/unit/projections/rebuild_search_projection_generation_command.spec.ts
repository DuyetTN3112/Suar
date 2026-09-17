import { test } from '@japa/runner'

import { RebuildSearchProjectionGenerationCommand } from '#modules/search/actions/commands/projection-generation/rebuild_search_projection_generation_command'
import type { SearchProjectionGenerationRepository } from '#modules/search/actions/ports/outbound/search_projection_generation_repository'
import type { SearchProjectionGeneration } from '#modules/search/domain/projection-generation/search_projection_generation'

class Generations implements SearchProjectionGenerationRepository {
  value?: SearchProjectionGeneration
  lockVersion = 1
  create(generation: SearchProjectionGeneration) { this.value = generation; return Promise.resolve(generation) }
  findById() { return Promise.resolve(this.value ?? null) }
  listByTarget(target: string) {
    if (this.value === undefined || this.value.target !== target) return Promise.resolve([])
    return Promise.resolve([{ generation: this.value, lockVersion: this.lockVersion }])
  }
  withTargetLock<T>(_target: string, callback: (repository: SearchProjectionGenerationRepository) => Promise<T>): Promise<T> { return callback(this) }
  transition(input: Parameters<SearchProjectionGenerationRepository['transition']>[0]) {
    if (input.expectedLockVersion !== this.lockVersion || this.value === undefined) return Promise.resolve(null)
    this.value = { ...this.value, status: input.status, sourceEntityRevision: input.sourceEntityRevision, checkpoint: input.checkpoint, documentCount: input.documentCount, completenessChecksum: input.completenessChecksum, updatedAt: input.updatedAt }
    this.lockVersion += 1
    return Promise.resolve({ generation: this.value, lockVersion: this.lockVersion })
  }
}

class DeadlockingGenerations extends Generations {
  private failNextTransition = true

  constructor(private readonly deadlock: Error) {
    super()
  }

  override transition(input: Parameters<SearchProjectionGenerationRepository['transition']>[0]) {
    if (this.failNextTransition) {
      this.failNextTransition = false
      return Promise.reject(this.deadlock)
    }
    return super.transition(input)
  }
}

function command(repository: Generations, calls: string[]) {
  return new RebuildSearchProjectionGenerationCommand(repository, {
    aliasName: 'tasks',
    buildCandidate: async (populate, generation) => {
      calls.push(`build:${generation}`)
      const documentCount = await populate('tasks_v1_20260809t000000')
      return { physicalIndexName: 'tasks_v1_20260809t000000', previousIndexNames: [], documentCount }
    },
  })
}

const input = {
  id: 'generation-1', target: 'tasks', generation: '20260809t000000', sourceEntityRevision: 'rev-12', contextVersion: 'ctx-v1',
  taxonomyVersions: { skills: 4 }, enrichmentVersion: 'enrich-v1', expectedDocumentCount: 2, expectedCompletenessChecksum: 'sha-1', actualCompletenessChecksum: 'sha-1', checkpoint: 'outbox-12', eventGap: false,
  now: '2026-08-09T00:00:00.000Z', populate: (index: string) => Promise.resolve(index.length > 0 ? 2 : 0),
}

test.group('Unit | Rebuild search projection generation command', () => {
  test('persists a validated ready candidate without activating the alias', async ({ assert }) => {
    const repository = new Generations()
    const calls: string[] = []
    const result = await command(repository, calls).handle(input)
    assert.equal(result.status, 'ready')
    assert.equal(repository.value?.status, 'ready')
    assert.deepEqual(calls, ['build:20260809t000000'])
  })

  test('persists requires_repair evidence for an event gap', async ({ assert }) => {
    const repository = new Generations()
    const result = await command(repository, []).handle({ ...input, id: 'generation-2', eventGap: true })
    assert.equal(result.status, 'requires_repair')
    assert.equal(repository.value?.status, 'requires_repair')
  })

  test('persists requires_repair evidence for count or checksum drift', async ({ assert }) => {
    const countDrift = new Generations()
    const countResult = await command(countDrift, []).handle({
      ...input,
      id: 'generation-count-drift',
      expectedDocumentCount: 3,
    })
    assert.equal(countResult.status, 'requires_repair')
    assert.equal(countDrift.value?.status, 'requires_repair')

    const checksumDrift = new Generations()
    const checksumResult = await command(checksumDrift, []).handle({
      ...input,
      id: 'generation-checksum-drift',
      expectedCompletenessChecksum: 'sha-expected',
    })
    assert.equal(checksumResult.status, 'requires_repair')
    assert.equal(checksumDrift.value?.status, 'requires_repair')
  })

  test('records failed state and rethrows a search-provider worker failure', async ({ assert }) => {
    const repository = new Generations()
    const outage = new Error('search provider unavailable while populating candidate')
    const rebuild = new RebuildSearchProjectionGenerationCommand(repository, {
      aliasName: 'tasks',
      buildCandidate: async () => Promise.reject(outage),
    })

    let captured: unknown
    try {
      await rebuild.handle(input)
    } catch (error) {
      captured = error
    }

    assert.equal(captured, outage)
    assert.equal(repository.value?.status, 'failed')
    assert.isNull(repository.value?.documentCount)
    assert.isNull(repository.value?.completenessChecksum)
  })

  test('records failed state and rethrows a deadlock at the generation boundary', async ({
    assert,
  }) => {
    const deadlock = new Error('deadlock detected while fencing generation')
    const repository = new DeadlockingGenerations(deadlock)

    let captured: unknown
    try {
      await command(repository, []).handle(input)
    } catch (error) {
      captured = error
    }

    assert.equal(captured, deadlock)
    assert.equal(repository.value?.status, 'failed')
  })
})
