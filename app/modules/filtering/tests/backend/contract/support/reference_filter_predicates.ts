import type {
  ReferenceFilterRecord,
  ReferenceFieldValue,
  ReferenceSpecialValue,
} from './reference_filter_types.js'

import type {
  FilterCondition,
  FilterExpression,
  FilterScalar,
} from '#modules/filtering/domain/filtering-core/filter_expression'
import {
  canonicalFilterScalarIdentity,
  canonicalFilterString,
  evaluateSetOperator,
  resolveRelativeTimeRange,
} from '#modules/filtering/domain/filtering-core/filter_operators'
import {
  evaluateFilterExpression,
  type FilterTruth,
} from '#modules/filtering/domain/filtering-core/filter_truth'


export interface ResolvedField {
  state: 'known' | 'unknown' | 'missing' | 'hidden'
  value?: Exclude<ReferenceFieldValue, ReferenceSpecialValue> | ReferenceSpecialValue
}

export interface SelfExcludingReduction {
  supported: boolean
  expression?: FilterExpression
}

export function evaluateReferenceExpression(
  expression: FilterExpression,
  record: ReferenceFilterRecord,
  now: Date
): boolean {
  return evaluateFilterExpression(expression, (condition) =>
    referencePredicate(condition, record, now)
  )
}

export function referencePredicate(
  condition: FilterCondition,
  record: ReferenceFilterRecord,
  now: Date
): FilterTruth {
  const resolved = resolveField(record, condition.field)
  const operator = condition.operator
  if (operator === 'exists') {
    if (resolved.state === 'unknown' || resolved.state === 'hidden') return 'unknown'
    return resolved.state === 'missing' ? 'false' : 'true'
  }
  if (operator === 'missing') {
    if (resolved.state === 'unknown' || resolved.state === 'hidden') return 'unknown'
    return resolved.state === 'missing' ? 'true' : 'false'
  }
  if (operator === 'is_unknown') {
    return resolved.state === 'unknown' || resolved.state === 'hidden' ? 'true' : 'false'
  }
  if (operator === 'related_exists' || operator === 'related_missing') {
    if (resolved.state === 'unknown' || resolved.state === 'hidden') return 'unknown'
    if (resolved.state === 'missing') return operator === 'related_missing' ? 'true' : 'false'
  }
  if (resolved.state !== 'known' || resolved.value === undefined) return 'unknown'

  if (operator.startsWith('contains_') || operator === 'is_empty') {
    if (!Array.isArray(resolved.value)) return 'unknown'
    const selected = condition.value?.kind === 'set' ? condition.value.values : []
    return evaluateSetOperator(
      operator as Parameters<typeof evaluateSetOperator>[0],
      resolved.value,
      selected,
      condition.value?.kind === 'set' ? condition.value.minimumMatch : undefined
    )
  }
  if (['eq', 'neq', 'in', 'not_in'].includes(operator)) {
    const actual = scalarValue(resolved.value)
    if (actual === undefined) return 'unknown'
    const selected =
      condition.value?.kind === 'set'
        ? condition.value.values
        : condition.value?.kind === 'scalar'
          ? [condition.value.value]
          : []
    const matches = selected.some(
      (value) => canonicalFilterScalarIdentity(value) === canonicalFilterScalarIdentity(actual)
    )
    return operator === 'neq' || operator === 'not_in'
      ? matches
        ? 'false'
        : 'true'
      : matches
        ? 'true'
        : 'false'
  }
  if (operator === 'between' && typeof scalarValue(resolved.value) === 'string') {
    return compareDatePredicate(operator, resolved.value, condition, now)
  }
  if (['gt', 'gte', 'lt', 'lte', 'between', 'outside'].includes(operator)) {
    return compareRangePredicate(operator, resolved.value, condition)
  }
  if (['before', 'after', 'between', 'within_last', 'within_next', 'overdue'].includes(operator)) {
    return compareDatePredicate(operator, resolved.value, condition, now)
  }
  if (['exact', 'contains', 'prefix'].includes(operator)) {
    const actual = scalarValue(resolved.value)
    const selected = condition.value?.kind === 'scalar' ? condition.value.value : undefined
    if (typeof actual !== 'string' || typeof selected !== 'string') return 'unknown'
    const haystack = canonicalFilterString(actual)
    const needle = canonicalFilterString(selected)
    const matches =
      operator === 'exact'
        ? haystack === needle
        : operator === 'contains'
          ? haystack.includes(needle)
          : haystack.startsWith(needle)
    return matches ? 'true' : 'false'
  }
  if (['is', 'is_any', 'within_subtree', 'has_ancestor'].includes(operator)) {
    return hierarchyPredicate(operator, resolved.value, condition)
  }
  if (operator === 'is_true' || operator === 'is_false') {
    const actual = scalarValue(resolved.value)
    if (typeof actual !== 'boolean') return 'unknown'
    return actual === (operator === 'is_true') ? 'true' : 'false'
  }
  if (operator.startsWith('related_')) {
    return relationPredicate(operator, resolved.value, condition, now)
  }
  return 'unknown'
}

