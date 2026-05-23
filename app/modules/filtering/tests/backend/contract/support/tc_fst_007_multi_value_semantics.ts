import type {
  FilterCondition,
  FilterExpression,
  FilterScalar,
} from '#modules/filtering/domain/filtering-core/filter_expression'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import {
  ReferenceFilterEvaluator,
  type ReferenceFilterRecord,
} from '#modules/filtering/tests/backend/contract/support/reference_filter_evaluator'

const missing = { kind: 'missing' } as const
const unknown = { kind: 'unknown' } as const
const hidden = { kind: 'hidden' } as const

export const TC_FST_007_POPULATION: readonly ReferenceFilterRecord[] = [
  {
    id: 'known-values',
    fields: { skills: ['typescript', false, 0] },
  },
  {
    id: 'known-empty',
    fields: { skills: [] },
  },
  {
    id: 'missing',
    fields: { skills: missing },
  },
  {
    id: 'unknown',
    fields: { skills: unknown },
  },
  {
    id: 'hidden',
    fields: { skills: hidden },
  },
]

export function tcFst007Condition(
  operator: string,
  values: readonly FilterScalar[] = [],
  unknownPolicy: 'include' | 'exclude' = 'exclude'
): FilterExpression {
  const condition: FilterCondition = {
    kind: 'condition',
    field: 'skills',
    operator,
    effect: 'require',
    unknown: unknownPolicy,
  }
  if (operator !== 'is_empty') {
    condition.value = { kind: 'set', values: [...values] }
  }
  return condition
}

export function tcFst007Criteria(filter: FilterExpression): QueryCriteriaRequest {
  return {
    context: 'filter.reference.conformance',
    schemaVersion: 1,
    filter,
    sort: [{ field: 'id', direction: 'asc' }],
    page: { size: 100 },
  }
}

export function tcFst007Evaluator(): ReferenceFilterEvaluator {
  return new ReferenceFilterEvaluator({
    records: TC_FST_007_POPULATION,
    profile: 'tc-fst-007.reference',
  })
}

export async function tcFst007FilterIds(
  filter: FilterExpression
): Promise<readonly string[]> {
  const evaluator = tcFst007Evaluator()
  const result = await evaluator.execute(
    evaluator.createConformanceInput({ criteria: tcFst007Criteria(filter) })
  )
  return result.hits.map(({ id }) => id).sort()
}
