import type {
  FilterExpression,
  FilterScalar,
  FilterValue,
} from './contracts'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const allowedKeys = new Set(allowed)
  return Object.keys(value).every((key) => allowedKeys.has(key))
}

export function isScalar(value: unknown): value is FilterScalar {
  return (
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
}

export const filterOperators = new Set([
  'eq',
  'neq',
  'in',
  'not_in',
  'exists',
  'missing',
  'contains_any',
  'contains_all',
  'contains_none',
  'contains_exactly',
  'contains_at_least',
  'is_empty',
  'gt',
  'gte',
  'lt',
  'lte',
  'between',
  'outside',
  'before',
  'after',
  'within_last',
  'within_next',
  'overdue',
  'exact',
  'contains',
  'prefix',
  'is',
  'is_any',
  'within_subtree',
  'has_ancestor',
  'related_exists',
  'related_missing',
  'related_count',
  'related_matches',
  'is_true',
  'is_false',
  'is_unknown',
])

export const CLIENT_MAX_DEPTH = 5
export const CLIENT_MAX_CONDITIONS = 100
export const CLIENT_MAX_SET_VALUES = 100
export const CLIENT_MAX_TEXT_LENGTH = 512
export const CLIENT_MAX_RELATION_DEPTH = 2
export const CLIENT_MAX_PREFERENCES = 20
export const CLIENT_MAX_COLLECTION_ITEMS = 100
export const CLIENT_MAX_CURSOR_LENGTH = 2_048
export const CLIENT_MAX_PRESENTATION_DEPTH = 20
export const CLIENT_MAX_PRESENTATION_NODES = 10_000
export const CLIENT_MAX_PRESENTATION_TEXT_LENGTH = 2_048

export const operatorsWithoutValue = new Set([
  'exists',
  'missing',
  'is_empty',
  'is_true',
  'is_false',
  'is_unknown',
  'related_exists',
  'related_missing',
  'overdue',
])

interface ClientValidationState {
  conditions: number
  seen: WeakSet<object>
}

function canonicalString(value: string): string {
  return value.trim().normalize('NFKC').toLocaleLowerCase('en-US')
}

function scalarIdentity(value: FilterScalar): string {
  return typeof value === 'string'
    ? `string:${canonicalString(value)}`
    : `${typeof value}:${String(value)}`
}

export function canonicalScalarSet(values: readonly FilterScalar[]): FilterScalar[] {
  const unique = new Map<string, FilterScalar>()
  for (const value of values) {
    const canonical = typeof value === 'string' ? canonicalString(value) : value
    unique.set(scalarIdentity(canonical), canonical)
  }
  return [...unique.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([, value]) => value)
}

function expectedValueKinds(operator: string): readonly FilterValue['kind'][] {
  if (
    [
      'in',
      'not_in',
      'contains_any',
      'contains_all',
      'contains_none',
      'contains_exactly',
      'contains_at_least',
    ].includes(operator)
  ) {
    return ['set']
  }
  if (operator === 'between' || operator === 'outside') return ['range']
  if (operator === 'within_last' || operator === 'within_next') return ['relative_time']
  if (['is', 'is_any', 'within_subtree', 'has_ancestor'].includes(operator)) return ['hierarchy']
  if (operator === 'related_matches') return ['relation']
  if (operator === 'related_count') return ['scalar', 'range']
  return ['scalar']
}

function scalarWithinLimits(value: unknown): value is FilterScalar {
  return isScalar(value) && (typeof value !== 'string' || value.length <= CLIENT_MAX_TEXT_LENGTH)
}

function validRelationCount(value: unknown): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, ['gte', 'lte'])) return false
  const { gte, lte } = value
  return (
    (gte !== undefined || lte !== undefined) &&
    (gte === undefined || (Number.isSafeInteger(gte) && Number(gte) >= 0)) &&
    (lte === undefined || (Number.isSafeInteger(lte) && Number(lte) >= 0)) &&
    !(typeof gte === 'number' && typeof lte === 'number' && gte > lte)
  )
}

function validRange(value: Record<string, unknown>, relatedCount: boolean): boolean {
  if (!hasOnlyKeys(value, ['kind', 'gte', 'gt', 'lte', 'lt'])) return false
  if (
    (value['gte'] !== undefined && value['gt'] !== undefined) ||
    (value['lte'] !== undefined && value['lt'] !== undefined)
  ) {
    return false
  }
  const lower = value['gte'] ?? value['gt']
  const upper = value['lte'] ?? value['lt']
  if (lower === undefined && upper === undefined) return false
  if (relatedCount) {
    if (value['gt'] !== undefined || value['lt'] !== undefined) return false
    return validRelationCount({ gte: value['gte'], lte: value['lte'] })
  }
  if (
    (lower !== undefined && !scalarWithinLimits(lower)) ||
    (upper !== undefined && !scalarWithinLimits(upper))
  ) {
    return false
  }
  if (typeof lower === 'number' && typeof upper === 'number') {
    return (
      lower < upper || (lower === upper && value['gte'] !== undefined && value['lte'] !== undefined)
    )
  }
  if (lower === undefined || upper === undefined) return true
  if (typeof lower !== typeof upper) return false
  const inverted =
    typeof lower === 'string' && typeof upper === 'string'
      ? lower > upper
      : typeof lower === 'boolean' && typeof upper === 'boolean'
        ? Number(lower) > Number(upper)
        : false
  const exclusiveEqual = lower === upper && (value['gt'] !== undefined || value['lt'] !== undefined)
  return !inverted && !exclusiveEqual
}

