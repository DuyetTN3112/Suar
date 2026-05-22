import type {
  FilterCondition,
  FilterExpression,
  FilterPreference,
  FilterPreferenceScore,
  FilterPreferenceScoreOptions,
  FilterStrictEffect,
  FilterUnknownPolicy,
} from '#modules/filtering/domain/filtering-core/filter_expression'

export type FilterTruth = 'true' | 'false' | 'unknown'
export type FilterPredicateResolver = (condition: FilterCondition) => FilterTruth

export function resolveFilterTruth(
  predicate: FilterTruth,
  effect: FilterStrictEffect,
  unknown: FilterUnknownPolicy
): boolean {
  if (predicate === 'unknown') {
    return unknown === 'include'
  }

  const matched = predicate === 'true'
  return effect === 'require' ? matched : !matched
}

export function evaluateFilterExpression(
  expression: FilterExpression,
  resolvePredicate: FilterPredicateResolver
): boolean {
  if (expression.kind === 'condition') {
    return resolveFilterTruth(resolvePredicate(expression), expression.effect, expression.unknown)
  }

  const childResults = expression.children.map((child) =>
    evaluateFilterExpression(child, resolvePredicate)
  )
  const combined =
    expression.combinator === 'and' ? childResults.every(Boolean) : childResults.some(Boolean)

  return expression.negated ? !combined : combined
}

interface FilterPreferenceExpressionResult {
  matched: boolean
  encounteredUnknown: boolean
}

function evaluateFilterPreferenceExpression(
  expression: FilterExpression,
  resolvePredicate: FilterPredicateResolver
): FilterPreferenceExpressionResult {
  if (expression.kind === 'condition') {
    const predicate = resolvePredicate(expression)
    return {
      matched: resolveFilterTruth(predicate, expression.effect, 'exclude'),
      encounteredUnknown: predicate === 'unknown',
    }
  }

  const childResults = expression.children.map((child) =>
    evaluateFilterPreferenceExpression(child, resolvePredicate)
  )
  const combined =
    expression.combinator === 'and'
      ? childResults.every(({ matched }) => matched)
      : childResults.some(({ matched }) => matched)

  return {
    matched: expression.negated ? !combined : combined,
    encounteredUnknown: childResults.some(({ encounteredUnknown }) => encounteredUnknown),
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

export function scoreFilterPreferences(
  preferences: readonly FilterPreference[],
  resolvePredicate: FilterPredicateResolver,
  options: FilterPreferenceScoreOptions
): FilterPreferenceScore {
  if (options.explicitSortDisablesRelevance) {
    return { score: 0, contributions: [] }
  }

  const contributions: FilterPreferenceScore['contributions'] = []

  preferences.forEach((preference, index) => {
    const result = evaluateFilterPreferenceExpression(preference.expression, resolvePredicate)
    if (!result.matched || result.encounteredUnknown) {
      return
    }

    const requestedWeight = Number.isFinite(preference.weight) ? (preference.weight ?? 1) : 1
    const normalizedWeight = clamp(requestedWeight, options.minWeight, options.maxWeight)
    const contribution = preference.effect === 'prefer' ? normalizedWeight : -normalizedWeight
    contributions.push({ index, effect: preference.effect, normalizedWeight, contribution })
  })

  const total = contributions.reduce((sum, item) => sum + item.contribution, 0)
  return {
    score: clamp(total, -options.maxPreferenceScore, options.maxPreferenceScore),
    contributions,
  }
}
