import { test } from '@japa/runner'

import { migrateTaxonomyFilterSemanticState } from '#modules/filtering/domain/filtering-core/taxonomy_filter_criteria_migration'

const semanticState = {
  filter: {
    kind: 'group' as const,
    combinator: 'and' as const,
    children: [
      { kind: 'condition' as const, field: 'skill', operator: 'in', effect: 'require' as const, unknown: 'exclude' as const, value: { kind: 'hierarchy' as const, termIds: ['skills:old', 'skills:stable'], expansion: 'exact' as const } },
    ],
  },
  textQuery: null,
  sort: [],
  projection: [],
}

test.group('Unit | Taxonomy filter criteria migration', () => {
  test('rewrites only exact canonical term references for deterministic mappings', ({ assert }) => {
    const result = migrateTaxonomyFilterSemanticState(semanticState, [
      { from: { namespace: 'skills', termId: 'old' }, to: { namespace: 'skills', termId: 'new' }, disposition: 'deterministic', reason: 'merge' },
    ])
    assert.isTrue(result.changed)
    assert.deepEqual((result.semanticState.filter as { children: Array<{ value: { termIds: string[] } }> }).children[0]?.value.termIds, ['skills:new', 'skills:stable'])
    assert.equal(result.outcome, 'migrated')
  })

  test('preserves obsolete references for split and blocked mappings', ({ assert }) => {
    const result = migrateTaxonomyFilterSemanticState(semanticState, [
      { from: { namespace: 'skills', termId: 'old' }, replacements: [{ namespace: 'skills', termId: 'a' }, { namespace: 'skills', termId: 'b' }], disposition: 'requires_repair', reason: 'split' },
    ])
    assert.isFalse(result.changed)
    assert.deepEqual((result.semanticState.filter as { children: Array<{ value: { termIds: string[] } }> }).children[0]?.value.termIds, ['skills:old', 'skills:stable'])
    assert.equal(result.outcome, 'requires_repair')
  })
})
