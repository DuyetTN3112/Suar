import { describe, expect, it } from 'vitest'

import { serializeQualifierPreview } from '../../qualifiers/filter_qualifier_codec'

describe('frontend qualifier visual projection', () => {
  it('serializes representable strict criteria without creating a second AST', () => {
    const result = serializeQualifierPreview({
      kind: 'group',
      combinator: 'and',
      children: [
        {
          kind: 'condition',
          field: 'status',
          operator: 'eq',
          effect: 'require',
          unknown: 'exclude',
          value: { kind: 'scalar', value: 'in_progress' },
        },
        {
          kind: 'condition',
          field: 'skills',
          operator: 'contains_any',
          effect: 'require',
          unknown: 'exclude',
          value: { kind: 'set', values: ['typescript', 'postgresql'] },
        },
      ],
    })

    expect(result.text).toBe('skills:(postgresql OR typescript) status:in_progress')
    expect(result.chips).toEqual([])
  })

  it('preserves unsupported relation, preference, and unknown-policy state as chips', () => {
    const result = serializeQualifierPreview(
      {
        kind: 'condition',
        field: 'applications',
        operator: 'related_matches',
        effect: 'require',
        unknown: 'include',
        value: {
          kind: 'relation',
          expression: {
            kind: 'condition',
            field: 'status',
            operator: 'eq',
            effect: 'require',
            unknown: 'exclude',
            value: { kind: 'scalar', value: 'open' },
          },
        },
      },
      [
        {
          effect: 'prefer',
          expression: {
            kind: 'condition',
            field: 'trust',
            operator: 'gte',
            effect: 'require',
            unknown: 'exclude',
            value: { kind: 'scalar', value: 70 },
          },
          weight: 0.5,
        },
      ]
    )

    expect(result.text).toBe('')
    expect(result.chips).toEqual([
      { kind: 'unknown_policy', field: 'applications' },
      { kind: 'unsupported_relation', field: 'applications' },
      { kind: 'preference', index: 0 },
    ])
  })
})
