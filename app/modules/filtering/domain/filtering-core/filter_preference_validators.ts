import { validateFilterExpression } from './filter_expression_validators.js'
import {
  DEFAULT_FILTER_VALIDATION_LIMITS,
  type FilterPreferenceValidationOptions,
  type FilterValidationLimits,
  type RuntimeFilterExpression,
  type RuntimeFilterPreference,
  type RuntimeFilterValue,
} from './filter_validation_types.js'
import { isRecord } from './filter_value_primitives.js'

import type {
  FilterErrorPathSegment,
  FilterValidationError,
  FilterValidationResult,
} from '#modules/filtering/domain/filtering-core/filter_error'

export function validatePreferenceUnknownPolicy(
  expression: unknown,
  errors: FilterValidationError[],
  path: readonly FilterErrorPathSegment[],
  limits: FilterValidationLimits,
  depth = 0
): void {
  if (!isRecord(expression) || depth > limits.maxDepth) return
  const runtimeExpression = expression as RuntimeFilterExpression
  if (runtimeExpression.kind === 'condition') {
    if (runtimeExpression.unknown !== 'exclude') {
      errors.push({
        path: [...path, 'unknown'],
        code: 'FILTER_PREFERENCE_UNKNOWN_MUST_EXCLUDE',
        repairHint: 'Use unknown exclude, or use an explicit missing/is_unknown operator.',
      })
    }
    if (isRecord(runtimeExpression.value)) {
      const runtimeValue = runtimeExpression.value as RuntimeFilterValue
      if (runtimeValue.kind === 'relation') {
        validatePreferenceUnknownPolicy(
          runtimeValue.expression,
          errors,
          [...path, 'value', 'expression'],
          limits,
          depth + 1
        )
      }
    }
    return
  }
  if (
    runtimeExpression.kind !== 'group' ||
    !Array.isArray(runtimeExpression.children) ||
    runtimeExpression.children.length > limits.maxConditions
  ) {
    return
  }
  runtimeExpression.children.forEach((child, index) =>
    validatePreferenceUnknownPolicy(child, errors, [...path, 'children', index], limits, depth + 1)
  )
}

export function validateFilterPreferences(
  preferences: unknown,
  options: FilterPreferenceValidationOptions
): FilterValidationResult {
  const errors: FilterValidationError[] = []
  if (!Array.isArray(preferences)) {
    return {
      valid: false,
      errors: [
        {
          path: [],
          code: 'FILTER_PREFERENCE_INVALID',
          repairHint: 'Provide an array of preference clauses.',
        },
      ],
    }
  }
  const maxPreferences = options.maxPreferences ?? 20
  if (preferences.length > maxPreferences) {
    errors.push({
      path: [],
      code: 'FILTER_PREFERENCE_LIMIT_EXCEEDED',
      repairHint: `Reduce preferences to at most ${maxPreferences} clauses.`,
    })
    return { valid: false, errors }
  }
  const limits = { ...DEFAULT_FILTER_VALIDATION_LIMITS, ...options.limits }

  preferences.forEach((preference, index) => {
    if (!isRecord(preference)) {
      errors.push({
        path: [index],
        code: 'FILTER_PREFERENCE_INVALID',
        repairHint: 'Provide a preference object with an effect and filter expression.',
      })
      return
    }
    const runtimePreference = preference as RuntimeFilterPreference
    if (runtimePreference.effect !== 'prefer' && runtimePreference.effect !== 'avoid') {
      errors.push({
        path: [index, 'effect'],
        code: 'FILTER_PREFERENCE_INVALID',
        repairHint: 'Use prefer or avoid as the preference effect.',
      })
    }
    const expressionResult = validateFilterExpression(runtimePreference.expression, options)
    errors.push(
      ...expressionResult.errors.map((error) => ({
        ...error,
        path: [index, 'expression', ...error.path],
      }))
    )
    validatePreferenceUnknownPolicy(
      runtimePreference.expression,
      errors,
      [index, 'expression'],
      limits
    )
    if (runtimePreference.weight !== undefined && !Number.isFinite(runtimePreference.weight)) {
      errors.push({
        path: [index, 'weight'],
        code: 'FILTER_PREFERENCE_WEIGHT_INVALID',
        repairHint: `Use a finite weight; values are clamped between ${options.minWeight} and ${options.maxWeight}.`,
      })
    }
  })

  return { valid: errors.length === 0, errors }
}
