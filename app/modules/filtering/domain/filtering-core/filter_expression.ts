export type FilterStrictEffect = 'require' | 'exclude'
export type FilterPreferenceEffect = 'prefer' | 'avoid'
export type FilterUnknownPolicy = 'include' | 'exclude'

export type FilterScalar = string | number | boolean

export type FilterValue =
  | { kind: 'scalar'; value: FilterScalar }
  | { kind: 'set'; values: FilterScalar[]; minimumMatch?: number }
  | { kind: 'range'; gte?: FilterScalar; gt?: FilterScalar; lte?: FilterScalar; lt?: FilterScalar }
  | {
      kind: 'relative_time'
      amount: number
      unit: 'minute' | 'hour' | 'day' | 'week' | 'month'
      anchor: 'now'
    }
  | { kind: 'hierarchy'; termIds: string[]; expansion: 'exact' | 'descendants' | 'ancestors' }
  | { kind: 'relation'; expression: FilterExpression; count?: { gte?: number; lte?: number } }

export interface FilterCondition {
  kind: 'condition'
  field: string
  operator: string
  effect: FilterStrictEffect
  value?: FilterValue
  unknown: FilterUnknownPolicy
}

export type FilterExpression =
  | {
      kind: 'group'
      combinator: 'and' | 'or'
      children: FilterExpression[]
      negated?: boolean
    }
  | FilterCondition

export interface FilterPreference {
  effect: FilterPreferenceEffect
  expression: FilterExpression
  weight?: number
}

export interface FilterPreferenceScoreOptions {
  minWeight: number
  maxWeight: number
  maxPreferenceScore: number
  explicitSortDisablesRelevance?: boolean
}

export interface FilterPreferenceContribution {
  index: number
  effect: FilterPreferenceEffect
  normalizedWeight: number
  contribution: number
}

export interface FilterPreferenceScore {
  score: number
  contributions: FilterPreferenceContribution[]
}
