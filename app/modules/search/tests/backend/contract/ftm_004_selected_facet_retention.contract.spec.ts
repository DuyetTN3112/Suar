import { test } from '@japa/runner'

import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import {
  compileElasticsearchFacets,
  parseElasticsearchFacetResponse,
} from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_facet_compiler'
import type { ElasticsearchSemanticBindings } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_compiler'

type Expression = NonNullable<QueryCriteriaRequest['filter']>

const bindings: ElasticsearchSemanticBindings = {
  skills: {
    type: 'multi_value',
    path: 'skills',
    cardinalityPath: 'skills_count',
    facetable: true,
  },
}

function selectedSkill(value: string): Extract<Expression, { kind: 'condition' }> {
  return {
    kind: 'condition',
    field: 'skills',
    operator: 'contains_any',
    effect: 'require',
    unknown: 'exclude',
    value: { kind: 'set', values: [value] },
  }
}

test.group('FTM-004 | selected facet retention', () => {
  test('retains a selected value omitted from the current bucket page with zero count', ({
    assert,
  }) => {
    const selected = 'selected-only'
    const compiled = compileElasticsearchFacets({
      requests: [{ field: 'skills', countMode: 'constrained', valueSearch: 'other' }],
      userFilter: selectedSkill(selected),
      bindings,
      now: new Date('2026-08-10T00:00:00.000Z'),
      maxValues: 1,
    })

    const [facet] = parseElasticsearchFacetResponse(compiled.plans, {
      facet_0: {
        scope: {
          values: {
            buckets: [{ key: { value: 'other' }, doc_count: 4 }],
            after_key: { value: 'other' },
          },
        },
      },
    })

    assert.deepInclude(facet?.values ?? [], {
      value: selected,
      count: 0,
      countRelation: 'exact',
      selected: true,
    })
    assert.equal(
      (facet?.values ?? []).filter(({ value }) => value === selected).length,
      1
    )
    assert.isString(facet?.nextCursor)
  })
})
