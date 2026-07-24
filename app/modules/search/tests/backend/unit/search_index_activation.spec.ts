import { test } from '@japa/runner'

import { ApplySearchIndexActivationCommand } from '#modules/search/actions/commands/index-administration/apply_search_index_activation_command'
import type { SearchProjectionGenerationRepository } from '#modules/search/actions/ports/outbound/search_projection_generation_repository'
import { PreviewSearchIndexActivationQuery } from '#modules/search/actions/queries/index-administration/preview_search_index_activation_query'
import type { SearchProjectionGeneration } from '#modules/search/domain/projection-generation/search_projection_generation'
import { NodeSearchIndexPlanTokenGenerator } from '#modules/search/infra/adapters/index-administration/node_search_index_plan_token_generator'

const generation: SearchProjectionGeneration = {
  id: 'generation-1',
  target: 'tasks',
  generation: '20260809t000000',
  physicalIndexName: 'suar_tasks_v1_20260809t000000',
  status: 'ready',
  sourceEntityRevision: 'rev-12',
  contextVersion: 'ctx-v1',
  taxonomyVersions: { skills: 4 },
  enrichmentVersion: 'enrich-v1',
  checkpoint: 'outbox-12',
  documentCount: 2,
  completenessChecksum: 'sha-12',
  createdAt: '2026-08-09T00:00:00.000Z',
  updatedAt: '2026-08-09T00:01:00.000Z',
}

const tokenGenerator = new NodeSearchIndexPlanTokenGenerator()

class Repository implements SearchProjectionGenerationRepository {
  current = generation

  create(value: SearchProjectionGeneration) {
    this.current = value
    return Promise.resolve(value)
  }

  findById() {
    return Promise.resolve(this.current)
  }

  listByTarget(target: string) {
    return Promise.resolve(
      this.current.target === target ? [{ generation: this.current, lockVersion: 1 }] : []
    )
  }

  withTargetLock<T>(
    _target: string,
    callback: (repository: SearchProjectionGenerationRepository) => Promise<T>
  ): Promise<T> {
    return callback(this)
  }

  transition(input: Parameters<SearchProjectionGenerationRepository['transition']>[0]) {
    this.current = { ...this.current, status: input.status, updatedAt: input.updatedAt }
    return Promise.resolve({ generation: this.current, lockVersion: input.expectedLockVersion + 1 })
  }
}

function lifecycle(activeIndexNames: string[] = ['suar_tasks_v1']) {
  return {
    aliasName: 'suar_tasks',
    getBackingIndices: () => Promise.resolve(activeIndexNames),
    activateGeneration: (indexName: string, expected?: readonly string[]) => {
      if (expected && expected.join('|') !== activeIndexNames.join('|')) {
        return Promise.reject(new Error('stale alias state'))
      }
      activeIndexNames.splice(0, activeIndexNames.length, indexName)
      return Promise.resolve()
    },
  }
}

test.group('Unit | Search index activation', () => {
  test('previews the ready candidate with exact routing evidence and a state token', async ({
    assert,
  }) => {
    const plan = await new PreviewSearchIndexActivationQuery(
      new Repository(),
      lifecycle(),
      tokenGenerator
    ).handle({ id: generation.id })

    assert.equal(plan.mode, 'preview')
    assert.deepEqual(plan.activeIndexNames, ['suar_tasks_v1'])
    assert.equal(plan.expectedLockVersion, 1)
    assert.deepEqual(plan.candidate, {
      id: generation.id,
      target: 'tasks',
      generation: generation.generation,
      physicalIndexName: generation.physicalIndexName,
      status: 'ready',
      sourceEntityRevision: 'rev-12',
      contextVersion: 'ctx-v1',
      taxonomyVersions: { skills: 4 },
      enrichmentVersion: 'enrich-v1',
      checkpoint: 'outbox-12',
      documentCount: 2,
      completenessChecksum: 'sha-12',
    })
    assert.match(plan.expectedStateToken, /^[a-f0-9]{64}$/u)
    assert.deepEqual(plan.blockers, [])
  })

  test('fails closed when the candidate is not ready', async ({ assert }) => {
    const repository = new Repository()
    repository.current = { ...generation, status: 'requires_repair' }
    const plan = await new PreviewSearchIndexActivationQuery(repository, lifecycle(), tokenGenerator).handle({
      id: generation.id,
    })

    assert.deepEqual(plan.blockers, ['generation_not_ready'])
    await assert.rejects(
      () =>
        new ApplySearchIndexActivationCommand(
          repository,
          lifecycle(),
          tokenGenerator
        ).handle({
          id: generation.id,
          expectedLockVersion: 1,
          expectedStateToken: plan.expectedStateToken,
          now: '2026-08-09T00:02:00.000Z',
        }),
      /not ready/u
    )
  })

  test('applies only the unchanged preview and records active state', async ({ assert }) => {
    const repository = new Repository()
    const routing = lifecycle()
    const preview = await new PreviewSearchIndexActivationQuery(repository, routing, tokenGenerator).handle({
      id: generation.id,
    })

    const result = await new ApplySearchIndexActivationCommand(repository, routing, tokenGenerator).handle({
      id: generation.id,
      expectedLockVersion: 1,
      expectedCurrentIndexNames: preview.activeIndexNames,
      expectedStateToken: preview.expectedStateToken,
      now: '2026-08-09T00:02:00.000Z',
    })

    assert.equal(result.status, 'active')
    assert.deepEqual(await routing.getBackingIndices(), [generation.physicalIndexName])
  })

  test('rejects a stale preview token before alias activation', async ({ assert }) => {
    const repository = new Repository()
    const routing = lifecycle()
    const preview = await new PreviewSearchIndexActivationQuery(repository, routing, tokenGenerator).handle({
      id: generation.id,
    })
    repository.current = { ...repository.current, completenessChecksum: 'sha-new' }
    let activated = false
    const guardedRouting = {
      ...routing,
      activateGeneration: () => {
        activated = true
        return Promise.resolve()
      },
    }

    await assert.rejects(
      () =>
        new ApplySearchIndexActivationCommand(repository, guardedRouting, tokenGenerator).handle({
          id: generation.id,
          expectedLockVersion: 1,
          expectedStateToken: preview.expectedStateToken,
          now: '2026-08-09T00:02:00.000Z',
        }),
      /stale/u
    )
    assert.isFalse(activated)
  })
})
