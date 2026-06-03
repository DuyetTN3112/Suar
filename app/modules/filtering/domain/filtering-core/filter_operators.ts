import type { FilterScalar, FilterValue } from '#modules/filtering/domain/filtering-core/filter_expression'
import type { FilterTruth } from '#modules/filtering/domain/filtering-core/filter_truth'

export type FilterFieldType =
  | 'scalar'
  | 'multi_value'
  | 'number'
  | 'date_time'
  | 'text'
  | 'hierarchy'
  | 'relation'
  | 'boolean'

export const FILTER_OPERATORS_BY_FIELD_TYPE: Readonly<Record<FilterFieldType, readonly string[]>> =
  {
    scalar: ['eq', 'neq', 'in', 'not_in', 'exists', 'missing'],
    multi_value: [
      'contains_any',
      'contains_all',
      'contains_none',
      'contains_exactly',
      'contains_at_least',
      'is_empty',
    ],
    number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'outside'],
    date_time: ['before', 'after', 'between', 'within_last', 'within_next', 'overdue'],
    text: ['exact', 'contains', 'prefix'],
    hierarchy: ['is', 'is_any', 'within_subtree', 'has_ancestor'],
    relation: ['related_exists', 'related_missing', 'related_count', 'related_matches'],
    boolean: ['is_true', 'is_false', 'is_unknown'],
  }

export const FILTER_OPERATORS = new Set<string>(
  Object.values(FILTER_OPERATORS_BY_FIELD_TYPE).flat()
)

export function canonicalFilterString(value: string): string {
  return value.trim().normalize('NFKC').toLocaleLowerCase('en-US')
}

export function canonicalFilterScalarIdentity(value: FilterScalar): string {
  if (typeof value === 'string') {
    return `string:${canonicalFilterString(value)}`
  }

  return `${typeof value}:${String(value)}`
}

export function canonicalizeFilterScalar(value: FilterScalar): FilterScalar {
  return value
}

export function canonicalizeFilterScalarSet(values: readonly FilterScalar[]): FilterScalar[] {
  const unique = new Map<string, FilterScalar>()

  for (const value of values) {
    const canonical = typeof value === 'string' ? canonicalFilterString(value) : value
    unique.set(canonicalFilterScalarIdentity(canonical), canonical)
  }

  return [...unique.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([, value]) => value)
}

export type FilterSetOperator =
  | 'contains_any'
  | 'contains_all'
  | 'contains_none'
  | 'contains_exactly'
  | 'contains_at_least'
  | 'is_empty'

export function evaluateSetOperator(
  operator: FilterSetOperator,
  entityValues: readonly FilterScalar[] | undefined,
  selectedValues: readonly FilterScalar[],
  minimumMatch?: number
): FilterTruth {
  if (entityValues === undefined) {
    return 'unknown'
  }

  const entity = new Set(
    canonicalizeFilterScalarSet(entityValues).map(canonicalFilterScalarIdentity)
  )
  const selected = canonicalizeFilterScalarSet(selectedValues).map(canonicalFilterScalarIdentity)
  const matched = selected.reduce((count, value) => count + (entity.has(value) ? 1 : 0), 0)

  switch (operator) {
    case 'contains_any':
      return matched >= 1 ? 'true' : 'false'
    case 'contains_all':
      return matched === selected.length ? 'true' : 'false'
    case 'contains_none':
      return matched === 0 ? 'true' : 'false'
    case 'contains_exactly':
      return matched === selected.length && entity.size === selected.length ? 'true' : 'false'
    case 'contains_at_least':
      return minimumMatch !== undefined && matched >= minimumMatch ? 'true' : 'false'
    case 'is_empty':
      return entity.size === 0 ? 'true' : 'false'
  }
}

export interface ResolvedRelativeTimeRange {
  gte: string
  lte: string
}

function addUtcMonthsClamped(date: Date, amount: number): Date {
  const result = new Date(date.getTime())
  const originalDay = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + amount)
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate()
  result.setUTCDate(Math.min(originalDay, lastDay))
  return result
}

function shiftRelativeTime(
  date: Date,
  amount: number,
  unit: Extract<FilterValue, { kind: 'relative_time' }>['unit']
): Date {
  if (unit === 'month') {
    return addUtcMonthsClamped(date, amount)
  }

  const milliseconds = {
    minute: 60_000,
    hour: 3_600_000,
    day: 86_400_000,
    week: 604_800_000,
  }[unit]
  return new Date(date.getTime() + amount * milliseconds)
}

export function resolveRelativeTimeRange(
  value: Extract<FilterValue, { kind: 'relative_time' }>,
  operator: 'within_last' | 'within_next',
  now: Date
): ResolvedRelativeTimeRange {
  const direction = operator === 'within_last' ? -1 : 1
  const shifted = shiftRelativeTime(now, direction * value.amount, value.unit)
  const lower = operator === 'within_last' ? shifted : now
  const upper = operator === 'within_last' ? now : shifted

  return { gte: lower.toISOString(), lte: upper.toISOString() }
}
