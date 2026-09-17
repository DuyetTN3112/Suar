import { test } from '@japa/runner'

import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import {
  compileElasticsearchFilter,
  type ElasticsearchSemanticBindings,
} from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_compiler'
import { compileElasticsearchPreferences } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_preference_compiler'

type Expression = NonNullable<QueryCriteriaRequest['filter']>

const bindings: ElasticsearchSemanticBindings = {
  tenant: { type: 'scalar', path: 'tenant' },
  status: { type: 'scalar', path: 'status' },
  skills: { type: 'multi_value', path: 'skills', cardinalityPath: 'skills_count' },
  score: { type: 'number', path: 'score' },
  createdAt: { type: 'date_time', path: 'created_at' },
  active: { type: 'boolean', path: 'active', presencePath: 'active_known' },
  category: { type: 'hierarchy', path: 'category_ids', ancestorPath: 'category_ancestor_ids' },
  applications: {
    type: 'relation',
    path: 'applications',
    relationBindings: {
      status: { type: 'scalar', path: 'applications.status' },
      score: { type: 'number', path: 'applications.score' },
    },
  },
}

function condition(
  field: string,
  operator: string,
  value?: Extract<Expression, { kind: 'condition' }>['value'],
  overrides: Partial<Extract<Expression, { kind: 'condition' }>> = {}
): Extract<Expression, { kind: 'condition' }> {
  return {
    kind: 'condition',
    field,
    operator,
    effect: 'require',
    unknown: 'exclude',
    ...(value === undefined ? {} : { value }),
    ...overrides,
  }
}

