import { test } from '@japa/runner'

import {
  compareSearchFilterQuality,
  type SearchFilterTotal,
} from '#modules/search/domain/quality/search_filter_quality_metrics'

test.group('Search filter quality metrics', () => {
  test('requires exact equality for eligible IDs and facets', ({ assert }) => {
    const metrics = compareSearchFilterQuality({
      expectedIds: ['b', 'a'],
      actualIds: ['a', 'b'],
      expectedFacets: { engineering: 2, typescript: 1 },
      actualFacets: { typescript: 1, engineering: 2 },
      expectedSecondaryLabelIds: ['b'],
      actualSecondaryLabelIds: ['b'],
      leakedIds: [],
      expectedTotal: { relation: 'eq', value: 2 },
      actualTotal: { relation: 'eq', value: 2 },
    })

    assert.isTrue(metrics.eligibleIdsEqual)
    assert.isTrue(metrics.exactFacetsEqual)
    assert.equal(metrics.secondaryLabelRecall, 1)
    assert.equal(metrics.permissionLeakageViolations, 0)
  })

  test('scores secondary-label recall independently of primary labels', ({ assert }) => {
    const metrics = compareSearchFilterQuality({
      expectedIds: ['primary', 'secondary'],
      actualIds: ['primary', 'secondary'],
      expectedFacets: {},
      actualFacets: {},
      expectedSecondaryLabelIds: ['secondary'],
      actualSecondaryLabelIds: ['secondary'],
      leakedIds: [],
      expectedTotal: { relation: 'eq', value: 2 },
      actualTotal: { relation: 'eq', value: 2 },
    })

    assert.equal(metrics.secondaryLabelRecall, 1)
  })

  test('reports every unauthorized ID as leakage', ({ assert }) => {
    const metrics = compareSearchFilterQuality({
      expectedIds: ['public'],
      actualIds: ['public', 'hidden'],
      expectedFacets: { safe: 1 },
      actualFacets: { safe: 1 },
      expectedSecondaryLabelIds: [],
      actualSecondaryLabelIds: [],
      leakedIds: ['hidden', 'hidden'],
      expectedTotal: { relation: 'eq', value: 1 },
      actualTotal: { relation: 'eq', value: 2 },
    })

    assert.equal(metrics.permissionLeakageViolations, 1)
    assert.isFalse(metrics.eligibleIdsEqual)
  })

  test('accepts approximate totals only when their relation is honest', ({ assert }) => {
    const expectedTotal: SearchFilterTotal = { relation: 'eq', value: 5 }
    const metrics = compareSearchFilterQuality({
      expectedIds: ['a', 'b'],
      actualIds: ['a', 'b'],
      expectedFacets: {},
      actualFacets: {},
      expectedSecondaryLabelIds: [],
      actualSecondaryLabelIds: [],
      leakedIds: [],
      expectedTotal,
      actualTotal: { relation: 'gte', value: 5 },
    })

    assert.isTrue(metrics.approximateTotalRelationValid)
    assert.isFalse(
      compareSearchFilterQuality({
        expectedIds: ['a'],
        actualIds: ['a'],
        expectedFacets: {},
        actualFacets: {},
        expectedSecondaryLabelIds: [],
        actualSecondaryLabelIds: [],
        leakedIds: [],
        expectedTotal: { relation: 'eq', value: 1 },
        actualTotal: { relation: 'gte', value: 0 },
      }).approximateTotalRelationValid
    )
  })

  test('rejects exact totals that exceed the authorized population', ({ assert }) => {
    const metrics = compareSearchFilterQuality({
      expectedIds: ['public'],
      actualIds: ['public'],
      expectedFacets: { safe: 1 },
      actualFacets: { safe: 1 },
      expectedSecondaryLabelIds: [],
      actualSecondaryLabelIds: [],
      leakedIds: [],
      expectedTotal: { relation: 'eq', value: 1 },
      actualTotal: { relation: 'eq', value: 2 },
    })

    assert.isFalse(metrics.approximateTotalRelationValid)
  })
})
