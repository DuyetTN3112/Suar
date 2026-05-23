import { test } from '@japa/runner'

import type {
  FilterCondition,
  FilterExpression,
  FilterPreference,
} from '#modules/filtering/domain/filtering-core/filter_expression'
import {
  evaluateSetOperator,
  resolveRelativeTimeRange,
} from '#modules/filtering/domain/filtering-core/filter_operators'
import {
  evaluateFilterExpression,
  resolveFilterTruth,
  scoreFilterPreferences,
} from '#modules/filtering/domain/filtering-core/filter_truth'
import { condition } from '#modules/filtering/tests/backend/fixtures/filter_semantic_cases'

function resolver(results: Readonly<Record<string, 'true' | 'false' | 'unknown'>>) {
  return (candidate: FilterCondition) => results[candidate.field] ?? 'unknown'
}

test.group('Filter expression semantic kernel', () => {
  test('AST truth tables cover require/exclude, unknown policies, AND, OR, and NOT', ({
    assert,
  }) => {
    const strictCases = [
      ['true', 'require', 'exclude', true],
      ['false', 'require', 'exclude', false],
      ['true', 'exclude', 'exclude', false],
      ['false', 'exclude', 'exclude', true],
      ['unknown', 'require', 'include', true],
      ['unknown', 'exclude', 'include', true],
      ['unknown', 'require', 'exclude', false],
      ['unknown', 'exclude', 'exclude', false],
    ] as const

    for (const [truth, effect, unknown, expected] of strictCases) {
      assert.equal(resolveFilterTruth(truth, effect, unknown), expected)
    }

    for (const left of ['true', 'false'] as const) {
      for (const right of ['true', 'false'] as const) {
        const results = resolver({ left, right })
        const children = [condition({ field: 'left' }), condition({ field: 'right' })]
        assert.equal(
          evaluateFilterExpression({ kind: 'group', combinator: 'and', children }, results),
          left === 'true' && right === 'true'
        )
        assert.equal(
          evaluateFilterExpression({ kind: 'group', combinator: 'or', children }, results),
          left === 'true' || right === 'true'
        )
      }
    }
  })

  test('AST-006/007/008 freezes known-empty and unknown set semantics', ({ assert }) => {
    assert.equal(evaluateSetOperator('contains_any', [], ['typescript']), 'false')
    assert.equal(evaluateSetOperator('contains_any', undefined, ['typescript']), 'unknown')
    assert.equal(evaluateSetOperator('contains_all', [], []), 'true')
    assert.equal(evaluateSetOperator('contains_none', [], ['typescript']), 'true')
    assert.equal(evaluateSetOperator('contains_none', undefined, ['typescript']), 'unknown')
    assert.equal(evaluateSetOperator('is_empty', [], []), 'true')
    assert.equal(evaluateSetOperator('is_empty', undefined, []), 'unknown')
  })

  test('TC-FST-006 evaluates Any/All/None/Exactly/At-least-N after canonical dedupe', ({
    assert,
  }) => {
    const entity = ['TypeScript', 'redis', 'Redis']

    assert.equal(evaluateSetOperator('contains_any', entity, ['typescript']), 'true')
    assert.equal(evaluateSetOperator('contains_all', entity, ['redis', 'typescript']), 'true')
    assert.equal(evaluateSetOperator('contains_none', entity, ['postgresql']), 'true')
    assert.equal(evaluateSetOperator('contains_exactly', entity, ['REDIS', 'typescript']), 'true')
    assert.equal(
      evaluateSetOperator('contains_at_least', entity, ['redis', 'typescript'], 2),
      'true'
    )
  })

  test('TC-FST-007 applies require/exclude and explicit unknown policy before groups', ({
    assert,
  }) => {
    const required = condition({ field: 'required', unknown: 'include' })
    const excluded = condition({ field: 'excluded', effect: 'exclude', unknown: 'include' })
    const denied = condition({ field: 'denied', unknown: 'exclude' })
    const expression: FilterExpression = {
      kind: 'group',
      combinator: 'and',
      children: [required, excluded],
    }

    assert.isTrue(
      evaluateFilterExpression(expression, resolver({ required: 'unknown', excluded: 'unknown' }))
    )
    assert.isFalse(evaluateFilterExpression(denied, resolver({ denied: 'unknown' })))
    assert.isFalse(
      evaluateFilterExpression(
        condition({ field: 'present', effect: 'exclude' }),
        resolver({ present: 'true' })
      )
    )
  })

  test('AST-003 evaluates nested AND/OR and Boolean negation without unsafe De Morgan rewrites', ({
    assert,
  }) => {
    const expression: FilterExpression = {
      kind: 'group',
      combinator: 'and',
      children: [
        condition({ field: 'a' }),
        {
          kind: 'group',
          combinator: 'or',
          negated: true,
          children: [condition({ field: 'b' }), condition({ field: 'c' })],
        },
      ],
    }

    assert.isTrue(
      evaluateFilterExpression(expression, resolver({ a: 'true', b: 'false', c: 'false' }))
    )
    assert.isFalse(
      evaluateFilterExpression(expression, resolver({ a: 'true', b: 'true', c: 'false' }))
    )

    const doubleNegation: FilterExpression = {
      kind: 'group',
      combinator: 'and',
      negated: true,
      children: [
        {
          kind: 'group',
          combinator: 'and',
          negated: true,
          children: [condition({ field: 'a' })],
        },
      ],
    }
    assert.isTrue(evaluateFilterExpression(doubleNegation, resolver({ a: 'true' })))
  })

  test('AST-012 resolves relative windows against a fixed instant across leap day', ({
    assert,
  }) => {
    const now = new Date('2024-03-01T00:30:00.000Z')

    assert.deepEqual(
      resolveRelativeTimeRange(
        { kind: 'relative_time', amount: 1, unit: 'day', anchor: 'now' },
        'within_last',
        now
      ),
      { gte: '2024-02-29T00:30:00.000Z', lte: '2024-03-01T00:30:00.000Z' }
    )
    assert.deepEqual(
      resolveRelativeTimeRange(
        { kind: 'relative_time', amount: 1, unit: 'month', anchor: 'now' },
        'within_next',
        new Date('2024-01-31T12:00:00.000Z')
      ),
      { gte: '2024-01-31T12:00:00.000Z', lte: '2024-02-29T12:00:00.000Z' }
    )
  })

  test('AST-014/015 bounds preference score and explicit sort disables relevance', ({ assert }) => {
    const preferences: FilterPreference[] = [
      { effect: 'prefer', expression: condition({ field: 'a', unknown: 'exclude' }), weight: 99 },
      { effect: 'avoid', expression: condition({ field: 'b', unknown: 'exclude' }), weight: 3 },
      { effect: 'prefer', expression: condition({ field: 'missing', unknown: 'exclude' }) },
    ]
    const options = { minWeight: 1, maxWeight: 5, maxPreferenceScore: 4 }

    assert.deepEqual(
      scoreFilterPreferences(
        preferences,
        resolver({ a: 'true', b: 'true', missing: 'unknown' }),
        options
      ),
      {
        score: 2,
        contributions: [
          { index: 0, effect: 'prefer', normalizedWeight: 5, contribution: 5 },
          { index: 1, effect: 'avoid', normalizedWeight: 3, contribution: -3 },
        ],
      }
    )
    assert.deepEqual(
      scoreFilterPreferences(preferences, resolver({ a: 'true', b: 'true' }), {
        ...options,
        explicitSortDisablesRelevance: true,
      }),
      { score: 0, contributions: [] }
    )
  })

  test('preference scoring never rewards unknown data even when validation is bypassed', ({
    assert,
  }) => {
    const unsafePreference: FilterPreference = {
      effect: 'prefer',
      expression: condition({ field: 'hidden', unknown: 'include' }),
      weight: 5,
    }

    assert.deepEqual(
      scoreFilterPreferences([unsafePreference], resolver({ hidden: 'unknown' }), {
        minWeight: 1,
        maxWeight: 5,
        maxPreferenceScore: 5,
      }),
      { score: 0, contributions: [] }
    )
  })
})