export function resolveField(record: ReferenceFilterRecord, field: string): ResolvedField {
  if (field === 'id') return { state: 'known', value: record.id }
  if (!Object.hasOwn(record.fields, field)) return { state: 'unknown' }
  const value = record.fields[field]
  if (value === undefined) return { state: 'unknown' }
  if (isSpecialValue(value, 'unknown')) return { state: 'unknown' }
  if (isSpecialValue(value, 'missing')) return { state: 'missing' }
  if (isSpecialValue(value, 'hidden')) return { state: 'hidden' }
  return { state: 'known', value }
}

export function isSpecialValue(
  value: ReferenceFieldValue | undefined,
  kind: ReferenceSpecialValue['kind']
): boolean {
  return isSpecialObject(value) && value.kind === kind
}

export function isSpecialObject(value: unknown): value is ReferenceSpecialValue {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'kind' in value &&
    typeof value.kind === 'string'
  )
}

export function scalarValue(value: ResolvedField['value']): FilterScalar | undefined {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? value
    : undefined
}

export function compareRangePredicate(
  operator: string,
  actualValue: ResolvedField['value'],
  condition: FilterCondition
): FilterTruth {
  const actual = scalarValue(actualValue)
  if (typeof actual !== 'number') return 'unknown'
  if (condition.value?.kind === 'scalar' && typeof condition.value.value === 'number') {
    const selected = condition.value.value
    const matches = {
      gt: actual > selected,
      gte: actual >= selected,
      lt: actual < selected,
      lte: actual <= selected,
    }[operator]
    return matches ? 'true' : 'false'
  }
  if (condition.value?.kind !== 'range') return 'unknown'
  const lower = condition.value.gte ?? condition.value.gt
  const upper = condition.value.lte ?? condition.value.lt
  if (
    (lower !== undefined && typeof lower !== 'number') ||
    (upper !== undefined && typeof upper !== 'number')
  ) {
    return 'unknown'
  }
  const withinLower =
    lower === undefined || (condition.value.gte !== undefined ? actual >= lower : actual > lower)
  const withinUpper =
    upper === undefined || (condition.value.lte !== undefined ? actual <= upper : actual < upper)
  const within = withinLower && withinUpper
  return operator === 'outside' ? (within ? 'false' : 'true') : within ? 'true' : 'false'
}