function isFilterValue(
  value: unknown,
  operator: string,
  state: ClientValidationState,
  depth: number,
  relationDepth: number
): value is FilterValue {
  if (!isRecord(value) || typeof value['kind'] !== 'string') return false
  if (!expectedValueKinds(operator).includes(value['kind'] as FilterValue['kind'])) return false
  switch (value['kind']) {
    case 'scalar':
      return (
        hasOnlyKeys(value, ['kind', 'value']) &&
        (operator === 'related_count'
          ? Number.isSafeInteger(value['value']) && Number(value['value']) >= 0
          : scalarWithinLimits(value['value']))
      )
    case 'set': {
      if (
        !hasOnlyKeys(value, ['kind', 'values', 'minimumMatch']) ||
        !Array.isArray(value['values']) ||
        value['values'].length > CLIENT_MAX_SET_VALUES ||
        !value['values'].every(scalarWithinLimits)
      ) {
        return false
      }
      if (operator !== 'contains_at_least') return value['minimumMatch'] === undefined
      const uniqueValues = canonicalScalarSet(value['values']).length
      return (
        Number.isSafeInteger(value['minimumMatch']) &&
        Number(value['minimumMatch']) >= 1 &&
        Number(value['minimumMatch']) <= uniqueValues
      )
    }
    case 'range':
      return validRange(value, operator === 'related_count')
    case 'relative_time':
      return (
        hasOnlyKeys(value, ['kind', 'amount', 'unit', 'anchor']) &&
        Number.isSafeInteger(value['amount']) &&
        Number(value['amount']) >= 1 &&
        ['minute', 'hour', 'day', 'week', 'month'].includes(String(value['unit'])) &&
        value['anchor'] === 'now'
      )
    case 'hierarchy':
      return (
        hasOnlyKeys(value, ['kind', 'termIds', 'expansion']) &&
        Array.isArray(value['termIds']) &&
        value['termIds'].length > 0 &&
        value['termIds'].length <= CLIENT_MAX_SET_VALUES &&
        value['termIds'].every(
          (termId) =>
            typeof termId === 'string' &&
            termId.trim().length > 0 &&
            termId.length <= CLIENT_MAX_TEXT_LENGTH
        ) &&
        ['exact', 'ancestors', 'descendants'].includes(String(value['expansion']))
      )
    case 'relation':
      return (
        relationDepth < CLIENT_MAX_RELATION_DEPTH &&
        hasOnlyKeys(value, ['kind', 'expression', 'count']) &&
        (value['count'] === undefined || validRelationCount(value['count'])) &&
        validateExpression(value['expression'], state, depth, relationDepth + 1)
      )
    default:
      return false
  }
}

function validateExpression(
  value: unknown,
  state: ClientValidationState,
  depth: number,
  relationDepth: number
): value is FilterExpression {
  if (!isRecord(value) || state.seen.has(value)) return false
  state.seen.add(value)
  try {
    if (value['kind'] === 'condition') {
      state.conditions += 1
      if (state.conditions > CLIENT_MAX_CONDITIONS) return false
      const operator = value['operator']
      if (
        !hasOnlyKeys(value, ['kind', 'field', 'operator', 'effect', 'unknown', 'value']) ||
        typeof value['field'] !== 'string' ||
        value['field'].trim().length === 0 ||
        value['field'].length > CLIENT_MAX_TEXT_LENGTH ||
        typeof operator !== 'string' ||
        !filterOperators.has(operator) ||
        (value['effect'] !== 'require' && value['effect'] !== 'exclude') ||
        (value['unknown'] !== 'include' && value['unknown'] !== 'exclude')
      ) {
        return false
      }
      return operatorsWithoutValue.has(operator)
        ? value['value'] === undefined
        : isFilterValue(value['value'], operator, state, depth, relationDepth)
    }
    if (
      value['kind'] !== 'group' ||
      !hasOnlyKeys(value, ['kind', 'combinator', 'negated', 'children']) ||
      (value['combinator'] !== 'and' && value['combinator'] !== 'or') ||
      (value['negated'] !== undefined && typeof value['negated'] !== 'boolean') ||
      !Array.isArray(value['children']) ||
      value['children'].length < 2 ||
      value['children'].length > CLIENT_MAX_CONDITIONS ||
      depth + 1 > CLIENT_MAX_DEPTH
    ) {
      return false
    }
    return value['children'].every((child) =>
      validateExpression(child, state, depth + 1, relationDepth)
    )
  } finally {
    state.seen.delete(value)
  }
}

export function isCriteriaFilterExpression(value: unknown): value is FilterExpression {
  return validateExpression(value, { conditions: 0, seen: new WeakSet() }, 0, 0)
}

export * from './criteria_state_validator.js'

