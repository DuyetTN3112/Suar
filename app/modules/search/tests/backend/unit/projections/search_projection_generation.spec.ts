import { test } from '@japa/runner'

import { createSearchProjectionGeneration, advanceSearchProjectionGeneration, recordSearchProjectionCheckpoint, validateSearchProjectionGeneration } from '#modules/search/domain/projection-generation/search_projection_generation'

test.group('Unit | Search projection generation', () => {
  test('moves through build/catch-up/validation and only becomes ready with complete evidence', ({ assert }) => {
    let generation = createSearchProjectionGeneration({ id: 'gen-1', target: 'tasks', generation: '20260809t000000', physicalIndexName: 'suar_test_tasks_v1_20260809t000000', sourceEntityRevision: 'rev-10', contextVersion: 'ctx-v1', taxonomyVersions: { skills: 4 }, enrichmentVersion: 'enrich-v1', now: '2026-08-09T00:00:00.000Z' })
    generation = advanceSearchProjectionGeneration(generation, 'catching_up')
    generation = recordSearchProjectionCheckpoint(generation, { sourceRevision: 'rev-11', checkpoint: 'outbox-11', now: '2026-08-09T00:01:00.000Z' })
    generation = advanceSearchProjectionGeneration(generation, 'validating')
    assert.equal(validateSearchProjectionGeneration(generation, { expectedDocumentCount: 2, actualDocumentCount: 2, expectedChecksum: 'sha-1', actualChecksum: 'sha-1', eventGap: false }), 'ready')
  })

  test('blocks activation evidence when an event gap or count/checksum mismatch exists', ({ assert }) => {
    const building = createSearchProjectionGeneration({ id: 'gen-2', target: 'tasks', generation: '20260809t000001', physicalIndexName: 'suar_test_tasks_v1_20260809t000001', sourceEntityRevision: 'rev-10', contextVersion: 'ctx-v1', taxonomyVersions: { skills: 4 }, enrichmentVersion: 'enrich-v1', now: '2026-08-09T00:00:00.000Z' })
    const generation = advanceSearchProjectionGeneration(advanceSearchProjectionGeneration(building, 'catching_up'), 'validating')
    assert.equal(validateSearchProjectionGeneration(generation, { expectedDocumentCount: 2, actualDocumentCount: 1, expectedChecksum: 'sha-1', actualChecksum: 'sha-2', eventGap: false }), 'requires_repair')
    assert.equal(validateSearchProjectionGeneration(generation, { expectedDocumentCount: 2, actualDocumentCount: 2, expectedChecksum: 'sha-1', actualChecksum: 'sha-1', eventGap: true }), 'requires_repair')
  })

  test('rejects checkpoint regression and illegal transitions', ({ assert }) => {
    const generation = createSearchProjectionGeneration({ id: 'gen-3', target: 'tasks', generation: '20260809t000002', physicalIndexName: 'suar_test_tasks_v1_20260809t000002', sourceEntityRevision: 'rev-10', contextVersion: 'ctx-v1', taxonomyVersions: { skills: 4 }, enrichmentVersion: 'enrich-v1', now: '2026-08-09T00:00:00.000Z' })
    assert.throws(() => recordSearchProjectionCheckpoint(generation, { sourceRevision: 'rev-09', checkpoint: 'outbox-9', now: '2026-08-09T00:01:00.000Z' }), /checkpoint_regression/u)
    assert.throws(() => advanceSearchProjectionGeneration(generation, 'active'), /illegal_projection_generation_transition/u)
  })
})
