import { test } from '@japa/runner'

import {
  SEARCH_RRF_RANK_CONSTANT,
  weightedReciprocalRankFusion,
} from '#modules/search/domain/search-discovery/reciprocal_rank_fusion'

test.group('Weighted reciprocal rank fusion', () => {
  test('combines independent ranks with explicit weights', ({ assert }) => {
    const score = weightedReciprocalRankFusion([
      { rank: 1, weight: 2 },
      { rank: 3, weight: 1 },
    ])

    assert.approximately(
      score,
      2 / (SEARCH_RRF_RANK_CONSTANT + 1) + 1 / (SEARCH_RRF_RANK_CONSTANT + 3),
      0.000_000_001
    )
  })

  test('rewards a stronger text rank more than the same source-rank gain', ({ assert }) => {
    const strongText = weightedReciprocalRankFusion([
      { rank: 1, weight: 2 },
      { rank: 2, weight: 1 },
    ])
    const strongSource = weightedReciprocalRankFusion([
      { rank: 2, weight: 2 },
      { rank: 1, weight: 1 },
    ])

    assert.isAbove(strongText, strongSource)
  })

  test('rejects missing or invalid ranking signals', ({ assert }) => {
    assert.throws(() => weightedReciprocalRankFusion([]), 'RRF requires at least one ranked signal')
    assert.throws(
      () => weightedReciprocalRankFusion([{ rank: 0, weight: 1 }]),
      'RRF signal rank must be a positive safe integer'
    )
    assert.throws(
      () => weightedReciprocalRankFusion([{ rank: 1, weight: 0 }]),
      'RRF signal weight must be a finite positive number'
    )
  })
})
