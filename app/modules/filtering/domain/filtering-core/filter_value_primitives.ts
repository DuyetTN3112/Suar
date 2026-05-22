import type { ValidationState, RuntimeFilterValue } from './filter_validation_types.js'

import type { FilterErrorPathSegment } from '#modules/filtering/domain/filtering-core/filter_error'
import type { FilterCondition, FilterScalar } from '#modules/filtering/domain/filtering-core/filter_expression'
import {
  canonicalizeFilterScalarSet,
  type FilterFieldType,
} from '#modules/filtering/domain/filtering-core/filter_operators'

export function addError(
  state: ValidationState,
  path: readonly FilterErrorPathSegment[],
  code: string,
  repairHint: string
): void {
  state.errors.push({ path: [...path], code, repairHint })
}

export function reportConditionLimit(
  state: ValidationState,
  path: readonly FilterErrorPathSegment[]
): void {
  if (state.conditionLimitReported) return
  state.conditionLimitReported = true
  addError(
    state,
    path,
    'FILTER_CONDITION_LIMIT_EXCEEDED',
    `Reduce the expression to at most ${state.limits.maxConditions} conditions.`
  )
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function isFilterScalar(value: unknown): value is FilterScalar {
  return (
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
}

export function validateScalar(
  value: unknown,
  state: ValidationState,
  path: readonly FilterErrorPathSegment[]
): value is FilterScalar {
  if (!isFilterScalar(value)) {
    addError(
      state,
      path,
      'FILTER_VALUE_INVALID',
      'Use a finite number, string, or Boolean value; use an explicit missing operator for absent data.'
    )
    return false
  }

  if (typeof value === 'string' && value.length > state.limits.maxTextLength) {
    addError(
      state,
      path,
      'FILTER_TEXT_LIMIT_EXCEEDED',
      `Shorten the value to at most ${state.limits.maxTextLength} characters.`
    )
  }
  return true
}

export function comparableValue(
  value: FilterScalar,
  fieldType: FilterFieldType | undefined
): number | string {
  if (fieldType === 'date_time' && typeof value === 'string') {
    return Date.parse(value)
  }
  return value as number | string
}

export function isValidIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/u.exec(
      value
    )
  if (!match || !Number.isFinite(Date.parse(value))) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  const daysInMonth =
    Number.isSafeInteger(year) && Number.isSafeInteger(month) && month >= 1 && month <= 12
      ? new Date(Date.UTC(year, month, 0)).getUTCDate()
      : 0
  return day >= 1 && day <= daysInMonth && hour <= 23 && minute <= 59 && second <= 59
}

export function validateRangeBound(
  value: unknown,
  fieldType: FilterFieldType | undefined,
  state: ValidationState,
  path: readonly FilterErrorPathSegment[]
): value is FilterScalar {
  if (fieldType === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      addError(
        state,
        path,
        'FILTER_VALUE_TYPE_MISMATCH',
        'Use finite numeric range bounds for a numeric field.'
      )
      return false
    }
    return true
  }
  if (fieldType === 'date_time') {
    if (!isValidIsoTimestamp(value)) {
      addError(
        state,
        path,
        'FILTER_VALUE_TYPE_MISMATCH',
        'Use valid ISO date-time bounds with explicit offsets.'
      )
      return false
    }
    if (value.length > state.limits.maxTextLength) {
      addError(
        state,
        path,
        'FILTER_TEXT_LIMIT_EXCEEDED',
        `Shorten the value to at most ${state.limits.maxTextLength} characters.`
      )
      return false
    }
    return true
  }
  return validateScalar(value, state, path)
}

export function validateRange(
  value: RuntimeFilterValue,
  fieldType: FilterFieldType | undefined,
  state: ValidationState,
  path: readonly FilterErrorPathSegment[]
): void {
  const lowerKey = value.gte !== undefined ? 'gte' : value.gt !== undefined ? 'gt' : undefined
  const upperKey = value.lte !== undefined ? 'lte' : value.lt !== undefined ? 'lt' : undefined

  if (lowerKey === undefined && upperKey === undefined) {
    addError(
      state,
      path,
      'FILTER_RANGE_INVALID',
      'Provide at least one finite lower or upper range bound.'
    )
    return
  }

  if (
    (value.gte !== undefined && value.gt !== undefined) ||
    (value.lte !== undefined && value.lt !== undefined)
  ) {
    addError(state, path, 'FILTER_RANGE_INVALID', 'Use only one lower bound and one upper bound.')
    return
  }

  const lower = lowerKey === undefined ? undefined : value[lowerKey]
  const upper = upperKey === undefined ? undefined : value[upperKey]
  const lowerValid =
    lower === undefined ||
    validateRangeBound(lower, fieldType, state, [...path, lowerKey ?? 'lower'])
  const upperValid =
    upper === undefined ||
    validateRangeBound(upper, fieldType, state, [...path, upperKey ?? 'upper'])

  if (!lowerValid || !upperValid) return
  if (lower === undefined || upper === undefined || typeof lower !== typeof upper) return

  const comparedLower = comparableValue(lower, fieldType)
  const comparedUpper = comparableValue(upper, fieldType)
  const inverted = comparedLower > comparedUpper
  const exclusiveEqual = comparedLower === comparedUpper && (lowerKey === 'gt' || upperKey === 'lt')
  if (inverted || exclusiveEqual) {
    addError(
      state,
      path,
      'FILTER_RANGE_INVALID',
      'Put the lower bound before the upper bound and avoid an empty exclusive range.'
    )
  }
}

