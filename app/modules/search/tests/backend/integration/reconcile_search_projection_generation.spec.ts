import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { ReconcileSearchProjectionGenerationCommand } from '#modules/search/actions/commands/projection-generation/reconcile_search_projection_generation_command'
import { FaultInjectingSearchIndexCutoverFence } from '#modules/search/actions/ports/outbound/search_index_cutover_fence_port'
import { createSearchProjectionGeneration } from '#modules/search/domain/projection-generation/search_projection_generation'
import { PostgresSearchProjectionGenerationRepository } from '#modules/search/infra/repositories/projection-generation/postgres_search_projection_generation_repository'
import { VersionedSearchIndexLifecycle } from '#modules/search/infra/adapters/index-administration/versioned_search_index_lifecycle'
import { buildSearchGenerationIndexName } from '#modules/search/public_contracts/search_index_naming'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

test.group('Integration | Reconcile search projection generation', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(async () => {
    await teardownApp()
  })

  test('routes a real alias from the Postgres active generation and remains idempotent', async ({ assert, cleanup }) => {
    const [{ searchIndexAdminClient }, { PostgresSearchIndexCutoverFence }] = await Promise.all([
      import('#modules/search/infra/adapters/index-administration/elasticsearch_search_index_admin_client'),
      import('#modules/search/infra/adapters/index-administration/postgres_search_index_cutover_fence'),
    ])
    const suffix = randomUUID().replaceAll('-', '')
    const target = `reconcile_it_${suffix}`
    const aliasName = `suar_reconcile_${suffix}`
    const initialPhysicalIndexName = `${aliasName}_v1`
    const generationName = `reconcile-${suffix}`
    const physicalIndexName = buildSearchGenerationIndexName(aliasName, generationName)
    const id = randomUUID()
    const adoptedGenerationName = `reconcile-adopted-${suffix}`
    const adoptedPhysicalIndexName = buildSearchGenerationIndexName(aliasName, adoptedGenerationName)
    const adoptedId = randomUUID()
    const now = '2026-08-09T00:00:00.000Z'
    const definition = {
      mappings: {
        dynamic: 'strict' as const,
        properties: { entity_id: { type: 'keyword' as const } },
      },
    }
    const lifecycle = new VersionedSearchIndexLifecycle(
      searchIndexAdminClient,
      aliasName,
      initialPhysicalIndexName,
      new PostgresSearchIndexCutoverFence(),
    )
    const repository = new PostgresSearchProjectionGenerationRepository()

    cleanup(async () => {
      await db.from('search_projection_generations').whereIn('id', [id, adoptedId]).delete()
      await lifecycle.resetIndex()
    })

    await lifecycle.ensureIndex(definition)
    await lifecycle.createGeneration(generationName, definition)
    const generation = createSearchProjectionGeneration({
      id,
      target,
      generation: generationName,
      physicalIndexName,
      sourceEntityRevision: 'rev-1',
      contextVersion: 'ctx-v1',
      taxonomyVersions: { skills: 1 },
      enrichmentVersion: 'enrich-v1',
      now,
    })
    await repository.create(generation)
    await repository.transition({ id, expectedLockVersion: 1, status: 'catching_up', sourceEntityRevision: 'rev-1', checkpoint: 'outbox-1', documentCount: null, completenessChecksum: null, updatedAt: now })
    await repository.transition({ id, expectedLockVersion: 2, status: 'validating', sourceEntityRevision: 'rev-1', checkpoint: 'outbox-1', documentCount: 1, completenessChecksum: 'sha-1', updatedAt: now })
    await repository.transition({ id, expectedLockVersion: 3, status: 'ready', sourceEntityRevision: 'rev-1', checkpoint: 'outbox-1', documentCount: 1, completenessChecksum: 'sha-1', updatedAt: now })
    await repository.transition({ id, expectedLockVersion: 4, status: 'active', sourceEntityRevision: 'rev-1', checkpoint: 'outbox-1', documentCount: 1, completenessChecksum: 'sha-1', updatedAt: now })

    const command = new ReconcileSearchProjectionGenerationCommand(repository, lifecycle)
    const first = await command.handle({ target })
    const second = await command.handle({ target })

    assert.isTrue(first.changed)
    assert.isFalse(second.changed)
    assert.deepEqual(await lifecycle.getBackingIndices(), [physicalIndexName])

    await lifecycle.createGeneration(adoptedGenerationName, definition)
    const adoptedGeneration = createSearchProjectionGeneration({
      id: adoptedId,
      target,
      generation: adoptedGenerationName,
      physicalIndexName: adoptedPhysicalIndexName,
      sourceEntityRevision: 'rev-2',
      contextVersion: 'ctx-v1',
      taxonomyVersions: { skills: 1 },
      enrichmentVersion: 'enrich-v1',
      now,
    })
    await repository.create(adoptedGeneration)
    await repository.transition({ id: adoptedId, expectedLockVersion: 1, status: 'catching_up', sourceEntityRevision: 'rev-2', checkpoint: 'outbox-2', documentCount: null, completenessChecksum: null, updatedAt: now })
    await repository.transition({ id: adoptedId, expectedLockVersion: 2, status: 'validating', sourceEntityRevision: 'rev-2', checkpoint: 'outbox-2', documentCount: 1, completenessChecksum: 'sha-2', updatedAt: now })
    await repository.transition({ id: adoptedId, expectedLockVersion: 3, status: 'ready', sourceEntityRevision: 'rev-2', checkpoint: 'outbox-2', documentCount: 1, completenessChecksum: 'sha-2', updatedAt: now })
    const crashAfterAliasSwapLifecycle = new VersionedSearchIndexLifecycle(
      searchIndexAdminClient,
      aliasName,
      initialPhysicalIndexName,
      new FaultInjectingSearchIndexCutoverFence(new PostgresSearchIndexCutoverFence(), {
        point: 'after_cutover',
        once: true,
        error: new Error('injected crash after alias swap'),
      }),
    )
    await assert.rejects(
      () => crashAfterAliasSwapLifecycle.activateGeneration(adoptedPhysicalIndexName, [physicalIndexName]),
      /injected crash after alias swap/u,
    )
    assert.deepEqual(await lifecycle.getBackingIndices(), [adoptedPhysicalIndexName])
    const preReplayStatuses = await repository.listByTarget(target)
    assert.equal(preReplayStatuses.find(({ generation: value }) => value.id === id)?.generation.status, 'active')
    assert.equal(preReplayStatuses.find(({ generation: value }) => value.id === adoptedId)?.generation.status, 'ready')

    const adoptedResult = await command.handle({ target })
    assert.equal(adoptedResult.generationId, adoptedId)
    assert.isTrue(adoptedResult.changed)
    assert.deepEqual(await lifecycle.getBackingIndices(), [adoptedPhysicalIndexName])
    const statuses = await repository.listByTarget(target)
    assert.equal(statuses.find(({ generation: value }) => value.id === id)?.generation.status, 'requires_repair')
    assert.equal(statuses.find(({ generation: value }) => value.id === adoptedId)?.generation.status, 'active')
  }).timeout(20_000)

  test('enforces at most one active generation per target in Postgres', async ({ assert, cleanup }) => {
    const target = `reconcile_unique_${randomUUID().replaceAll('-', '')}`
    const firstId = randomUUID()
    const secondId = randomUUID()
    const ids = [firstId, secondId]
    cleanup(async () => { await db.from('search_projection_generations').whereIn('id', ids).delete() })
    const row = (id: string) => ({
      id,
      target,
      generation: `generation-${id}`,
      physical_index_name: `suar_${target}_v1_${id}`,
      status: 'active',
      source_entity_revision: 'rev-1',
      context_version: 'ctx-v1',
      taxonomy_versions: JSON.stringify({ skills: 1 }),
      enrichment_version: 'enrich-v1',
      checkpoint: 'outbox-1',
      document_count: 1,
      completeness_checksum: 'sha-1',
      lock_version: 1,
    })

    await db.table('search_projection_generations').insert(row(firstId))
    let captured: unknown
    try {
      await db.table('search_projection_generations').insert(row(secondId))
    } catch (error) {
      captured = error
    }

    assert.exists(captured)
    const count = (await db
        .from('search_projection_generations')
        .where('target', target)
        .count('* as total')
        .first()) as { total: number | string } | null
    if (!count) throw new Error('expected a count row')
    assert.equal(Number(count.total), 1)
  })
})
