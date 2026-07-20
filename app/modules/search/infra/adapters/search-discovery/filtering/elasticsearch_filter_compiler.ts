import type { estypes } from '@elastic/elasticsearch'

import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'

type FilterExpression = NonNullable<QueryCriteriaRequest['filter']>
type FilterCondition = Extract<FilterExpression, { kind: 'condition' }>
type FilterScalar = string | number | boolean

export type ElasticsearchSemanticBindingType =
  | 'scalar'
  | 'multi_value'
  | 'number'
  | 'date_time'
  | 'hierarchy'
  | 'relation'
  | 'boolean'
  | 'text'

export interface ElasticsearchSemanticBinding {
  readonly type: ElasticsearchSemanticBindingType
  readonly path: string
  readonly presencePath?: string
  readonly cardinalityPath?: string
  readonly ancestorPath?: string
  readonly facetable?: boolean
  readonly sortable?: boolean
  readonly exposeMissingCount?: boolean
  readonly exposeCoverage?: boolean
  readonly relationBindings?: ElasticsearchSemanticBindings
}

export type ElasticsearchSemanticBindings = Readonly<Record<string, ElasticsearchSemanticBinding>>

const OPERATORS: Readonly<Record<ElasticsearchSemanticBindingType, ReadonlySet<string>>> = {
  scalar: new Set(['eq', 'neq', 'in', 'not_in', 'exists', 'missing', 'is_unknown']),
  multi_value: new Set([
    'contains_any',
    'contains_all',
    'contains_none',
    'contains_exactly',
    'contains_at_least',
    'is_empty',
    'exists',
    'missing',
    'is_unknown',
  ]),
  number: new Set([
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'between',
    'outside',
    'exists',
    'missing',
    'is_unknown',
  ]),
  date_time: new Set([
    'before',
    'after',
    'between',
    'within_last',
    'within_next',
    'overdue',
    'exists',
    'missing',
    'is_unknown',
  ]),
  hierarchy: new Set([
    'is',
    'is_any',
    'within_subtree',
    'has_ancestor',
    'exists',
    'missing',
    'is_unknown',
  ]),
  relation: new Set([
    'related_exists',
    'related_missing',
    'related_count',
    'related_matches',
    'exists',
    'missing',
    'is_unknown',
  ]),
  boolean: new Set(['eq', 'neq', 'is_true', 'is_false', 'exists', 'missing', 'is_unknown']),
  text: new Set(['exact', 'contains', 'prefix', 'exists', 'missing', 'is_unknown']),
}

export function elasticsearchOperatorsForBindings(
  bindings: ElasticsearchSemanticBindings
): Readonly<Record<string, readonly string[]>> {
  return Object.fromEntries(
    Object.entries(bindings).map(([field, binding]) => [field, [...OPERATORS[binding.type]]])
  )
}

export function compileElasticsearchFilter(
  expression: FilterExpression,
  bindings: ElasticsearchSemanticBindings,
  now: Date
): estypes.QueryDslQueryContainer {
  if (!Number.isFinite(now.getTime())) criteriaError()
  return compileExpression(expression, bindings, now)
}

function compileExpression(
  expression: FilterExpression,
  bindings: ElasticsearchSemanticBindings,
  now: Date
): estypes.QueryDslQueryContainer {
  if (expression.kind === 'condition') return compileCondition(expression, bindings, now)
  if (expression.children.length === 0) criteriaError()

  const children = expression.children.map((child) => compileExpression(child, bindings, now))
  const combined: estypes.QueryDslQueryContainer =
    expression.combinator === 'and'
      ? { bool: { filter: children } }
      : { bool: { should: children, minimum_should_match: 1 } }

  return expression.negated ? { bool: { must_not: [combined] } } : combined
}

function compileCondition(
  condition: FilterCondition,
  bindings: ElasticsearchSemanticBindings,
  now: Date
): estypes.QueryDslQueryContainer {
  const binding = bindings[condition.field]
  if (binding === undefined || !OPERATORS[binding.type].has(condition.operator)) capabilityError()

  const actualExists: estypes.QueryDslQueryContainer = { exists: { field: binding.path } }
  const known: estypes.QueryDslQueryContainer = {
    exists: { field: binding.presencePath ?? binding.path },
  }
  if (condition.operator === 'exists') return applyEffect(actualExists, condition.effect)
  if (condition.operator === 'missing') {
    return applyEffect({ bool: { must_not: [actualExists] } }, condition.effect)
  }
  if (condition.operator === 'is_unknown') {
    return applyEffect({ bool: { must_not: [known] } }, condition.effect)
  }

  const predicate = compileKnownPredicate(condition, binding, now)
  const effected = applyEffect(predicate, condition.effect)
  return condition.unknown === 'include'
    ? { bool: { should: [{ bool: { must_not: [known] } }, effected], minimum_should_match: 1 } }
    : { bool: { filter: [known, effected] } }
}

