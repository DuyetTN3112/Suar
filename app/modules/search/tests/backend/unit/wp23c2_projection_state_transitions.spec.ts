import { test } from '@japa/runner'

import {
  advanceSearchProjectionGeneration,
  createSearchProjectionGeneration,
  validateSearchProjectionGeneration,
} from '#modules/search/domain/projection-generation/search_projection_generation'

function generation() {
  return createSearchProjectionGeneration({
    id: 'wp23c2-generation',
    target: 'tasks',
    generation: '20260810t000000',
    physicalIndexName: 'suar_tasks_v1_20260810t000000',
    sourceEntityRevision: 'rev-10',
    contextVersion: 'ctx-v1',
    taxonomyVersions: { skills: 4 },
    enrichmentVersion: 'enrich-v1',
    now: '2026-08-10T00:00:00.000Z',
  })
}

test.group('Unit | WP-23C2 projection state transitions', () => {
  test('rebuilds a repair-required generation through validation before activation', ({ assert }) => {
    let current = advanceSearchProjectionGeneration(generation(), 'requires_repair')
    current = advanceSearchProjectionGeneration(current, 'building')
    current = advanceSearchProjectionGeneration(current, 'catching_up')
    current = advanceSearchProjectionGeneration(current, 'validating')

    assert.equal(
      validateSearchProjectionGeneration(current, {
        expectedDocumentCount: 2,
        actualDocumentCount: 2,
        expectedChecksum: 'sha-2',
        actualChecksum: 'sha-2',
        eventGap: false,
      }),
      'ready'
    )

    current = advanceSearchProjectionGeneration(current, 'ready')
    current = advanceSearchProjectionGeneration(current, 'active')
    assert.equal(current.status, 'active')
  })

  test('does not allow an active generation to become ready without repair', ({ assert }) => {
    const active = advanceSearchProjectionGeneration(
      advanceSearchProjectionGeneration(
        advanceSearchProjectionGeneration(generation(), 'catching_up'),
        'validating'
      ),
      'ready'
    )
    const published = advanceSearchProjectionGeneration(active, 'active')

    assert.throws(
      () => advanceSearchProjectionGeneration(published, 'ready'),
      /illegal_projection_generation_transition/u
    )
    assert.equal(advanceSearchProjectionGeneration(published, 'requires_repair').status, 'requires_repair')
  })

  test('keeps incomplete validation evidence in requires_repair state', ({ assert }) => {
    const validating = advanceSearchProjectionGeneration(
      advanceSearchProjectionGeneration(generation(), 'catching_up'),
      'validating'
    )

    for (const evidence of [
      { expectedDocumentCount: -1, actualDocumentCount: 0, expectedChecksum: 'sha-1', actualChecksum: 'sha-1', eventGap: false },
      { expectedDocumentCount: 2, actualDocumentCount: 1, expectedChecksum: 'sha-1', actualChecksum: 'sha-1', eventGap: false },
      { expectedDocumentCount: 2, actualDocumentCount: 2, expectedChecksum: 'sha-1', actualChecksum: 'sha-2', eventGap: false },
      { expectedDocumentCount: 2, actualDocumentCount: 2, expectedChecksum: 'sha-1', actualChecksum: 'sha-1', eventGap: true },
    ]) {
      assert.equal(validateSearchProjectionGeneration(validating, evidence), 'requires_repair')
    }
  })
})
