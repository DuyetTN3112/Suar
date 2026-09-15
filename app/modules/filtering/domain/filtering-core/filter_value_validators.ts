import type {
  FilterAllowedField,
  RuntimeFilterValue,
  ValidationState,
} from './filter_validation_types.js'
import {
  addError,
  expectedFilterValueKinds,
  isRecord,
  isValidIsoTimestamp,
  validateRange,
  validateRelatedCountValue,
  validateRelationCount,
  validateScalar,
  validateSet,
} from './filter_value_primitives.js'

import type { FilterErrorPathSegment } from '#modules/filtering/domain/filtering-core/filter_error'
import type { FilterCondition } from '#modules/filtering/domain/filtering-core/filter_expression'
import type { FilterFieldType } from '#modules/filtering/domain/filtering-core/filter_operators'

export type ExpressionNodeValidatorFn = (
  expression: unknown,
  state: ValidationState,
  path: readonly FilterErrorPathSegment[],
  depth: number,
  relationDepth: number,
  allowedFields?: Readonly<Record<string, FilterAllowedField>>
) => void

export function validateValue(
  condition: FilterCondition,
  fieldType: FilterFieldType | undefined,
  state: ValidationState,
  path: readonly FilterErrorPathSegment[],
  depth: number,
  relationDepth: number,
  relationFields?: Readonly<Record<string, FilterAllowedField>>,
  validateExpressionNode?: ExpressionNodeValidatorFn
): void {
  const value = condition.value as unknown
  const operatorsWithoutValue = new Set([
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
  if (operatorsWithoutValue.has(condition.operator)) {
    if (value !== undefined) {
      addError(state, path, 'FILTER_VALUE_INVALID', 'Remove the value from this unary operator.')
    }
    return
  }
  if (!isRecord(value)) {
    addError(
      state,
      path,
      'FILTER_VALUE_INVALID',
      'Provide the typed value required by this operator; use an explicit missing operator for null.'
    )
    return
  }
  const runtimeValue = value as RuntimeFilterValue
  if (typeof runtimeValue.kind !== 'string') {
    addError(
      state,
      path,
      'FILTER_VALUE_INVALID',
      'Provide the typed value required by this operator; use an explicit missing operator for null.'
    )
    return
  }
  const expectedKinds = expectedFilterValueKinds(condition.operator)
  if (expectedKinds !== undefined && !expectedKinds.includes(runtimeValue.kind)) {
    addError(
      state,
      path,
      'FILTER_VALUE_TYPE_MISMATCH',
      'Use the typed value shape required by this field and operator.'
    )
    return
  }
  if (condition.operator === 'related_count') {
    validateRelatedCountValue(runtimeValue, state, path)
    return
  }

  switch (runtimeValue.kind) {
    case 'scalar':
      if (validateScalar(runtimeValue.value, state, [...path, 'value'])) {
        if (fieldType === 'number' && typeof runtimeValue.value !== 'number') {
          addError(
            state,
            path,
            'FILTER_VALUE_TYPE_MISMATCH',
            'Use a number value for a numeric field.'
          )
        } else if (fieldType === 'date_time' && !isValidIsoTimestamp(runtimeValue.value)) {
          addError(
            state,
            path,
            'FILTER_VALUE_TYPE_MISMATCH',
            'Use a valid ISO date-time value with an explicit offset.'
          )
        }
      }
      return
    case 'set':
      validateSet(runtimeValue, condition, state, path)
      return
    case 'range':
      validateRange(runtimeValue, fieldType, state, path)
      return
    case 'relative_time':
      if (
        !Number.isInteger(runtimeValue.amount) ||
        typeof runtimeValue.amount !== 'number' ||
        runtimeValue.amount < 1 ||
        !['minute', 'hour', 'day', 'week', 'month'].includes(String(runtimeValue.unit)) ||
        runtimeValue.anchor !== 'now'
      ) {
        addError(
          state,
          path,
          'FILTER_VALUE_INVALID',
          'Use a positive integer relative window with a supported unit anchored at now.'
        )
      }
      return
    case 'hierarchy':
      if (!Array.isArray(runtimeValue.termIds) || runtimeValue.termIds.length === 0) {
        addError(
          state,
          path,
          'FILTER_VALUE_INVALID',
          'Provide bounded canonical term IDs and a supported hierarchy expansion.'
        )
        return
      }
      if (runtimeValue.termIds.length > state.limits.maxSetValues) {
        addError(
          state,
          [...path, 'termIds'],
          'FILTER_SET_LIMIT_EXCEEDED',
          `Reduce hierarchy terms to at most ${state.limits.maxSetValues} values.`
        )
        return
      }
      runtimeValue.termIds.forEach((termId, index) => {
        if (typeof termId !== 'string' || termId.trim().length === 0) {
          addError(
            state,
            [...path, 'termIds', index],
            'FILTER_VALUE_INVALID',
            'Use a non-empty canonical hierarchy term ID.'
          )
        } else if (termId.length > state.limits.maxTextLength) {
          addError(
            state,
            [...path, 'termIds', index],
            'FILTER_TEXT_LIMIT_EXCEEDED',
            `Shorten the term ID to at most ${state.limits.maxTextLength} characters.`
          )
        }
      })
      if (!['exact', 'descendants', 'ancestors'].includes(String(runtimeValue.expansion))) {
        addError(
          state,
          [...path, 'expansion'],
          'FILTER_VALUE_INVALID',
          'Use a supported hierarchy expansion.'
        )
      }
      return
    case 'relation':
      if (relationDepth + 1 > state.limits.maxRelationDepth) {
        addError(
          state,
          path,
          'FILTER_RELATION_DEPTH_EXCEEDED',
          `Reduce nested relations to at most ${state.limits.maxRelationDepth} levels.`
        )
        return
      }
      validateRelationCount(runtimeValue, state, path)
      if (!isRecord(runtimeValue.expression)) {
        addError(
          state,
          [...path, 'expression'],
          'FILTER_VALUE_INVALID',
          'Provide a nested filter expression.'
        )
        return
      }
      if (validateExpressionNode) {
        validateExpressionNode(
          runtimeValue.expression,
          state,
          [...path, 'expression'],
          depth,
          relationDepth + 1,
          relationFields
        )
      }
      return
    default:
      addError(
        state,
        path,
        'FILTER_VALUE_INVALID',
        'Use a supported, explicitly typed filter value.'
      )
  }
}