function compileKnownPredicate(
  condition: FilterCondition,
  binding: ElasticsearchSemanticBinding,
  now: Date
): estypes.QueryDslQueryContainer {
  switch (binding.type) {
    case 'scalar':
      return compileScalar(condition, binding.path)
    case 'multi_value':
      return compileMultiValue(condition, binding)
    case 'number':
      return compileNumber(condition, binding.path)
    case 'date_time':
      return compileDateTime(condition, binding.path, now)
    case 'hierarchy':
      return compileHierarchy(condition, binding)
    case 'relation':
      return compileRelation(condition, binding, now)
    case 'boolean':
      return compileBoolean(condition, binding.path)
    case 'text':
      return compileText(condition, binding.path)
  }
}

function compileScalar(condition: FilterCondition, path: string): estypes.QueryDslQueryContainer {
  const values = scalarValues(condition)
  const positive: estypes.QueryDslQueryContainer =
    values.length === 1 ? { term: { [path]: values[0] } } : { terms: { [path]: values } }
  return condition.operator === 'neq' || condition.operator === 'not_in'
    ? { bool: { must_not: [positive] } }
    : positive
}

function compileMultiValue(
  condition: FilterCondition,
  binding: ElasticsearchSemanticBinding
): estypes.QueryDslQueryContainer {
  if (condition.operator === 'is_empty') {
    if (binding.cardinalityPath === undefined) capabilityError()
    return { term: { [binding.cardinalityPath]: 0 } }
  }
  const values = setValues(condition)
  const terms: estypes.QueryDslQueryContainer = { terms: { [binding.path]: values } }
  if (condition.operator === 'contains_any') return terms
  if (condition.operator === 'contains_none') return { bool: { must_not: [terms] } }

  const minimum =
    condition.operator === 'contains_at_least'
      ? condition.value?.kind === 'set'
        ? condition.value.minimumMatch
        : undefined
      : values.length
  if (
    !Number.isInteger(minimum) ||
    minimum === undefined ||
    minimum < 1 ||
    minimum > values.length
  ) {
    criteriaError()
  }
  const all: estypes.QueryDslQueryContainer = {
    terms_set: {
      [binding.path]: {
        // The generated client type narrows terms_set to string[], but the filter contract
        // intentionally preserves Boolean and numeric scalar identity at runtime.
        terms: values as unknown as string[],
        minimum_should_match_script:
          condition.operator === 'contains_at_least'
            ? { source: 'params.minimum', params: { minimum } }
            : { source: 'params.num_terms' },
      },
    },
  }
  if (condition.operator !== 'contains_exactly') return all
  if (binding.cardinalityPath === undefined) capabilityError()
  return { bool: { filter: [all, { term: { [binding.cardinalityPath]: values.length } }] } }
}

function compileNumber(condition: FilterCondition, path: string): estypes.QueryDslQueryContainer {
  if (condition.operator === 'eq' || condition.operator === 'neq') {
    return compileScalar(condition, path)
  }
  if (['gt', 'gte', 'lt', 'lte'].includes(condition.operator)) {
    const value = scalarValue(condition)
    if (typeof value !== 'number') criteriaError()
    return { range: { [path]: { [condition.operator]: value } } }
  }
  const range = rangeValue(condition)
  const query: estypes.QueryDslQueryContainer = { range: { [path]: range } }
  return condition.operator === 'outside' ? { bool: { must_not: [query] } } : query
}

function compileDateTime(
  condition: FilterCondition,
  path: string,
  now: Date
): estypes.QueryDslQueryContainer {
  if (condition.operator === 'before' || condition.operator === 'after') {
    const value = scalarValue(condition)
    if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) criteriaError()
    return { range: { [path]: { [condition.operator === 'before' ? 'lt' : 'gt']: value } } }
  }
  if (condition.operator === 'overdue') return { range: { [path]: { lt: now.toISOString() } } }
  if (condition.operator === 'within_last' || condition.operator === 'within_next') {
    if (condition.value?.kind !== 'relative_time') criteriaError()
    const direction = condition.operator === 'within_last' ? -1 : 1
    const boundary = relativeTimeBoundary(
      now,
      condition.value.amount,
      condition.value.unit,
      direction
    )
    const range =
      condition.operator === 'within_last'
        ? { gte: boundary.toISOString(), lte: now.toISOString() }
        : { gte: now.toISOString(), lte: boundary.toISOString() }
    return { range: { [path]: range } }
  }
  return { range: { [path]: rangeValue(condition, true) } }
}

function compileHierarchy(
  condition: FilterCondition,
  binding: ElasticsearchSemanticBinding
): estypes.QueryDslQueryContainer {
  if (condition.value?.kind !== 'hierarchy' || condition.value.termIds.length === 0) criteriaError()
  const values = deduplicate(condition.value.termIds)
  const path =
    condition.operator === 'within_subtree' || condition.operator === 'has_ancestor'
      ? binding.ancestorPath
      : binding.path
  if (path === undefined) capabilityError()
  if (condition.operator === 'is') {
    if (binding.cardinalityPath === undefined) capabilityError()
    return {
      bool: {
        filter: [
          {
            terms_set: {
              [path]: {
                terms: values,
                minimum_should_match_script: { source: 'params.num_terms' },
              },
            },
          },
          { term: { [binding.cardinalityPath]: values.length } },
        ],
      },
    }
  }
  if (condition.operator === 'within_subtree') {
    return {
      bool: {
        should: [{ terms: { [binding.path]: values } }, { terms: { [path]: values } }],
        minimum_should_match: 1,
      },
    }
  }
  return { terms: { [path]: values } }
}

