import { test } from '@japa/runner'

import type {
  FilterExpression,
  FilterPreference,
} from '#modules/filtering/domain/filtering-core/filter_expression'
import {
  DEFAULT_FILTER_VALIDATION_LIMITS,
  validateFilterExpression,
  validateFilterPreferences,
} from '#modules/filtering/domain/filtering-core/filter_validator'
import { condition } from '#modules/filtering/tests/backend/fixtures/filter_semantic_cases'

const allowedFields = {
  skills: { type: 'multi_value', operators: ['contains_any', 'contains_at_least'] },
  budget: { type: 'number', operators: ['between', 'gte'] },
  dueAt: { type: 'date_time', operators: ['between', 'within_last'] },
  category: { type: 'hierarchy', operators: ['within_subtree'] },
  applications: { type: 'relation', operators: ['related_matches'] },
  applicationCount: { type: 'relation', operators: ['related_count'] },
} as const

function codes(expression: FilterExpression) {
  return validateFilterExpression(expression, { allowedFields }).errors.map((error) => error.code)
}

test.group('Filter AST validation', () => {
  test('AST-001 rejects empty and one-child stored groups with stable paths and repair hints', ({
    assert,
  }) => {
    const empty = validateFilterExpression({ kind: 'group', combinator: 'and', children: [] })
    const singleton = validateFilterExpression({
      kind: 'group',
      combinator: 'or',
      children: [condition()],
    })

    assert.deepInclude(empty.errors, {
      path: ['children'],
      code: 'FILTER_GROUP_TOO_FEW_CHILDREN',
      repairHint: 'Add at least two conditions or remove the group.',
    })
    assert.deepInclude(singleton.errors, {
      path: ['children'],
      code: 'FILTER_GROUP_TOO_FEW_CHILDREN',
      repairHint: 'Add at least two conditions or remove the group.',
    })
  })

  test('AST-002 accepts max depth and rejects one level over before any provider call', ({
    assert,
  }) => {
    const nested = (depth: number): FilterExpression =>
      depth === 0
        ? condition()
        : {
            kind: 'group',
            combinator: 'and',
            children: [nested(depth - 1), condition({ field: `peer-${depth}` })],
          }

    assert.isTrue(validateFilterExpression(nested(2), { limits: { maxDepth: 2 } }).valid)
    const result = validateFilterExpression(nested(3), { limits: { maxDepth: 2 } })
    assert.isFalse(result.valid)
    assert.include(
      result.errors.map((error) => error.code),
      'FILTER_DEPTH_LIMIT_EXCEEDED'
    )
  })

  test('AST-009 rejects invalid minimumMatch against unique selected values', ({ assert }) => {
    for (const minimumMatch of [0, -1, 1.5, 3]) {
      const expression = condition({
        operator: 'contains_at_least',
        value: { kind: 'set', values: ['typescript', 'TYPESCRIPT'], minimumMatch },
      })

      assert.include(codes(expression), 'FILTER_MINIMUM_MATCH_INVALID')
    }

    assert.isTrue(
      validateFilterExpression(
        condition({
          operator: 'contains_at_least',
          value: { kind: 'set', values: ['typescript', 'redis'], minimumMatch: 2 },
        }),
        { allowedFields }
      ).valid
    )
  })

  test('AST-010/013 rejects NaN, Infinity, string coercion and null-as-value', ({ assert }) => {
    const invalidValues: unknown[] = [
      { kind: 'scalar', value: Number.NaN },
      { kind: 'scalar', value: Number.POSITIVE_INFINITY },
      { kind: 'scalar', value: null },
    ]

    for (const value of invalidValues) {
      const result = validateFilterExpression(
        {
          kind: 'condition',
          field: 'budget',
          operator: 'gte',
          effect: 'require',
          value,
          unknown: 'exclude',
        },
        { allowedFields }
      )
      assert.isFalse(result.valid)
      assert.include(
        result.errors.map((error) => error.code),
        'FILTER_VALUE_INVALID'
      )
      assert.isTrue(result.errors.some((error) => error.repairHint.length > 0))
    }

    assert.include(
      codes(
        condition({
          field: 'budget',
          operator: 'gte',
          value: { kind: 'scalar', value: '12' },
        })
      ),
      'FILTER_VALUE_TYPE_MISMATCH'
    )
  })

  test('rejects operator/value-kind combinations before an adapter can coerce them', ({
    assert,
  }) => {
    const wrongKinds: FilterExpression[] = [
      condition({
        field: 'skills',
        operator: 'contains_any',
        value: { kind: 'scalar', value: 'typescript' },
      }),
      condition({
        field: 'budget',
        operator: 'between',
        value: { kind: 'set', values: [10, 20] },
      }),
    ]

    for (const expression of wrongKinds) {
      const result = validateFilterExpression(expression, { allowedFields })
      assert.include(
        result.errors.map((error) => error.code),
        'FILTER_VALUE_TYPE_MISMATCH'
      )
    }
  })

  test('AST-011 rejects empty, inverted, and exclusive-equal ranges deterministically', ({
    assert,
  }) => {
    const ranges = [
      { kind: 'range' as const },
      { kind: 'range' as const, gte: 20, lte: 10 },
      { kind: 'range' as const, gt: 10, lte: 10 },
    ]

    for (const value of ranges) {
      assert.include(
        codes(condition({ field: 'budget', operator: 'between', value })),
        'FILTER_RANGE_INVALID'
      )
    }
  })

  test('AST-012 validates relative time, hierarchy, and bounded relations', ({ assert }) => {
    assert.isTrue(
      validateFilterExpression(
        condition({
          field: 'dueAt',
          operator: 'within_last',
          value: { kind: 'relative_time', amount: 2, unit: 'week', anchor: 'now' },
        }),
        { allowedFields }
      ).valid
    )
    assert.isTrue(
      validateFilterExpression(
        condition({
          field: 'category',
          operator: 'within_subtree',
          value: {
            kind: 'hierarchy',
            termIds: ['media:film', 'media:book'],
            expansion: 'descendants',
          },
        }),
        { allowedFields }
      ).valid
    )

    const relation = (depth: number): FilterExpression =>
      condition({
        field: 'applications',
        operator: 'related_matches',
        value: {
          kind: 'relation',
          expression: depth === 0 ? condition() : relation(depth - 1),
        },
      })
    const result = validateFilterExpression(relation(2), {
      allowedFields,
      limits: { maxRelationDepth: 1 },
    })
    assert.include(
      result.errors.map((error) => error.code),
      'FILTER_RELATION_DEPTH_EXCEEDED'
    )
  })

  test('AST-014 rejects preference unknown include and clamps weights at evaluation only', ({
    assert,
  }) => {
    const preferences: FilterPreference[] = [
      { effect: 'prefer', expression: condition({ unknown: 'include' }), weight: 100 },
    ]
    const result = validateFilterPreferences(preferences, { minWeight: 1, maxWeight: 5 })

    assert.isFalse(result.valid)
    assert.include(
      result.errors.map((error) => error.code),
      'FILTER_PREFERENCE_UNKNOWN_MUST_EXCLUDE'
    )
  })

  test('AST-017 caps text, set, conditions, and returns stable cost diagnostics', ({ assert }) => {
    const tooMany = {
      kind: 'group' as const,
      combinator: 'and' as const,
      children: [condition(), condition({ field: 'b' }), condition({ field: 'c' })],
    }
    const conditionResult = validateFilterExpression(tooMany, { limits: { maxConditions: 2 } })
    assert.include(
      conditionResult.errors.map((error) => error.code),
      'FILTER_CONDITION_LIMIT_EXCEEDED'
    )

    const setResult = validateFilterExpression(
      condition({ value: { kind: 'set', values: ['a', 'b', 'c'] } }),
      { limits: { maxSetValues: 2 } }
    )
    assert.include(
      setResult.errors.map((error) => error.code),
      'FILTER_SET_LIMIT_EXCEEDED'
    )

    const textResult = validateFilterExpression(
      condition({
        field: 'title',
        operator: 'exact',
        value: { kind: 'scalar', value: 'x'.repeat(9) },
      }),
      { limits: { maxTextLength: 8 } }
    )
    assert.include(
      textResult.errors.map((error) => error.code),
      'FILTER_TEXT_LIMIT_EXCEEDED'
    )
    assert.isAtLeast(DEFAULT_FILTER_VALIDATION_LIMITS.maxConditions, 1)
  })

  test('AST-018 unknown and permission-hidden field/operator share a non-enumerating response', ({
    assert,
  }) => {
    const unknownField = validateFilterExpression(condition({ field: 'secretSalary' }), {
      allowedFields,
    })
    const unknownOperator = validateFilterExpression(condition({ operator: 'secret_operator' }), {
      allowedFields,
    })

    for (const result of [unknownField, unknownOperator]) {
      assert.deepInclude(result.errors[0], {
        code: 'FILTER_FIELD_OR_OPERATOR_NOT_ALLOWED',
        repairHint: 'Remove or replace the unsupported filter clause.',
      })
      assert.notInclude(JSON.stringify(result.errors), 'secretSalary')
      assert.notInclude(JSON.stringify(result.errors), 'secret_operator')
    }
  })

  test('malformed runtime condition and group discriminants return structured errors without throwing', ({
    assert,
  }) => {
    const malformed: unknown[] = [
      {
        kind: 'condition',
        field: null,
        operator: 'contains_any',
        effect: 'require',
        value: { kind: 'set', values: ['x'] },
        unknown: 'exclude',
      },
      {
        kind: 'condition',
        field: 'skills',
        operator: [],
        effect: 'require',
        value: { kind: 'set', values: ['x'] },
        unknown: 'exclude',
      },
      {
        kind: 'condition',
        field: 'skills',
        operator: 'contains_any',
        effect: 'prefer',
        value: { kind: 'set', values: ['x'] },
        unknown: 'exclude',
      },
      {
        kind: 'condition',
        field: 'skills',
        operator: 'contains_any',
        effect: 'require',
        value: { kind: 'set', values: ['x'] },
        unknown: 'sometimes',
      },
      {
        kind: 'group',
        combinator: 'xor',
        negated: 'yes',
        children: [condition(), condition({ field: 'peer' })],
      },
      { kind: 'group', combinator: 'and', children: null },
      {
        kind: 'condition',
        field: 'applications',
        operator: 'related_matches',
        effect: 'require',
        value: { kind: 'relation', expression: null, count: 'many' },
        unknown: 'exclude',
      },
    ]

    for (const expression of malformed) {
      let result: ReturnType<typeof validateFilterExpression> | undefined
      assert.doesNotThrow(() => {
        result = validateFilterExpression(expression)
      })
      assert.isFalse(result?.valid)
      assert.isAtLeast(result?.errors.length ?? 0, 1)
      assert.isTrue(
        result?.errors.every(
          (error) => error.code.length > 0 && error.path.length >= 0 && error.repairHint.length > 0
        )
      )
    }

    let prototypeProbe: ReturnType<typeof validateFilterExpression> | undefined
    assert.doesNotThrow(() => {
      prototypeProbe = validateFilterExpression(
        {
          kind: 'condition',
          field: '__proto__',
          operator: 'contains_any',
          effect: 'require',
          value: { kind: 'set', values: ['x'] },
          unknown: 'exclude',
        },
        { allowedFields }
      )
    })
    assert.deepInclude(prototypeProbe?.errors[0], {
      code: 'FILTER_FIELD_OR_OPERATOR_NOT_ALLOWED',
      repairHint: 'Remove or replace the unsupported filter clause.',
    })
  })

  test('malformed preference payloads return diagnostics and validate effect at runtime', ({
    assert,
  }) => {
    const options = { minWeight: 1, maxWeight: 5 }
    const payloads: unknown[] = [
      null,
      {},
      [null],
      [{ effect: 'boost', expression: condition() }],
      [{ effect: 'prefer', expression: { kind: 'group', combinator: 'and', children: null } }],
    ]

    for (const payload of payloads) {
      let result: ReturnType<typeof validateFilterPreferences> | undefined
      assert.doesNotThrow(() => {
        result = validateFilterPreferences(payload, options)
      })
      assert.isFalse(result?.valid)
      assert.isAtLeast(result?.errors.length ?? 0, 1)
    }
  })

  test('numeric and date ranges enforce their semantic scalar types', ({ assert }) => {
    const invalidNumericBounds: unknown[] = [
      { kind: 'range', gte: true, lte: 10 },
      { kind: 'range', gte: '1', lte: '10' },
    ]
    for (const value of invalidNumericBounds) {
      const result = validateFilterExpression(
        {
          kind: 'condition',
          field: 'budget',
          operator: 'between',
          effect: 'require',
          value,
          unknown: 'exclude',
        },
        { allowedFields }
      )
      assert.include(
        result.errors.map(({ code }) => code),
        'FILTER_VALUE_TYPE_MISMATCH'
      )
    }

    const invalidDates: unknown[] = [
      1,
      true,
      '2026-02-30T00:00:00.000Z',
      '2026-08-01T00:00:00',
      'not-a-date',
    ]
    for (const scalar of invalidDates) {
      const result = validateFilterExpression(
        {
          kind: 'condition',
          field: 'dueAt',
          operator: 'after',
          effect: 'require',
          value: { kind: 'scalar', value: scalar },
          unknown: 'exclude',
        },
        { allowedFields: { ...allowedFields, dueAt: { type: 'date_time', operators: ['after'] } } }
      )
      assert.include(
        result.errors.map(({ code }) => code),
        'FILTER_VALUE_TYPE_MISMATCH'
      )
    }

    const dateRange = (gte: unknown, lte: unknown) =>
      validateFilterExpression(
        {
          kind: 'condition',
          field: 'dueAt',
          operator: 'between',
          effect: 'require',
          value: { kind: 'range', gte, lte },
          unknown: 'exclude',
        },
        { allowedFields }
      )
    assert.isTrue(dateRange('2026-08-01T00:00:00+07:00', '2026-08-02T00:00:00+07:00').valid)
    assert.include(
      dateRange('2026-02-30T00:00:00.000Z', '2026-03-01T00:00:00.000Z').errors.map(
        ({ code }) => code
      ),
      'FILTER_VALUE_TYPE_MISMATCH'
    )
    assert.include(
      dateRange(false, true).errors.map(({ code }) => code),
      'FILTER_VALUE_TYPE_MISMATCH'
    )
  })

  test('related counts require nonempty nonnegative integer values and bounds', ({ assert }) => {
    const relatedCount = (value: unknown) =>
      validateFilterExpression(
        {
          kind: 'condition',
          field: 'applicationCount',
          operator: 'related_count',
          effect: 'require',
          value,
          unknown: 'exclude',
        },
        { allowedFields }
      )

    assert.isTrue(relatedCount({ kind: 'scalar', value: 0 }).valid)
    assert.isTrue(relatedCount({ kind: 'range', gte: 0, lte: 2 }).valid)
    for (const value of [
      { kind: 'scalar', value: -1 },
      { kind: 'scalar', value: 1.5 },
      { kind: 'scalar', value: '1' },
      { kind: 'range' },
      { kind: 'range', gte: -1 },
      { kind: 'range', gte: 1.5 },
      { kind: 'range', gte: true },
    ]) {
      assert.isFalse(relatedCount(value).valid)
    }

    const nestedEmptyCount = validateFilterExpression(
      condition({
        field: 'applications',
        operator: 'related_matches',
        value: { kind: 'relation', expression: condition(), count: {} },
      }),
      { allowedFields }
    )
    assert.include(
      nestedEmptyCount.errors.map(({ code }) => code),
      'FILTER_RANGE_INVALID'
    )
  })

  test('identifier, set, hierarchy, and traversal limits fail before oversized payload iteration', ({
    assert,
  }) => {
    const explosiveSet = ['a', 'b', 'c']
    Object.defineProperty(explosiveSet, 0, {
      get() {
        throw new Error('set values must not be traversed after the limit fails')
      },
    })
    const explosiveChildren = [condition(), condition({ field: 'b' }), condition({ field: 'c' })]
    Object.defineProperty(explosiveChildren, 0, {
      get() {
        throw new Error('children must not be traversed after the limit fails')
      },
    })
    const explosiveHierarchy = ['a', 'b', 'c']
    Object.defineProperty(explosiveHierarchy, 0, {
      get() {
        throw new Error('hierarchy terms must not be traversed after the limit fails')
      },
    })

    assert.doesNotThrow(() =>
      validateFilterExpression(condition({ value: { kind: 'set', values: explosiveSet } }), {
        limits: { maxSetValues: 2 },
      })
    )
    assert.doesNotThrow(() =>
      validateFilterExpression(
        { kind: 'group', combinator: 'and', children: explosiveChildren },
        { limits: { maxConditions: 2 } }
      )
    )
    assert.doesNotThrow(() =>
      validateFilterExpression(
        condition({
          field: 'category',
          operator: 'within_subtree',
          value: {
            kind: 'hierarchy',
            termIds: explosiveHierarchy,
            expansion: 'descendants',
          },
        }),
        { limits: { maxSetValues: 2 } }
      )
    )

    for (const expression of [
      condition({ field: 'x'.repeat(9) }),
      condition({ operator: 'x'.repeat(9) }),
      condition({
        field: 'category',
        operator: 'within_subtree',
        value: { kind: 'hierarchy', termIds: ['x'.repeat(9)], expansion: 'descendants' },
      }),
    ]) {
      const result = validateFilterExpression(expression, { limits: { maxTextLength: 8 } })
      assert.include(
        result.errors.map(({ code }) => code),
        'FILTER_TEXT_LIMIT_EXCEEDED'
      )
    }
  })
})
