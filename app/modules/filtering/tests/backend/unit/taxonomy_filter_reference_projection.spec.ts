import { test } from '@japa/runner'

import { extractTaxonomyFilterReferences } from '#modules/filtering/domain/filtering-core/taxonomy_filter_reference_projection'

test.group('Unit | Taxonomy filter reference projection', () => {
  test('projects only canonical references from filter values and keeps field scope', ({ assert }) => {
    const references = extractTaxonomyFilterReferences({
      filter: {
        kind: 'group',
        combinator: 'and',
        negated: false,
        children: [
          {
            kind: 'condition',
            field: 'skill',
            operator: 'in',
            effect: 'require',
            unknown: 'exclude',
            value: {
              kind: 'set',
              values: ['skills:old', 'skills:old', 'skills:stable'],
              minimumMatch: 1,
            },
          },
          {
            kind: 'condition',
            field: 'domain',
            operator: 'eq',
            effect: 'require',
            unknown: 'exclude',
            value: { kind: 'scalar', value: 'domains:platform' },
          },
        ],
      },
      textQuery: 'skills:must-not-be-indexed',
      sort: [],
      projection: [],
    })

    assert.deepEqual(references, [
      { fieldKey: 'domain', namespace: 'domains', termId: 'platform' },
      { fieldKey: 'skill', namespace: 'skills', termId: 'old' },
      { fieldKey: 'skill', namespace: 'skills', termId: 'stable' },
    ])
  })

  test('projects nested relation expressions without treating arbitrary text as a reference', ({ assert }) => {
    const references = extractTaxonomyFilterReferences({
      filter: {
        kind: 'condition',
        field: 'skills',
        operator: 'related_matches',
        effect: 'require',
        unknown: 'exclude',
        value: {
          kind: 'relation',
          expression: {
            kind: 'condition',
            field: 'skill',
            operator: 'eq',
            effect: 'require',
            unknown: 'exclude',
            value: { kind: 'scalar', value: 'skills:typescript' },
          },
          count: { gte: 1 },
        },
      },
      textQuery: null,
      sort: [],
      projection: [],
    })

    assert.deepEqual(references, [
      { fieldKey: 'skill', namespace: 'skills', termId: 'typescript' },
    ])
  })
})
