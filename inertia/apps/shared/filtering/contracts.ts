export type FilterScalar = string | number | boolean
export type FilterStrictEffect = 'require' | 'exclude'
export type FilterPreferenceEffect = 'prefer' | 'avoid'
export type FilterUnknownPolicy = 'include' | 'exclude'

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
  | {
      kind: 'hierarchy'
      termIds: string[]
      expansion: 'exact' | 'ancestors' | 'descendants'
    }
  | {
      kind: 'relation'
      expression: FilterExpression
      count?: { gte?: number; lte?: number }
    }

export interface FilterCondition {
  kind: 'condition'
  field: string
  operator: string
  effect: FilterStrictEffect
  unknown: FilterUnknownPolicy
  value?: FilterValue
}

export interface FilterGroup {
  kind: 'group'
  combinator: 'and' | 'or'
  negated?: boolean
  children: FilterExpression[]
}

export type FilterExpression = FilterCondition | FilterGroup

export interface FilterPreference {
  effect: FilterPreferenceEffect
  expression: FilterExpression
  weight?: number
}

export interface FilterSort {
  field: string
  direction: 'asc' | 'desc'
}

export interface FilterFacetRequest {
  field: string
  countMode?: 'constrained' | 'self_excluding'
  valueSearch?: string
  cursor?: string
}

export interface FilterCriteria {
  context: string
  schemaVersion: number
  text?: { value: string }
  filter?: FilterExpression
  preferences?: FilterPreference[]
  sort: FilterSort[]
  projection?: string[]
  requestedFacets?: FilterFacetRequest[]
  page: { size: number; cursor?: string; offset?: number }
}

export interface FilterPresentationState {
  view?: string
  density?: string
  expandedFacetKeys?: string[]
  [key: string]: unknown
}

export interface FilterUrlState {
  criteria: FilterCriteria
  presentation: FilterPresentationState
}

export interface FilterUrlExposurePolicy {
  canExposeContext: (context: string) => boolean
  canExposeFieldReference: (field: string, usage: 'sort' | 'projection' | 'facet') => boolean
  canExposeCondition: (condition: FilterCondition) => boolean
  canExposeText: (value: string) => boolean
  canExposeCursor: (cursor: string, usage: 'page') => boolean
  canExposePresentationEntry: (key: string, value: unknown) => boolean
}

export type FilterInteractionPolicy =
  | { kind: 'instant' }
  | { kind: 'debounced'; delayMs: number }
  | { kind: 'staged' }

export interface FilterExecutionContext {
  requestId: string
  signal: AbortSignal
}

export interface FilterExecutionResult<TResponse> {
  requestId: string
  data: TResponse
  canonicalCriteria?: FilterCriteria
}

export type FilterExecute<TResponse> = (
  criteria: FilterCriteria,
  context: FilterExecutionContext
) => Promise<FilterExecutionResult<TResponse>>

export interface FilterNavigationAdapter {
  write(state: FilterUrlState, mode: 'push' | 'replace'): void
}
