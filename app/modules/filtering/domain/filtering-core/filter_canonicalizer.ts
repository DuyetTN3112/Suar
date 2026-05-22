import type {
  FilterCondition,
  FilterExpression,
  FilterValue,
} from '#modules/filtering/domain/filtering-core/filter_expression'
import {
  canonicalizeFilterScalar,
  canonicalizeFilterScalarSet,
} from '#modules/filtering/domain/filtering-core/filter_operators'

function canonicalizeFilterValue(value: FilterValue): FilterValue {
  switch (value.kind) {
    case 'scalar':
      return { kind: 'scalar', value: canonicalizeFilterScalar(value.value) }
    case 'set': {
      const result: Extract<FilterValue, { kind: 'set' }> = {
        kind: 'set',
        values: canonicalizeFilterScalarSet(value.values),
      }
      if (value.minimumMatch !== undefined) {
        result.minimumMatch = value.minimumMatch
      }
      return result
    }
    case 'range': {
      const result: Extract<FilterValue, { kind: 'range' }> = { kind: 'range' }
      for (const key of ['gte', 'gt', 'lte', 'lt'] as const) {
        const bound = value[key]
        if (bound !== undefined) {
          result[key] = canonicalizeFilterScalar(bound)
        }
      }
      return result
    }
    case 'relative_time':
      return { ...value }
    case 'hierarchy':
      return {
        kind: 'hierarchy',
        termIds: canonicalizeFilterScalarSet(value.termIds).map(String),
        expansion: value.expansion,
      }
    case 'relation': {
      const result: Extract<FilterValue, { kind: 'relation' }> = {
        kind: 'relation',
        expression: canonicalizeFilterExpression(value.expression),
      }
      if (value.count !== undefined) {
        const count: { gte?: number; lte?: number } = {}
        if (value.count.gte !== undefined) count.gte = value.count.gte
        if (value.count.lte !== undefined) count.lte = value.count.lte
        result.count = count
      }
      return result
    }
  }
}

function canonicalizeCondition(condition: FilterCondition): FilterCondition {
  let operator = condition.operator
  let effect = condition.effect

  if (operator === 'not_in') {
    operator = 'in'
    effect = effect === 'require' ? 'exclude' : 'require'
  } else if (effect === 'exclude' && operator === 'contains_any') {
    operator = 'contains_none'
    effect = 'require'
  } else if (effect === 'exclude' && operator === 'contains_none') {
    operator = 'contains_any'
    effect = 'require'
  }

  const result: FilterCondition = {
    kind: 'condition',
    field: condition.field.trim(),
    operator,
    effect,
    unknown: condition.unknown,
  }
  if (condition.value !== undefined) {
    result.value = canonicalizeFilterValue(condition.value)
  }
  return result
}

const TOTAL_PREDICATE_COMPLEMENTS: Readonly<Record<string, string>> = {
  exists: 'missing',
  missing: 'exists',
}

function stableValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableValue).join(',')}]`
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableValue(record[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export function canonicalizeFilterExpression(expression: FilterExpression): FilterExpression {
  if (expression.kind === 'condition') {
    return canonicalizeCondition(expression)
  }

  const unique = new Map<string, FilterExpression>()
  for (const child of expression.children.map(canonicalizeFilterExpression)) {
    unique.set(stableValue(child), child)
  }
  const children = [...unique.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([, child]) => child)

  if (expression.negated && children.length === 1) {
    const child = children[0]
    if (child?.kind === 'condition') {
      const complement = TOTAL_PREDICATE_COMPLEMENTS[child.operator]
      if (complement !== undefined) {
        return { ...child, operator: complement }
      }
    }
    if (child?.kind === 'group' && child.negated) {
      const { negated: _negated, ...withoutNegation } = child
      return withoutNegation
    }
  }

  const result: FilterExpression = {
    kind: 'group',
    combinator: expression.combinator,
    children,
  }
  if (expression.negated) {
    result.negated = true
  }
  return result
}

export function serializeCanonicalFilterExpression(expression: FilterExpression): string {
  return stableValue(canonicalizeFilterExpression(expression))
}