test.group('Elasticsearch Filter strict compiler', () => {
  test('keeps mandatory and user predicates in filter context with explicit unknown policy', ({
    assert,
  }) => {
    const query = compileElasticsearchFilter(
      {
        kind: 'group',
        combinator: 'and',
        children: [
          condition('tenant', 'eq', { kind: 'scalar', value: 'org-a' }),
          condition('status', 'neq', { kind: 'scalar', value: 'closed' }, { unknown: 'include' }),
        ],
      },
      bindings,
      new Date('2026-08-01T00:00:00.000Z')
    )
    const serialized = JSON.stringify(query)

    assert.include(serialized, 'org-a')
    assert.include(serialized, 'closed')
    assert.include(serialized, 'must_not')
    assert.include(serialized, 'exists')
    assert.notInclude(serialized, 'script_score')
  })

  test('uses safe terms_set semantics for All/At-least-N and cardinality for Exactly', ({
    assert,
  }) => {
    const cases = [
      condition('skills', 'contains_all', { kind: 'set', values: ['typescript', 'redis'] }),
      condition('skills', 'contains_at_least', {
        kind: 'set',
        values: ['typescript', 'redis', 'postgresql'],
        minimumMatch: 2,
      }),
      condition('skills', 'contains_exactly', {
        kind: 'set',
        values: ['typescript', 'redis'],
      }),
    ]
    const compiled = cases.map((item) =>
      compileElasticsearchFilter(item, bindings, new Date('2026-08-01T00:00:00.000Z'))
    )

    assert.include(JSON.stringify(compiled[0]), 'params.num_terms')
    assert.include(JSON.stringify(compiled[1]), 'params.minimum')
    assert.include(JSON.stringify(compiled[1]), '"minimum":2')
    assert.include(JSON.stringify(compiled[2]), 'skills_count')
  })

  test('compiles range/date/hierarchy and nested same-object relation predicates', ({ assert }) => {
    const expression: Expression = {
      kind: 'group',
      combinator: 'and',
      children: [
        condition('score', 'between', { kind: 'range', gte: 10, lt: 100 }),
        condition('createdAt', 'within_last', {
          kind: 'relative_time',
          amount: 2,
          unit: 'day',
          anchor: 'now',
        }),
        condition('category', 'within_subtree', {
          kind: 'hierarchy',
          termIds: ['media'],
          expansion: 'descendants',
        }),
        condition('applications', 'related_matches', {
          kind: 'relation',
          expression: condition('status', 'eq', { kind: 'scalar', value: 'accepted' }),
          count: { gte: 1 },
        }),
      ],
    }
    const serialized = JSON.stringify(
      compileElasticsearchFilter(expression, bindings, new Date('2026-08-01T00:00:00.000Z'))
    )

    assert.include(serialized, '2026-07-30T00:00:00.000Z')
    assert.include(serialized, 'category_ids')
    assert.include(serialized, 'category_ancestor_ids')
    assert.include(serialized, '"path":"applications"')
    assert.include(serialized, 'applications.status')
  })

  test('uses calendar month boundaries for relative time instead of fixed 30-day drift', ({
    assert,
  }) => {
    const query = compileElasticsearchFilter(
      condition('createdAt', 'within_last', {
        kind: 'relative_time',
        amount: 1,
        unit: 'month',
        anchor: 'now',
      }),
      bindings,
      new Date('2026-03-31T12:00:00.000Z')
    )

    assert.include(JSON.stringify(query), '2026-02-28T12:00:00.000Z')
  })

  test('distinguishes actual presence from explicit unknown-state markers', ({ assert }) => {
    const exists = compileElasticsearchFilter(
      condition('active', 'exists'),
      bindings,
      new Date('2026-08-01T00:00:00.000Z')
    )
    const missing = compileElasticsearchFilter(
      condition('active', 'missing'),
      bindings,
      new Date('2026-08-01T00:00:00.000Z')
    )
    const unknown = compileElasticsearchFilter(
      condition('active', 'is_unknown'),
      bindings,
      new Date('2026-08-01T00:00:00.000Z')
    )

    assert.deepEqual(exists, { exists: { field: 'active' } })
    assert.deepEqual(missing, { bool: { must_not: [{ exists: { field: 'active' } }] } })
    assert.deepEqual(unknown, {
      bool: { must_not: [{ exists: { field: 'active_known' } }] },
    })
  })

  test('rejects unknown fields/operators and relation shapes instead of dropping clauses', ({
    assert,
  }) => {
    for (const expression of [
      condition('secret.path', 'eq', { kind: 'scalar', value: 'x' }),
      condition('status', 'contains_any', { kind: 'set', values: ['open'] }),
      condition('applications', 'related_matches', {
        kind: 'relation',
        expression: condition('privateField', 'eq', { kind: 'scalar', value: 'x' }),
      }),
    ]) {
      const error = (() => {
        try {
          compileElasticsearchFilter(expression, bindings, new Date('2026-08-01T00:00:00.000Z'))
        } catch (caught) {
          return caught
        }
        return undefined
      })()
      assert.instanceOf(error, FilterExecutionError)
      assert.equal((error as FilterExecutionError).code, 'FILTER_EXECUTOR_CAPABILITY_MISMATCH')
    }
  })

  test('compiles bounded Prefer/Avoid separately and disables preference scoring for explicit sort', ({
    assert,
  }) => {
    const preferences: NonNullable<QueryCriteriaRequest['preferences']> = [
      {
        effect: 'prefer',
        weight: 50,
        expression: condition('skills', 'contains_any', {
          kind: 'set',
          values: ['typescript'],
        }),
      },
      {
        effect: 'avoid',
        weight: 2,
        expression: condition('status', 'eq', { kind: 'scalar', value: 'closed' }),
      },
    ]
    const baseQuery = compileElasticsearchFilter(
      condition('tenant', 'eq', { kind: 'scalar', value: 'org-a' }),
      bindings,
      new Date('2026-08-01T00:00:00.000Z')
    )
    const ranked = compileElasticsearchPreferences({
      baseQuery,
      preferences,
      bindings,
      now: new Date('2026-08-01T00:00:00.000Z'),
      explicitSort: false,
      minWeight: 0,
      maxWeight: 10,
      maxBoost: 20,
    })
    const sorted = compileElasticsearchPreferences({
      baseQuery,
      preferences,
      bindings,
      now: new Date('2026-08-01T00:00:00.000Z'),
      explicitSort: true,
      minWeight: 0,
      maxWeight: 10,
      maxBoost: 20,
    })

    assert.include(JSON.stringify(ranked), 'function_score')
    assert.include(JSON.stringify(ranked), '"weight":10')
    assert.include(JSON.stringify(ranked), '"weight":-2')
    assert.deepEqual(sorted, baseQuery)
  })

  test('penalizes matching Avoid documents and leaves unknown documents unscored', ({ assert }) => {
    const preference: NonNullable<QueryCriteriaRequest['preferences']>[number] = {
      effect: 'avoid',
      weight: 2,
      expression: condition('status', 'eq', { kind: 'scalar', value: 'closed' }),
    }

    const query = compileElasticsearchPreferences({
      baseQuery: { match_all: {} },
      preferences: [preference],
      bindings,
      now: new Date('2026-08-01T00:00:00.000Z'),
      explicitSort: false,
      minWeight: 0,
      maxWeight: 10,
      maxBoost: 20,
    })

    assert.deepEqual(query, {
      function_score: {
        query: { match_all: {} },
        functions: [
          {
            filter: {
              bool: {
                filter: [{ exists: { field: 'status' } }, { term: { status: 'closed' } }],
              },
            },
            weight: -2,
          },
        ],
        score_mode: 'sum',
        boost_mode: 'sum',
        max_boost: 20,
      },
    })
  })

  test('rejects non-finite preference weights before building an invalid query', ({ assert }) => {
    const preference: NonNullable<QueryCriteriaRequest['preferences']>[number] = {
      effect: 'prefer',
      weight: Number.NaN,
      expression: condition('status', 'eq', { kind: 'scalar', value: 'open' }),
    }

    let error: unknown
    try {
      compileElasticsearchPreferences({
        baseQuery: { match_all: {} },
        preferences: [preference],
        bindings,
        now: new Date('2026-08-01T00:00:00.000Z'),
        explicitSort: false,
        minWeight: 0,
        maxWeight: 10,
        maxBoost: 20,
      })
    } catch (caught) {
      error = caught
    }

    assert.instanceOf(error, FilterExecutionError)
    assert.equal((error as FilterExecutionError).code, 'FILTER_CRITERIA_INVALID')
  })

  test('rejects preference expressions that include unknown values', ({ assert }) => {
    const preference: NonNullable<QueryCriteriaRequest['preferences']>[number] = {
      effect: 'prefer',
      expression: condition(
        'status',
        'eq',
        { kind: 'scalar', value: 'open' },
        { unknown: 'include' }
      ),
    }

    let error: unknown
    try {
      compileElasticsearchPreferences({
        baseQuery: { match_all: {} },
        preferences: [preference],
        bindings,
        now: new Date('2026-08-01T00:00:00.000Z'),
        explicitSort: false,
        minWeight: 0,
        maxWeight: 10,
        maxBoost: 20,
      })
    } catch (caught) {
      error = caught
    }

    assert.instanceOf(error, FilterExecutionError)
    assert.equal((error as FilterExecutionError).code, 'FILTER_CRITERIA_INVALID')
  })

  test('allows explicit is_unknown preferences when unknown policy is exclude', ({ assert }) => {
    const preference: NonNullable<QueryCriteriaRequest['preferences']>[number] = {
      effect: 'prefer',
      expression: condition('active', 'is_unknown'),
    }

    const query = compileElasticsearchPreferences({
      baseQuery: { match_all: {} },
      preferences: [preference],
      bindings,
      now: new Date('2026-08-01T00:00:00.000Z'),
      explicitSort: false,
      minWeight: 0,
      maxWeight: 10,
      maxBoost: 20,
    })

    assert.include(JSON.stringify(query), 'active_known')
  })

  test('bounds the aggregate Avoid penalty by maxBoost', ({ assert }) => {
    const preferences: NonNullable<QueryCriteriaRequest['preferences']> = [
      { effect: 'avoid', weight: 20, expression: condition('status', 'eq', { kind: 'scalar', value: 'closed' }) },
      { effect: 'avoid', weight: 20, expression: condition('status', 'eq', { kind: 'scalar', value: 'pending' }) },
    ]

    const query = compileElasticsearchPreferences({
      baseQuery: { match_all: {} },
      preferences,
      bindings,
      now: new Date('2026-08-01T00:00:00.000Z'),
      explicitSort: false,
      minWeight: 0,
      maxWeight: 20,
      maxBoost: 10,
    }) as { function_score: { functions: Array<{ weight: number }> } }

    assert.equal(
      query.function_score.functions
        .filter(({ weight }) => weight < 0)
        .reduce((total, { weight }) => total + Math.abs(weight), 0),
      10
    )
  })

  test('rejects a maxBoost lower than the minimum preference weight', ({ assert }) => {
    let error: unknown
    try {
      compileElasticsearchPreferences({
        baseQuery: { match_all: {} },
        preferences: [{ effect: 'prefer', expression: condition('status', 'eq', { kind: 'scalar', value: 'open' }) }],
        bindings,
        now: new Date('2026-08-01T00:00:00.000Z'),
        explicitSort: false,
        minWeight: 10,
        maxWeight: 20,
        maxBoost: 5,
      })
    } catch (caught) {
      error = caught
    }

    assert.instanceOf(error, FilterExecutionError)
    assert.equal((error as FilterExecutionError).code, 'FILTER_CRITERIA_INVALID')
  })
})
