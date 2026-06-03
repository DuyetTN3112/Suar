import {
  type FilterAllowedField,
  type FilterValidationOptions,
  type RuntimeFilterExpression,
  type RuntimeFilterValue,
  type ValidationState,
  DEFAULT_FILTER_VALIDATION_LIMITS,
  SAFE_UNSUPPORTED_REPAIR_HINT,
} from './filter_validation_types.js'
import {
  addError,
  expectedFilterValueKinds,
  isRecord,
  isValidIsoTimestamp,
  reportConditionLimit,
  validateRange,
  validateRelatedCountValue,
  validateRelationCount,
  validateScalar,
  validateSet,
} from './filter_value_primitives.js'

import type {
  FilterErrorPathSegment,
  FilterValidationResult,
} from '#modules/filtering/domain/filtering-core/filter_error'
import type { FilterCondition } from '#modules/filtering/domain/filtering-core/filter_expression'
import {
  FILTER_OPERATORS,
  type FilterFieldType,
} from '#modules/filtering/domain/filtering-core/filter_operators'

export function validateValue(
  condition: FilterCondition,
  fieldType: FilterFieldType | undefined,
  state: ValidationState,
  path: readonly FilterErrorPathSegment[],
  depth: number,
  relationDepth: number,
  relationFields?: Readonly<Record<string, FilterAllowedField>>
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
      validateExpressionNode(
        runtimeValue.expression,
        state,
        [...path, 'expression'],
        depth,
        relationDepth + 1,
        relationFields
      )
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

export function validateCondition(
  condition: RuntimeFilterExpression,
  state: ValidationState,
  path: readonly FilterErrorPathSegment[],
  depth: number,
  relationDepth: number,
  allowedFields: Readonly<Record<string, FilterAllowedField>> | undefined = state.allowedFields
): void {
  state.conditions += 1
  if (state.conditions > state.limits.maxConditions) {
    reportConditionLimit(state, path)
    return
  }
  if (typeof condition.field !== 'string' || condition.field.trim().length === 0) {
    addError(
      state,
      [...path, 'field'],
      'FILTER_CONDITION_INVALID',
      'Use a non-empty string field identifier.'
    )
    return
  }
  if (condition.field.length > state.limits.maxTextLength) {
    addError(
      state,
      [...path, 'field'],
      'FILTER_TEXT_LIMIT_EXCEEDED',
      `Shorten the field identifier to at most ${state.limits.maxTextLength} characters.`
    )
    return
  }
  if (typeof condition.operator !== 'string' || condition.operator.trim().length === 0) {
    addError(
      state,
      [...path, 'operator'],
      'FILTER_CONDITION_INVALID',
      'Use a non-empty string operator identifier.'
    )
    return
  }
  if (condition.operator.length > state.limits.maxTextLength) {
    addError(
      state,
      [...path, 'operator'],
      'FILTER_TEXT_LIMIT_EXCEEDED',
      `Shorten the operator identifier to at most ${state.limits.maxTextLength} characters.`
    )
    return
  }
  if (condition.effect !== 'require' && condition.effect !== 'exclude') {
    addError(
      state,
      [...path, 'effect'],
      'FILTER_CONDITION_INVALID',
      'Use require or exclude as the strict condition effect.'
    )
  }
  if (condition.unknown !== 'include' && condition.unknown !== 'exclude') {
    addError(
      state,
      [...path, 'unknown'],
      'FILTER_CONDITION_INVALID',
      'Use include or exclude as the explicit unknown policy.'
    )
  }

  const fieldDefinition =
    allowedFields !== undefined && Object.hasOwn(allowedFields, condition.field)
      ? allowedFields[condition.field]
      : undefined
  if (
    allowedFields !== undefined &&
    (fieldDefinition === undefined || !fieldDefinition.operators.includes(condition.operator))
  ) {
    addError(state, path, 'FILTER_FIELD_OR_OPERATOR_NOT_ALLOWED', SAFE_UNSUPPORTED_REPAIR_HINT)
    return
  }
  if (state.allowedFields === undefined && !FILTER_OPERATORS.has(condition.operator)) {
    addError(state, path, 'FILTER_FIELD_OR_OPERATOR_NOT_ALLOWED', SAFE_UNSUPPORTED_REPAIR_HINT)
    return
  }

  if (
    (condition.effect !== 'require' && condition.effect !== 'exclude') ||
    (condition.unknown !== 'include' && condition.unknown !== 'exclude')
  ) {
    return
  }

  validateValue(
    condition as unknown as FilterCondition,
    fieldDefinition?.type,
    state,
    [...path, 'value'],
    depth,
    relationDepth,
    fieldDefinition?.relationFields
  )
}

export function validateExpressionNode(
  expression: unknown,
  state: ValidationState,
  path: readonly FilterErrorPathSegment[],
  depth: number,
  relationDepth: number,
  allowedFields: Readonly<Record<string, FilterAllowedField>> | undefined = state.allowedFields
): void {
  if (!isRecord(expression)) {
    addError(
      state,
      path,
      'FILTER_EXPRESSION_INVALID',
      'Use a condition or Boolean group expression.'
    )
    return
  }
  const runtimeExpression = expression as RuntimeFilterExpression
  if (runtimeExpression.kind !== 'condition' && runtimeExpression.kind !== 'group') {
    addError(
      state,
      path,
      'FILTER_EXPRESSION_INVALID',
      'Use a condition or Boolean group expression.'
    )
    return
  }
  if (runtimeExpression.kind === 'condition') {
    validateCondition(runtimeExpression, state, path, depth, relationDepth, allowedFields)
    return
  }

  const groupDepth = depth + 1
  if (groupDepth > state.limits.maxDepth) {
    addError(
      state,
      path,
      'FILTER_DEPTH_LIMIT_EXCEEDED',
      `Flatten the expression to at most ${state.limits.maxDepth} group levels.`
    )
    return
  }
  if (runtimeExpression.combinator !== 'and' && runtimeExpression.combinator !== 'or') {
    addError(
      state,
      [...path, 'combinator'],
      'FILTER_GROUP_INVALID',
      'Use and or or as the Boolean group combinator.'
    )
  }
  if (runtimeExpression.negated !== undefined && typeof runtimeExpression.negated !== 'boolean') {
    addError(
      state,
      [...path, 'negated'],
      'FILTER_GROUP_INVALID',
      'Use a Boolean negated flag or omit it.'
    )
  }
  if (!Array.isArray(runtimeExpression.children) || runtimeExpression.children.length < 2) {
    addError(
      state,
      [...path, 'children'],
      'FILTER_GROUP_TOO_FEW_CHILDREN',
      'Add at least two conditions or remove the group.'
    )
  }
  if (!Array.isArray(runtimeExpression.children)) return
  if (runtimeExpression.children.length > state.limits.maxConditions) {
    reportConditionLimit(state, [...path, 'children'])
    return
  }
  for (const [index, child] of runtimeExpression.children.entries()) {
    if (state.conditionLimitReported) break
    validateExpressionNode(
      child,
      state,
      [...path, 'children', index],
      groupDepth,
      relationDepth,
      allowedFields
    )
  }
}

export function createState(options: FilterValidationOptions): ValidationState {
  return {
    errors: [],
    limits: { ...DEFAULT_FILTER_VALIDATION_LIMITS, ...options.limits },
    ...(options.allowedFields === undefined ? {} : { allowedFields: options.allowedFields }),
    conditions: 0,
    conditionLimitReported: false,
  }
}

export function finishValidation(state: ValidationState): FilterValidationResult {
  return { valid: state.errors.length === 0, errors: state.errors }
}

export function validateFilterExpression(
  expression: unknown,
  options: FilterValidationOptions = {}
): FilterValidationResult {
  const state = createState(options)
  validateExpressionNode(expression, state, [], 0, 0)
  return finishValidation(state)
}
