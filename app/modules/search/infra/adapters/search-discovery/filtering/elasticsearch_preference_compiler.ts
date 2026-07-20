import type { estypes } from '@elastic/elasticsearch'

import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import {
  compileElasticsearchFilter,
  type ElasticsearchSemanticBindings,
} from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_compiler'

type PreferenceExpression = NonNullable<QueryCriteriaRequest['preferences']>[number]['expression']

const assertPreferenceUnknownPolicy = (expression: PreferenceExpression): void => {
  if (expression.kind === 'condition') {
    if (expression.unknown !== 'exclude') {
      throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
    }
    if (expression.value?.kind === 'relation') {
      assertPreferenceUnknownPolicy(expression.value.expression)
    }
    return
  }

  for (const child of expression.children) {
    assertPreferenceUnknownPolicy(child)
  }
}

export interface CompileElasticsearchPreferencesInput {
  readonly baseQuery: estypes.QueryDslQueryContainer
  readonly preferences: NonNullable<QueryCriteriaRequest['preferences']>
  readonly bindings: ElasticsearchSemanticBindings
  readonly now: Date
  readonly explicitSort: boolean
  readonly minWeight: number
  readonly maxWeight: number
  readonly maxBoost: number
}

export function compileElasticsearchPreferences({
  baseQuery,
  preferences,
  bindings,
  now,
  explicitSort,
  minWeight,
  maxWeight,
  maxBoost,
}: CompileElasticsearchPreferencesInput): estypes.QueryDslQueryContainer {
  if (explicitSort || preferences.length === 0) return baseQuery
  if (
    !Number.isFinite(minWeight) ||
    !Number.isFinite(maxWeight) ||
    !Number.isFinite(maxBoost) ||
    minWeight < 0 ||
    maxWeight < minWeight ||
    maxBoost < 0 ||
    maxBoost < minWeight
  ) {
    throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
  }

  const functions = preferences.map((preference) => {
    assertPreferenceUnknownPolicy(preference.expression)
    const requested = preference.weight ?? 1
    if (!Number.isFinite(requested)) {
      throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
    }
    const weight = Math.min(maxBoost, Math.max(minWeight, Math.min(maxWeight, requested)))
    const filter = compileElasticsearchFilter(preference.expression, bindings, now)
    return {
      filter,
      weight: preference.effect === 'avoid' ? -weight : weight,
    }
  })

  const avoidMagnitude = functions.reduce(
    (total, { weight }) => total + (weight < 0 ? Math.abs(weight) : 0),
    0
  )
  if (avoidMagnitude > maxBoost && avoidMagnitude > 0) {
    const scale = maxBoost / avoidMagnitude
    for (const preference of functions) {
      if (preference.weight < 0) preference.weight *= scale
    }
  }

  return {
    function_score: {
      query: baseQuery,
      functions,
      score_mode: 'sum',
      boost_mode: 'sum',
      max_boost: maxBoost,
    },
  }
}
