import { test } from '@japa/runner'

import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'
import {
  applySearchRelaxation,
  buildSearchDiscoveryExplanation,
  buildSearchExplanation,
  buildSearchSuggestionGroups,
  proposeZeroResultRecoveries,
} from '#modules/search/domain/search-discovery/search_assistance'

const condition = (overrides: Partial<Extract<FilterExpression, { kind: 'condition' }>> = {}): FilterExpression => ({
  kind: 'condition',
  field: 'task.skills',
  operator: 'contains_all',
  effect: 'require',
  unknown: 'exclude',
  value: { kind: 'set', values: ['typescript', 'rust'], minimumMatch: 2 },
  ...overrides,
})

test.group('Unit | Search assistance', () => {
  test('groups only authorized, non-sensitive, above-threshold suggestions', ({ assert }) => {
    const groups = buildSearchSuggestionGroups({
      query: 'rust',
      candidates: [
        { id: '1', label: 'Rust', kind: 'facet', score: 10, authorized: true, visibleCount: 20 },
        { id: '2', label: 'Rust secret', kind: 'facet', score: 9, authorized: false, visibleCount: 20 },
        { id: '3', label: 'Rust private', kind: 'facet', score: 8, authorized: true, sensitive: true, visibleCount: 20 },
        { id: '4', label: 'Rust rare', kind: 'facet', score: 7, authorized: true, visibleCount: 2 },
      ],
    })
    assert.deepEqual(groups, [{ kind: 'facet', suggestions: [{ id: '1', label: 'Rust', kind: 'facet' }] }])
  })

  test('proposes typed reversible zero-result patches without changing the source AST', ({ assert }) => {
    const expression: FilterExpression = { kind: 'group', combinator: 'and', children: [condition()] }
    const proposals = proposeZeroResultRecoveries({ expression, beforeCount: 0 })
    assert.deepEqual(proposals.map(({ patch }) => patch.kind), ['all_to_any', 'lower_minimum_match'])
    const firstProposal = proposals[0]
    if (!firstProposal) throw new Error('Expected an all-to-any recovery proposal')
    const relaxed = applySearchRelaxation(expression, firstProposal.patch)
    if (relaxed.kind !== 'group') throw new Error('Expected a group expression')
    const relaxedChild = relaxed.children[0]
    const originalChild = expression.children[0]
    assert.isTrue(relaxedChild?.kind === 'condition')
    assert.equal(relaxedChild?.kind === 'condition' ? relaxedChild.operator : undefined, 'contains_any')
    assert.equal(originalChild?.kind === 'condition' ? originalChild.operator : undefined, 'contains_all')
  })

  test('supports exclusion and hierarchy recovery while keeping explanation fields bounded and explicit', ({ assert }) => {
    const expression: FilterExpression = {
      kind: 'condition', field: 'taxonomy.category', operator: 'within_subtree', effect: 'exclude', unknown: 'exclude',
      value: { kind: 'hierarchy', termIds: ['backend'], expansion: 'exact' },
    }
    const proposal = proposeZeroResultRecoveries({ expression, beforeCount: 0 })
    assert.deepEqual(proposal.map(({ patch }) => patch.kind), ['remove_condition', 'broaden_hierarchy'])
    const explanation = buildSearchExplanation({ strictMatches: ['category'], boundedPreferences: [], unknownFields: [], taxonomyExpansions: ['backend → descendants'], rankingVersion: 'v1', partialSources: [] })
    assert.equal(explanation.rankingVersion, 'v1')
    assert.deepEqual(explanation.taxonomyExpansions, ['backend → descendants'])
  })

  test('accepts only provider-observed, typed contributing signals', ({ assert }) => {
    const explanation = buildSearchDiscoveryExplanation({
      rankingVersion: 'tasks.lexical.v1',
      contributingSignals: [
        {
          kind: 'text_match',
          field: 'title',
          match: 'phrase',
          evidence: 'provider',
        },
        {
          kind: 'strict_filter',
          field: 'taxonomy.requiredSkills',
          operator: 'contains_any',
          evidence: 'provider',
        },
        {
          kind: 'preference',
          field: 'task.difficulty',
          effect: 'boost',
          weight: 5,
          scoreContribution: 2.5,
          evidence: 'provider',
        },
        {
          kind: 'taxonomy_expansion',
          field: 'taxonomy.requiredSkills',
          termId: 'skill-backend',
          expansion: 'descendants',
          evidence: 'provider',
        },
      ],
      partialSources: ['tasks'],
    })

    assert.deepEqual(explanation.contributingSignals, [
      {
        kind: 'text_match',
        field: 'title',
        match: 'phrase',
        evidence: 'provider',
      },
      {
        kind: 'strict_filter',
        field: 'taxonomy.requiredSkills',
        operator: 'contains_any',
        evidence: 'provider',
      },
      {
        kind: 'preference',
        field: 'task.difficulty',
        effect: 'boost',
        weight: 5,
        scoreContribution: 2.5,
        evidence: 'provider',
      },
      {
        kind: 'taxonomy_expansion',
        field: 'taxonomy.requiredSkills',
        termId: 'skill-backend',
        expansion: 'descendants',
        evidence: 'provider',
      },
    ])
    assert.deepEqual(explanation.partialSources, ['tasks'])
  })

  test('rejects invented or contradictory ranking evidence', ({ assert }) => {
    assert.throws(() =>
      buildSearchDiscoveryExplanation({
        rankingVersion: 'tasks.lexical.v1',
        contributingSignals: [
          {
            kind: 'preference',
            field: 'task.difficulty',
            effect: 'penalty',
            weight: 5,
            scoreContribution: 1,
            evidence: 'provider',
          },
        ],
      })
    )
  })
})
