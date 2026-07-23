import { test } from '@japa/runner'

import {
  createSearchProjectionMetadata,
  toPublicSearchProjectionMetadata,
} from '#modules/search/domain/projection-generation/search_projection_metadata'

const base = {
  sourceRevision: 'task-rev-12',
  projectionVersion: 'tasks-v1',
  taxonomyVersions: { skills: 4 },
  updatedAt: '2026-08-09T00:00:00.000Z',
}

test.group('Unit | Search projection metadata', () => {
  test('preserves operational coverage states while collapsing private availability publicly', ({ assert }) => {
    const states = [
      ['available', 'available'],
      ['known_empty', 'known_empty'],
      ['missing', 'incomplete'],
      ['unresolved', 'incomplete'],
      ['below_threshold', 'incomplete'],
      ['stale', 'incomplete'],
      ['private_unavailable', 'unavailable'],
    ] as const

    for (const [state, publicCoverage] of states) {
      const metadata = createSearchProjectionMetadata({ ...base, state })
      assert.equal(toPublicSearchProjectionMetadata(metadata).coverage, publicCoverage)
    }
  })

  test('rejects available metadata without a source revision or invalid taxonomy versions', ({ assert }) => {
    assert.throws(
      () => createSearchProjectionMetadata({ ...base, sourceRevision: null, state: 'available' }),
      /available_projection_metadata_requires_source_revision/u
    )
    assert.throws(
      () => createSearchProjectionMetadata({ ...base, taxonomyVersions: { skills: 0 }, state: 'stale' }),
      /invalid_search_projection_metadata/u
    )
  })
})