export function validateSet(
  value: RuntimeFilterValue,
  condition: FilterCondition,
  state: ValidationState,
  path: readonly FilterErrorPathSegment[]
): void {
  if (!Array.isArray(value.values)) {
    addError(
      state,
      [...path, 'values'],
      'FILTER_VALUE_INVALID',
      'Provide a bounded array of values.'
    )
    return
  }

  if (value.values.length > state.limits.maxSetValues) {
    addError(
      state,
      [...path, 'values'],
      'FILTER_SET_LIMIT_EXCEEDED',
      `Reduce the selected set to at most ${state.limits.maxSetValues} values.`
    )
    return
  }
  const validValues = value.values.filter((item, index) =>
    validateScalar(item, state, [...path, 'values', index])
  )

  if (condition.operator === 'contains_at_least') {
    const uniqueCount = canonicalizeFilterScalarSet(validValues).length
    if (
      !Number.isInteger(value.minimumMatch) ||
      typeof value.minimumMatch !== 'number' ||
      value.minimumMatch < 1 ||
      value.minimumMatch > uniqueCount
    ) {
      addError(
        state,
        [...path, 'minimumMatch'],
        'FILTER_MINIMUM_MATCH_INVALID',
        'Use an integer from one through the number of unique selected values.'
      )
    }
  } else if (value.minimumMatch !== undefined) {
    addError(
      state,
      [...path, 'minimumMatch'],
      'FILTER_MINIMUM_MATCH_INVALID',
      'Remove minimumMatch or use the contains_at_least operator.'
    )
  }
}

export function validateRelationCount(
  value: RuntimeFilterValue,
  state: ValidationState,
  path: readonly FilterErrorPathSegment[]
): void {
  if (value.count === undefined) return
  if (!isRecord(value.count)) {
    addError(
      state,
      [...path, 'count'],
      'FILTER_VALUE_INVALID',
      'Use bounded integer relation counts.'
    )
    return
  }
  const runtimeCount = value.count as { gte?: unknown; lte?: unknown }
  const gte = runtimeCount.gte
  const lte = runtimeCount.lte
  if (gte === undefined && lte === undefined) {
    addError(
      state,
      [...path, 'count'],
      'FILTER_RANGE_INVALID',
      'Provide at least one non-negative integer relation-count bound.'
    )
    return
  }
  const validBound = (bound: unknown) =>
    bound === undefined || (typeof bound === 'number' && Number.isInteger(bound) && bound >= 0)
  if (
    !validBound(gte) ||
    !validBound(lte) ||
    (typeof gte === 'number' && typeof lte === 'number' && gte > lte)
  ) {
    addError(
      state,
      [...path, 'count'],
      'FILTER_RANGE_INVALID',
      'Use non-negative integer relation counts with the lower bound first.'
    )
  }
}

export function validateRelatedCountValue(
  value: RuntimeFilterValue,
  state: ValidationState,
  path: readonly FilterErrorPathSegment[]
): void {
  if (value.kind === 'scalar') {
    if (typeof value.value !== 'number' || !Number.isSafeInteger(value.value) || value.value < 0) {
      addError(
        state,
        path,
        'FILTER_VALUE_TYPE_MISMATCH',
        'Use a non-negative integer relation count.'
      )
    }
    return
  }

  if (value.kind !== 'range') {
    addError(
      state,
      path,
      'FILTER_VALUE_TYPE_MISMATCH',
      'Use a non-negative integer relation count or bounded count range.'
    )
    return
  }
  if (value.gt !== undefined || value.lt !== undefined) {
    addError(state, path, 'FILTER_RANGE_INVALID', 'Use inclusive gte/lte relation-count bounds.')
    return
  }
  const countEnvelope: RuntimeFilterValue = { count: { gte: value.gte, lte: value.lte } }
  validateRelationCount(countEnvelope, state, path)
}

export function expectedFilterValueKinds(operator: string): readonly string[] | undefined {
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
  if (['between', 'outside'].includes(operator)) return ['range']
  if (['within_last', 'within_next'].includes(operator)) return ['relative_time']
  if (['is', 'is_any', 'within_subtree', 'has_ancestor'].includes(operator)) return ['hierarchy']
  if (operator === 'related_matches') return ['relation']
  if (operator === 'related_count') return ['scalar', 'range']
  return ['scalar']
}