function compileRelation(
  condition: FilterCondition,
  binding: ElasticsearchSemanticBinding,
  now: Date
): estypes.QueryDslQueryContainer {
  const exists: estypes.QueryDslQueryContainer = {
    nested: { path: binding.path, query: { match_all: {} }, score_mode: 'none' },
  }
  if (condition.operator === 'related_exists') return exists
  if (condition.operator === 'related_missing') return { bool: { must_not: [exists] } }
  if (condition.operator === 'related_count') {
    if (binding.cardinalityPath === undefined) capabilityError()
    return compileNumber(condition, binding.cardinalityPath)
  }
  if (condition.value?.kind !== 'relation' || binding.relationBindings === undefined) {
    capabilityError()
  }
  const bounds = condition.value.count
  if (bounds?.lte !== undefined || (bounds?.gte !== undefined && bounds.gte > 1)) capabilityError()
  return {
    nested: {
      path: binding.path,
      query: compileExpression(condition.value.expression, binding.relationBindings, now),
      score_mode: 'none',
    },
  }
}

function compileBoolean(condition: FilterCondition, path: string): estypes.QueryDslQueryContainer {
  const target =
    condition.operator === 'is_true'
      ? true
      : condition.operator === 'is_false'
        ? false
        : scalarValue(condition)
  if (typeof target !== 'boolean') criteriaError()
  const query: estypes.QueryDslQueryContainer = { term: { [path]: target } }
  return condition.operator === 'neq' ? { bool: { must_not: [query] } } : query
}

function compileText(condition: FilterCondition, path: string): estypes.QueryDslQueryContainer {
  const value = scalarValue(condition)
  if (typeof value !== 'string' || value.length === 0) criteriaError()
  if (condition.operator === 'exact') return { term: { [path]: value } }
  if (condition.operator === 'prefix') return { prefix: { [path]: { value } } }
  return { match_phrase: { [path]: value } }
}

function applyEffect(
  query: estypes.QueryDslQueryContainer,
  effect: 'require' | 'exclude'
): estypes.QueryDslQueryContainer {
  return effect === 'exclude' ? { bool: { must_not: [query] } } : query
}

function scalarValue(condition: FilterCondition): FilterScalar {
  if (condition.value?.kind !== 'scalar') criteriaError()
  return condition.value.value
}

function scalarValues(condition: FilterCondition): FilterScalar[] {
  if (condition.operator === 'in' || condition.operator === 'not_in') return setValues(condition)
  return [scalarValue(condition)]
}

function setValues(condition: FilterCondition): FilterScalar[] {
  if (condition.value?.kind !== 'set' || condition.value.values.length === 0) criteriaError()
  return deduplicate(condition.value.values)
}

function rangeValue(
  condition: FilterCondition,
  datesOnly = false
): Readonly<Record<string, FilterScalar>> {
  if (condition.value?.kind !== 'range') criteriaError()
  const entries = Object.entries(condition.value).filter(([key]) => key !== 'kind')
  if (entries.length === 0) criteriaError()
  for (const [, value] of entries) {
    if (datesOnly) {
      if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) criteriaError()
    } else if (typeof value !== 'number') criteriaError()
  }
  return Object.fromEntries(entries)
}

function relativeTimeBoundary(now: Date, amount: number, unit: string, direction: -1 | 1): Date {
  if (!Number.isSafeInteger(amount) || amount < 1) criteriaError()
  if (unit === 'month') {
    const shifted = new Date(now)
    const originalDay = shifted.getUTCDate()
    shifted.setUTCDate(1)
    shifted.setUTCMonth(shifted.getUTCMonth() + direction * amount)
    const lastDay = new Date(
      Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0)
    ).getUTCDate()
    shifted.setUTCDate(Math.min(originalDay, lastDay))
    return shifted
  }
  const multiplier = {
    minute: 60_000,
    hour: 3_600_000,
    day: 86_400_000,
    week: 604_800_000,
  }[unit]
  if (multiplier === undefined) criteriaError()
  return new Date(now.getTime() + direction * amount * multiplier)
}

function deduplicate<T extends FilterScalar>(values: readonly T[]): T[] {
  return [
    ...new Map(
      values.map((value) => [`${typeof value}:${String(value).toLocaleLowerCase()}`, value])
    ).values(),
  ]
}

function capabilityError(): never {
  throw new FilterExecutionError('FILTER_EXECUTOR_CAPABILITY_MISMATCH')
}

function criteriaError(): never {
  throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
}
