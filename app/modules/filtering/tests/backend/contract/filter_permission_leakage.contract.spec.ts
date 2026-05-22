import { test } from '@japa/runner'

import { compareSearchFilterQuality } from '#modules/search/domain/quality/search_filter_quality_metrics'
import {
  eligibleEntities,
  facetCounts,
  makeFilterQualityPopulation,
  secondaryLabelIds,
} from '#modules/search/tests/backend/fixtures/filter_quality_population'

test.group('Filter permission leakage contract', () => {
  test('keeps anonymous and cross-organization populations exact and leak-free', ({ assert }) => {
    const population = makeFilterQualityPopulation()
    const anonymous = eligibleEntities(population, { kind: 'anonymous' })
    const acme = eligibleEntities(population, {
      kind: 'organization',
      organizationId: 'org-acme',
      role: 'member',
    })

    const anonymousMetrics = compareSearchFilterQuality({
      expectedIds: anonymous.map((entity) => entity.id),
      actualIds: anonymous.map((entity) => entity.id),
      expectedFacets: facetCounts(anonymous),
      actualFacets: facetCounts(anonymous),
      expectedSecondaryLabelIds: secondaryLabelIds(anonymous, 'postgresql'),
      actualSecondaryLabelIds: secondaryLabelIds(anonymous, 'postgresql'),
      leakedIds: [],
      expectedTotal: { relation: 'eq', value: anonymous.length },
      actualTotal: { relation: 'eq', value: anonymous.length },
    })
    const acmeMetrics = compareSearchFilterQuality({
      expectedIds: acme.map((entity) => entity.id),
      actualIds: acme.map((entity) => entity.id),
      expectedFacets: facetCounts(acme),
      actualFacets: facetCounts(acme),
      expectedSecondaryLabelIds: secondaryLabelIds(acme, 'redis'),
      actualSecondaryLabelIds: secondaryLabelIds(acme, 'redis'),
      leakedIds: [],
      expectedTotal: { relation: 'eq', value: acme.length },
      actualTotal: { relation: 'eq', value: acme.length },
    })

    assert.equal(population.seed, 'wp-26b-filter-quality-seed-001')
    assert.equal(anonymousMetrics.permissionLeakageViolations, 0)
    assert.equal(acmeMetrics.permissionLeakageViolations, 0)
    assert.isTrue(anonymousMetrics.exactFacetsEqual)
    assert.isTrue(acmeMetrics.exactFacetsEqual)
  })

  test('detects a hidden secret entity even when the hit is otherwise plausible', ({ assert }) => {
    const population = makeFilterQualityPopulation()
    const anonymous = eligibleEntities(population, { kind: 'anonymous' })
    const leaked = population.entities.find((entity) => entity.id === 'org-other-secret')
    if (!leaked) throw new Error('Expected deterministic hidden fixture entity')

    const metrics = compareSearchFilterQuality({
      expectedIds: anonymous.map((entity) => entity.id),
      actualIds: [...anonymous.map((entity) => entity.id), leaked.id],
      expectedFacets: facetCounts(anonymous),
      actualFacets: facetCounts([...anonymous, leaked]),
      expectedSecondaryLabelIds: secondaryLabelIds(anonymous, 'cross-tenant-secret'),
      actualSecondaryLabelIds: secondaryLabelIds([...anonymous, leaked], 'cross-tenant-secret'),
      leakedIds: [leaked.id],
      expectedTotal: { relation: 'eq', value: anonymous.length },
      actualTotal: { relation: 'gte', value: anonymous.length + 1 },
    })

    assert.isAbove(metrics.permissionLeakageViolations, 0)
    assert.isFalse(metrics.exactFacetsEqual)
    assert.equal(metrics.secondaryLabelRecall, 1)
  })

  test('fails exact-total scoring when a hidden population is counted without surfacing hits', ({
    assert,
  }) => {
    const population = makeFilterQualityPopulation()
    const anonymous = eligibleEntities(population, { kind: 'anonymous' })
    const leaked = population.entities.find((entity) => entity.id === 'org-other-secret')
    if (!leaked) throw new Error('Expected deterministic hidden fixture entity')

    const metrics = compareSearchFilterQuality({
      expectedIds: anonymous.map((entity) => entity.id),
      actualIds: anonymous.map((entity) => entity.id),
      expectedFacets: facetCounts(anonymous),
      actualFacets: facetCounts(anonymous),
      expectedSecondaryLabelIds: [],
      actualSecondaryLabelIds: [],
      leakedIds: [leaked.id],
      expectedTotal: { relation: 'eq', value: anonymous.length },
      actualTotal: { relation: 'eq', value: anonymous.length + 1 },
    })

    assert.equal(metrics.permissionLeakageViolations, 1)
    assert.isFalse(metrics.approximateTotalRelationValid)
    assert.isTrue(metrics.exactFacetsEqual)
  })
})
