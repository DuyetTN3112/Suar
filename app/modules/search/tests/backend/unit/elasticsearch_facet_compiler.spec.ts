import { test } from '@japa/runner'

import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import {
  compileElasticsearchFacets,
  parseElasticsearchFacetResponse,
} from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_facet_compiler'
import type { ElasticsearchSemanticBindings } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_compiler'

type Expression = NonNullable<QueryCriteriaRequest['filter']>

const bindings: ElasticsearchSemanticBindings = {
  tenant: { type: 'scalar', path: 'tenant' },
  status: { type: 'scalar', path: 'status', facetable: true },
  availableAt: { type: 'date_time', path: 'available_at', facetable: true },
  skills: {
    type: 'multi_value',
    path: 'skills',
    cardinalityPath: 'skills_count',
    facetable: true,
    exposeMissingCount: true,
    exposeCoverage: true,
  },
}

function condition(field: string, value: string): Extract<Expression, { kind: 'condition' }> {
  return {
    kind: 'condition',
    field,
    operator: field === 'skills' ? 'contains_any' : 'eq',
    effect: 'require',
    unknown: 'exclude',
    value: field === 'skills' ? { kind: 'set', values: [value] } : { kind: 'scalar', value },
  }
}

test.group('Elasticsearch facet compiler', () => {
  test('keeps mandatory scope for constrained and root-AND self-excluding facets', ({ assert }) => {
    const mandatory = condition('tenant', 'org-a')
    const user: Expression = {
      kind: 'group',
      combinator: 'and',
      children: [condition('status', 'open'), condition('skills', 'redis')],
    }
    const compiled = compileElasticsearchFacets({
      requests: [
        { field: 'skills', countMode: 'constrained' },
        { field: 'skills', countMode: 'self_excluding' },
      ],
      mandatoryFilter: mandatory,
      userFilter: user,
      bindings,
      now: new Date('2026-08-01T00:00:00.000Z'),
      maxValues: 100,
    })
    const serialized = JSON.stringify(compiled.plans)

    assert.include(serialized, 'org-a')
    assert.include(serialized, 'open')
    assert.include(serialized, 'redis')
    assert.include(serialized, 'composite')
    assert.lengthOf(compiled.plans, 2)
  })

  test('extracts a direct OR child only when every clause belongs to the requested facet', ({
    assert,
  }) => {
    const user: Expression = {
      kind: 'group',
      combinator: 'and',
      children: [
        condition('status', 'open'),
        {
          kind: 'group',
          combinator: 'or',
          children: [condition('skills', 'redis'), condition('skills', 'typescript')],
        },
      ],
    }
    const compiled = compileElasticsearchFacets({
      requests: [{ field: 'skills', countMode: 'self_excluding' }],
      userFilter: user,
      bindings,
      now: new Date('2026-08-01T00:00:00.000Z'),
      maxValues: 100,
    })
    const query = JSON.stringify(compiled.plans[0]?.query)

    assert.include(query, 'open')
    assert.notInclude(query, 'redis')
    assert.notInclude(query, 'typescript')
  })

  test('rejects non-extractable self-exclusion and unbound facet fields', ({ assert }) => {
    const user: Expression = {
      kind: 'group',
      combinator: 'or',
      children: [condition('status', 'open'), condition('skills', 'redis')],
    }
    for (const field of ['skills', 'secret']) {
      const error = (() => {
        try {
          compileElasticsearchFacets({
            requests: [{ field, countMode: 'self_excluding' }],
            userFilter: user,
            bindings,
            now: new Date('2026-08-01T00:00:00.000Z'),
            maxValues: 100,
          })
        } catch (caught) {
          return caught
        }
        return undefined
      })()
      assert.instanceOf(error, FilterExecutionError)
      assert.equal((error as FilterExecutionError).code, 'FILTER_EXECUTOR_CAPABILITY_MISMATCH')
    }

    const nested: Expression = {
      kind: 'group',
      combinator: 'and',
      children: [
        condition('status', 'open'),
        {
          kind: 'group',
          combinator: 'or',
          children: [condition('skills', 'redis'), condition('status', 'closed')],
        },
      ],
    }
    assert.throws(
      () =>
        compileElasticsearchFacets({
          requests: [{ field: 'skills', countMode: 'self_excluding' }],
          userFilter: nested,
          bindings,
          now: new Date('2026-08-01T00:00:00.000Z'),
          maxValues: 100,
        }),
      FilterExecutionError
    )
  })

  test('retains selected zero, reports missing/coverage, and emits opaque next cursor metadata', ({
    assert,
  }) => {
    const compiled = compileElasticsearchFacets({
      requests: [{ field: 'skills', countMode: 'constrained', valueSearch: 'type' }],
      userFilter: condition('skills', 'typescript'),
      bindings,
      now: new Date('2026-08-01T00:00:00.000Z'),
      maxValues: 2,
    })
    const facets = parseElasticsearchFacetResponse(compiled.plans, {
      facet_0: {
        scope: {
          doc_count: 8,
          values: {
            buckets: [{ key: { value: 'rust' }, doc_count: 3 }],
            after_key: { value: 'rust' },
          },
          missing: { doc_count: 4 },
          known: { doc_count: 6 },
          coverage: { value: 0.75 },
        },
      },
    })

    assert.deepInclude(facets[0]?.values ?? [], {
      value: 'typescript',
      count: 0,
      countRelation: 'exact',
      selected: true,
    })
    assert.isString(facets[0]?.nextCursor)
    assert.notInclude(facets[0]?.nextCursor ?? '', 'rust')
    assert.deepEqual(compiled.plans[0]?.truth, { missing: true, coverage: true })
    assert.deepEqual(facets[0]?.truth, {
      missing: { value: 2, countRelation: 'exact' },
      coverage: { known: 6, total: 8, ratio: 0.75, countRelation: 'exact' },
    })

    const cursor = facets[0]?.nextCursor
    if (cursor === undefined) throw new Error('Expected facet cursor')
    const tampered = `${cursor.slice(0, -1)}!`
    assert.throws(
      () =>
        compileElasticsearchFacets({
          requests: [{ field: 'skills', countMode: 'constrained', cursor: tampered }],
          bindings,
          now: new Date('2026-08-01T00:00:00.000Z'),
          maxValues: 2,
        }),
      FilterExecutionError
    )
  })

  test('normalizes numeric Elasticsearch date facet keys to canonical ISO values', ({ assert }) => {
    const compiled = compileElasticsearchFacets({
      requests: [{ field: 'availableAt', countMode: 'constrained' }],
      bindings,
      now: new Date('2026-08-01T00:00:00.000Z'),
      maxValues: 2,
    })
    const facets = parseElasticsearchFacetResponse(compiled.plans, {
      facet_0: {
        scope: {
          doc_count: 1,
          values: {
            buckets: [{ key: { value: 1789430400000 }, doc_count: 1 }],
            after_key: { value: 1789430400000 },
          },
        },
      },
    })

    assert.deepEqual(facets[0]?.values, [
      {
        value: '2026-09-15T00:00:00.000Z',
        count: 1,
        countRelation: 'exact',
        selected: false,
      },
    ])
    assert.isString(facets[0]?.nextCursor)
  })
})
