import { test } from '@japa/runner'

import { applyTaxonomyMigrationPlan, type TaxonomyMigrationItem } from '#modules/taxonomy/domain/taxonomy-governance/taxonomy_change_set'
import { previewTaxonomyChange } from '#modules/taxonomy/domain/taxonomy-governance/taxonomy_migration_plan'
import { NodeTaxonomyMigrationPlanTokenGenerator } from '#modules/taxonomy/infra/adapters/taxonomy-governance/node_taxonomy_migration_plan_token_generator'

const planTokenGenerator = new NodeTaxonomyMigrationPlanTokenGenerator()

const impact = { assignments: 12, savedViews: 3, alerts: 2, projections: 4, indices: 1 }

test.group('Unit | Taxonomy migration plan', () => {
  test('previews identity-preserving rename and deterministic merge without leaking item details', ({ assert }) => {
    const plan = previewTaxonomyChange({
      namespace: 'skills', currentVersion: 4, expectedVersion: 4,
      changes: [
        { kind: 'rename', from: { namespace: 'skills', termId: 'js' }, to: { namespace: 'skills', termId: 'javascript' } },
        { kind: 'merge', from: { namespace: 'skills', termId: 'ecma-script' }, to: { namespace: 'skills', termId: 'javascript' } },
      ], impact,
    }, planTokenGenerator)
    assert.equal(plan.outcome, 'migrated')
    assert.equal(plan.mapping.length, 2)
    assert.equal(plan.mapping[1]?.disposition, 'deterministic')
    assert.deepEqual(plan.impact, impact)
    assert.notProperty(plan, 'principals')
  })

  test('marks split and retirement with consumers as repair-required or blocked', ({ assert }) => {
    const split = previewTaxonomyChange({
      namespace: 'skills', currentVersion: 4, expectedVersion: 4,
      changes: [{ kind: 'split', from: { namespace: 'skills', termId: 'fullstack' }, replacements: [{ namespace: 'skills', termId: 'frontend' }, { namespace: 'skills', termId: 'backend' }] }], impact,
    }, planTokenGenerator)
    assert.equal(split.outcome, 'requires_repair')
    assert.equal(split.mapping[0]?.disposition, 'requires_repair')

    const retired = previewTaxonomyChange({
      namespace: 'skills', currentVersion: 4, expectedVersion: 4,
      changes: [{ kind: 'retire', from: { namespace: 'skills', termId: 'obsolete' } }], impact,
    }, planTokenGenerator)
    assert.equal(retired.outcome, 'blocked')
  })

  test('applies chunks idempotently and fences a stale plan/version', ({ assert }) => {
    const items: TaxonomyMigrationItem[] = [
      { id: 'view-1', source: 'skills:old', target: 'skills:new' },
      { id: 'view-2', source: 'skills:old', target: 'skills:new' },
    ]
    const first = applyTaxonomyMigrationPlan({ planToken: 'plan-1', expectedVersion: 4, currentVersion: 4, publishedVersion: 4, items, completedIds: [], limit: 1 })
    assert.deepEqual(first, { status: 'checkpoint', completedIds: ['view-1'], nextCursor: 'view-2', publishedVersion: 4 })
    const retry = applyTaxonomyMigrationPlan({ planToken: 'plan-1', expectedVersion: 4, currentVersion: 4, publishedVersion: 4, items, completedIds: ['view-1'], limit: 1 })
    assert.deepEqual(retry, { status: 'checkpoint', completedIds: ['view-1', 'view-2'], nextCursor: null, publishedVersion: 4 })
    assert.throws(() => applyTaxonomyMigrationPlan({ planToken: 'stale', expectedVersion: 4, currentVersion: 5, publishedVersion: 4, items, completedIds: [], limit: 1 }), /stale_taxonomy_migration_plan/u)
  })
})