export function compareDatePredicate(
  operator: string,
  actualValue: ResolvedField['value'],
  condition: FilterCondition,
  now: Date
): FilterTruth {
  const actual = scalarValue(actualValue)
  if (typeof actual !== 'string') return 'unknown'
  const timestamp = Date.parse(actual)
  if (!Number.isFinite(timestamp)) return 'unknown'
  if (operator === 'overdue') return timestamp < now.getTime() ? 'true' : 'false'
  if (condition.value?.kind === 'scalar' && typeof condition.value.value === 'string') {
    const selected = Date.parse(condition.value.value)
    if (!Number.isFinite(selected)) return 'unknown'
    return operator === 'before'
      ? timestamp < selected
        ? 'true'
        : 'false'
      : timestamp > selected
        ? 'true'
        : 'false'
  }
  if (
    (operator === 'within_last' || operator === 'within_next') &&
    condition.value?.kind === 'relative_time'
  ) {
    const range = resolveRelativeTimeRange(condition.value, operator, now)
    return timestamp >= Date.parse(range.gte) && timestamp <= Date.parse(range.lte)
      ? 'true'
      : 'false'
  }
  if (condition.value?.kind === 'range') {
    const lower = condition.value.gte ?? condition.value.gt
    const upper = condition.value.lte ?? condition.value.lt
    if (
      (lower !== undefined && typeof lower !== 'string') ||
      (upper !== undefined && typeof upper !== 'string')
    ) {
      return 'unknown'
    }
    const withinLower =
      lower === undefined ||
      (condition.value.gte !== undefined
        ? timestamp >= Date.parse(lower)
        : timestamp > Date.parse(lower))
    const withinUpper =
      upper === undefined ||
      (condition.value.lte !== undefined
        ? timestamp <= Date.parse(upper)
        : timestamp < Date.parse(upper))
    return withinLower && withinUpper ? 'true' : 'false'
  }
  return 'unknown'
}

export function hierarchyPredicate(
  operator: string,
  actualValue: ResolvedField['value'],
  condition: FilterCondition
): FilterTruth {
  if (
    !isSpecialObject(actualValue) ||
    actualValue.kind !== 'hierarchy' ||
    condition.value?.kind !== 'hierarchy'
  ) {
    return 'unknown'
  }
  const terms = new Set(actualValue.termIds.map(canonicalFilterString))
  const ancestors = new Set(actualValue.ancestorIds.map(canonicalFilterString))
  const selected = condition.value.termIds.map(canonicalFilterString)
  const matches =
    operator === 'is'
      ? selected.length === terms.size && selected.every((term) => terms.has(term))
      : operator === 'is_any'
        ? selected.some((term) => terms.has(term))
        : operator === 'within_subtree'
          ? selected.some((term) => terms.has(term) || ancestors.has(term))
          : selected.some((term) => ancestors.has(term))
  return matches ? 'true' : 'false'
}

export function relationPredicate(
  operator: string,
  actualValue: ResolvedField['value'],
  condition: FilterCondition,
  now: Date
): FilterTruth {
  if (!isSpecialObject(actualValue) || actualValue.kind !== 'relation') {
    return 'unknown'
  }
  const count = actualValue.records.length
  if (operator === 'related_exists') return count > 0 ? 'true' : 'false'
  if (operator === 'related_missing') return count === 0 ? 'true' : 'false'
  if (operator === 'related_count') {
    if (condition.value?.kind === 'scalar' && typeof condition.value.value === 'number') {
      return count === condition.value.value ? 'true' : 'false'
    }
    return compareRangePredicate('between', count, condition)
  }
  if (operator === 'related_matches' && condition.value?.kind === 'relation') {
    const relationValue = condition.value
    const matched = actualValue.records.filter((record) =>
      evaluateReferenceExpression(relationValue.expression, record, now)
    ).length
    const { count: bounds } = relationValue
    const withinBounds =
      bounds === undefined ||
      ((bounds.gte === undefined || matched >= bounds.gte) &&
        (bounds.lte === undefined || matched <= bounds.lte))
    return matched > 0 && withinBounds ? 'true' : 'false'
  }
  return 'unknown'
}

