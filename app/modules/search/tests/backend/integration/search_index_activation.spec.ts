import { test } from '@japa/runner'

import { ApplySearchIndexActivationCommand } from '#modules/search/actions/commands/index-administration/apply_search_index_activation_command'
import type { SearchProjectionGenerationRepository } from '#modules/search/actions/ports/outbound/search_projection_generation_repository'
import { PreviewSearchIndexActivationQuery } from '#modules/search/actions/queries/index-administration/preview_search_index_activation_query'
import type { SearchProjectionGeneration } from '#modules/search/domain/projection-generation/search_projection_generation'
import { NodeSearchIndexPlanTokenGenerator } from '#modules/search/infra/adapters/index-administration/node_search_index_plan_token_generator'

test.group('Integration | Search index activation boundary', () => {
  test('runs preview then fenced apply through the real activation command', async ({ assert }) => {
    const generation: SearchProjectionGeneration = {
      id: 'integration-generation-1',
      target: 'tasks',
      generation: '20260809t000010',
      physicalIndexName: 'suar_tasks_v1_20260809t000010',
      status: 'ready',
      sourceEntityRevision: 'rev-20',
      contextVersion: 'ctx-v2',
      taxonomyVersions: { skills: 5 },
      enrichmentVersion: 'enrich-v2',
      checkpoint: 'outbox-20',
      documentCount: 3,
      completenessChecksum: 'sha-20',
      createdAt: '2026-08-09T00:00:00.000Z',
      updatedAt: '2026-08-09T00:01:00.000Z',
    }
    let current = generation
    let active = ['suar_tasks_v1']
    const repository: SearchProjectionGenerationRepository = {
      create: (value) => {
        current = value
        return Promise.resolve(value)
      },
      findById: () => Promise.resolve(current),
      listByTarget: (target) => Promise.resolve(current.target === target ? [{ generation: current, lockVersion: 1 }] : []),
      withTargetLock: async (_target, callback) => callback(repository),
      transition: (input) => {
        if (input.expectedLockVersion !== 1) return Promise.resolve(null)
        current = { ...current, status: input.status, updatedAt: input.updatedAt }
        return Promise.resolve({ generation: current, lockVersion: 2 })
      },
    }
    const routing = {
      aliasName: 'suar_tasks',
      getBackingIndices: () => Promise.resolve(active),
      activateGeneration: (indexName: string, expected?: readonly string[]) => {
        assert.deepEqual(expected, ['suar_tasks_v1'])
        active = [indexName]
        return Promise.resolve()
      },
    }
    const tokenGenerator = new NodeSearchIndexPlanTokenGenerator()

    const preview = await new PreviewSearchIndexActivationQuery(repository, routing, tokenGenerator).handle({
      id: generation.id,
    })
    const applied = await new ApplySearchIndexActivationCommand(repository, routing, tokenGenerator).handle({
      id: generation.id,
      expectedLockVersion: 1,
      expectedCurrentIndexNames: preview.activeIndexNames,
      expectedStateToken: preview.expectedStateToken,
      now: '2026-08-09T00:02:00.000Z',
    })

    assert.equal(applied.status, 'active')
    assert.deepEqual(active, [generation.physicalIndexName])
    assert.equal(current.status, 'active')
  })

  test('demotes the previous active generation before promoting a ready candidate', async ({ assert }) => {
    const oldGeneration: SearchProjectionGeneration = {
      id: 'integration-generation-old',
      target: 'tasks',
      generation: '20260809t000009',
      physicalIndexName: 'suar_tasks_v1_20260809t000009',
      status: 'active',
      sourceEntityRevision: 'rev-19',
      contextVersion: 'ctx-v2',
      taxonomyVersions: { skills: 5 },
      enrichmentVersion: 'enrich-v2',
      checkpoint: 'outbox-19',
      documentCount: 3,
      completenessChecksum: 'sha-19',
      createdAt: '2026-08-09T00:00:00.000Z',
      updatedAt: '2026-08-09T00:00:00.000Z',
    }
    const candidate: SearchProjectionGeneration = {
      ...oldGeneration,
      id: 'integration-generation-ready',
      generation: '20260809t000010',
      physicalIndexName: 'suar_tasks_v1_20260809t000010',
      status: 'ready',
      sourceEntityRevision: 'rev-20',
      checkpoint: 'outbox-20',
      completenessChecksum: 'sha-20',
      updatedAt: '2026-08-09T00:01:00.000Z',
    }
    const rows = new Map([
      [oldGeneration.id, { generation: oldGeneration, lockVersion: 4 }],
      [candidate.id, { generation: candidate, lockVersion: 7 }],
    ])
    let active = [oldGeneration.physicalIndexName]
    const repository: SearchProjectionGenerationRepository = {
      create: (value) => Promise.resolve(value),
      findById: (id) => Promise.resolve(rows.get(id)?.generation ?? null),
      listByTarget: () => Promise.resolve([...rows.values()]),
      withTargetLock: async (_target, callback) => callback(repository),
      transition: (input) => {
        const row = rows.get(input.id)
        if (!row || row.lockVersion !== input.expectedLockVersion) return Promise.resolve(null)
        const next = {
          ...row,
          lockVersion: row.lockVersion + 1,
          generation: { ...row.generation, status: input.status, updatedAt: input.updatedAt },
        }
        rows.set(input.id, next)
        return Promise.resolve(next)
      },
    }
    const routing = {
      getBackingIndices: () => Promise.resolve(active),
      activateGeneration: (indexName: string, expected?: readonly string[]) => {
        assert.deepEqual(expected, [oldGeneration.physicalIndexName])
        active = [indexName]
        return Promise.resolve()
      },
    }
    const tokenGenerator = new NodeSearchIndexPlanTokenGenerator()
    const preview = await new PreviewSearchIndexActivationQuery(repository, routing, tokenGenerator).handle({ id: candidate.id })
    const applied = await new ApplySearchIndexActivationCommand(repository, routing, tokenGenerator).handle({
      id: candidate.id,
      expectedLockVersion: 7,
      expectedCurrentIndexNames: preview.activeIndexNames,
      expectedStateToken: preview.expectedStateToken,
      now: '2026-08-09T00:02:00.000Z',
    })

    assert.equal(applied.status, 'active')
    assert.equal(rows.get(oldGeneration.id)?.generation.status, 'requires_repair')
    assert.deepEqual(active, [candidate.physicalIndexName])
  })
})
