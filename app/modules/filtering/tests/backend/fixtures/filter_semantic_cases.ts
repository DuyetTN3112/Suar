import type { FilterCondition, FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'

export function condition(overrides: Partial<FilterCondition> = {}): FilterCondition {
  return {
    kind: 'condition',
    field: 'skills',
    operator: 'contains_any',
    effect: 'require',
    value: { kind: 'set', values: ['typescript'] },
    unknown: 'exclude',
    ...overrides,
  }
}

export const canonicalEquivalenceCases: ReadonlyArray<{
  name: string
  left: FilterExpression
  right: FilterExpression
}> = [
  {
    name: 'exclude contains_any is require contains_none',
    left: condition({ effect: 'exclude', operator: 'contains_any' }),
    right: condition({ effect: 'require', operator: 'contains_none' }),
  },
  {
    name: 'exclude contains_none is require contains_any',
    left: condition({ effect: 'exclude', operator: 'contains_none' }),
    right: condition({ effect: 'require', operator: 'contains_any' }),
  },
  {
    name: 'required not_in is excluded in',
    left: condition({ effect: 'require', operator: 'not_in' }),
    right: condition({ effect: 'exclude', operator: 'in' }),
  },
]

export const idempotenceCases: ReadonlyArray<FilterExpression> = [
  condition({
    value: {
      kind: 'set',
      values: ['Vue', 'typescript', 'VUE', 'TypeScript', 'postgresql'],
    },
  }),
  {
    kind: 'group',
    combinator: 'and',
    children: [
      condition({ field: 'status', operator: 'in', value: { kind: 'set', values: ['open'] } }),
      condition({
        field: 'skills',
        value: { kind: 'set', values: ['redis', 'postgresql'] },
      }),
    ],
  },
  condition({
    field: 'category',
    operator: 'not_in',
    value: { kind: 'set', values: ['book', 'film'] },
  }),
]