export function matchesText(record: ReferenceFilterRecord, text: string | undefined): boolean {
  if (text === undefined || canonicalFilterString(text).length === 0) return true
  const title = resolveField(record, 'title')
  const actual = scalarValue(title.value)
  return (
    typeof actual === 'string' &&
    canonicalFilterString(actual).includes(canonicalFilterString(text))
  )
}

export function compareField(
  left: ReferenceFilterRecord,
  right: ReferenceFilterRecord,
  field: string
): number {
  const leftValue = scalarValue(resolveField(left, field).value)
  const rightValue = scalarValue(resolveField(right, field).value)
  if (leftValue === undefined && rightValue === undefined) return 0
  if (leftValue === undefined) return 1
  if (rightValue === undefined) return -1
  if (typeof leftValue === 'number' && typeof rightValue === 'number') return leftValue - rightValue
  return String(leftValue).localeCompare(String(rightValue))
}

export function facetValues(record: ReferenceFilterRecord, field: string): string[] {
  const resolved = resolveField(record, field)
  if (resolved.state !== 'known' || resolved.value === undefined) return []
  if (Array.isArray(resolved.value)) {
    return resolved.value.map((value) =>
      typeof value === 'string' ? canonicalFilterString(value) : String(value)
    )
  }
  const scalar = scalarValue(resolved.value)
  if (scalar !== undefined)
    return [typeof scalar === 'string' ? canonicalFilterString(scalar) : String(scalar)]
  if (isSpecialObject(resolved.value) && resolved.value.kind === 'hierarchy') {
    return resolved.value.termIds.map(canonicalFilterString)
  }
  return []
}

export function selectedFacetValues(expression: FilterExpression | undefined, field: string): Set<string> {
  const selected = new Set<string>()
  const visit = (node: FilterExpression): void => {
    if (node.kind === 'group') {
      node.children.forEach(visit)
      return
    }
    if (node.field !== field) return
    if (node.value?.kind === 'scalar') selected.add(String(node.value.value))
    if (node.value?.kind === 'set') {
      node.value.values.forEach((value) =>
        selected.add(typeof value === 'string' ? canonicalFilterString(value) : String(value))
      )
    }
    if (node.value?.kind === 'hierarchy') {
      node.value.termIds.forEach((value) => selected.add(canonicalFilterString(value)))
    }
  }
  if (expression !== undefined) visit(expression)
  return selected
}

export function reduceForSelfExcludingFacet(
  expression: FilterExpression | undefined,
  field: string
): SelfExcludingReduction {
  if (expression === undefined) return { supported: true }
  if (!referencesField(expression, field)) return { supported: true, expression }
  if (expression.kind === 'condition') {
    return expression.field === field ? { supported: true } : { supported: false }
  }
  if (expression.combinator !== 'and' || expression.negated) return { supported: false }
  const remaining: FilterExpression[] = []
  for (const child of expression.children) {
    if (child.kind === 'condition' && child.field === field) continue
    if (referencesField(child, field)) return { supported: false }
    remaining.push(child)
  }
  if (remaining.length === 0) return { supported: true }
  const onlyChild = remaining[0]
  if (remaining.length === 1 && onlyChild !== undefined) {
    return { supported: true, expression: onlyChild }
  }
  return { supported: true, expression: { kind: 'group', combinator: 'and', children: remaining } }
}

export function referencesField(expression: FilterExpression, field: string): boolean {
  if (expression.kind === 'group')
    return expression.children.some((child) => referencesField(child, field))
  return (
    expression.field === field ||
    (expression.value?.kind === 'relation' && referencesField(expression.value.expression, field))
  )
}

export function countConditions(expression: FilterExpression | undefined): number {
  if (expression === undefined) return 0
  if (expression.kind === 'condition') {
    return (
      1 + (expression.value?.kind === 'relation' ? countConditions(expression.value.expression) : 0)
    )
  }
  return expression.children.reduce((total, child) => total + countConditions(child), 0)
}
