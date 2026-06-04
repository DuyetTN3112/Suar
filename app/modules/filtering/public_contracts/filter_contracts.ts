export type FilterPaginationMode = 'cursor' | 'offset' | 'bounded' | 'none'
export type FilterFacetCountMode = 'constrained' | 'self_excluding'
export type FilterDegradationPolicy = 'fail_closed' | 'explicit_partial'

export type FilterStrictEffect = 'require' | 'exclude'
export type FilterPreferenceEffect = 'prefer' | 'avoid'
export type FilterUnknownPolicy = 'include' | 'exclude'

export type FilterFieldType =
  | 'scalar'
  | 'multi_value'
  | 'number'
  | 'date_time'
  | 'text'
  | 'hierarchy'
  | 'relation'
  | 'boolean'

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

export interface FilterContextCapabilities {
  readonly text: boolean
  readonly facets: boolean
  readonly nestedGroups: boolean
  readonly preferences: boolean
  readonly relativeTime: boolean
  readonly savedViews: boolean
  readonly sharedViews: boolean
  readonly alerts: boolean
  readonly emptyRequest: boolean
  readonly pagination: FilterPaginationMode
  readonly maxDepth: number
  readonly maxConditions: number
}

export interface FilterFieldDefinition {
  readonly key: string
  readonly type: FilterFieldType
  readonly operators: readonly string[]
  readonly effects: readonly FilterStrictEffect[]
  readonly defaultUnknown: FilterUnknownPolicy
  readonly facetable: boolean
  readonly sortable: boolean
  readonly projectable: boolean
  readonly preference: boolean
  readonly valueSearch: boolean
  readonly facetCountModes: readonly FilterFacetCountMode[]
  readonly cost: number
  readonly relationFields?: Readonly<Record<string, {
    readonly type: FilterFieldType
    readonly operators: readonly string[]
  }>>
}

export interface FilterSortDefinition {
  readonly field: string
  readonly directions: readonly ('asc' | 'desc')[]
}

export interface FilterContextLimits {
  readonly maxPageSize: number
  readonly maxFacetRequests: number
  readonly maxProjectionFields: number
  readonly maxSorts: number
  readonly maxSetValues: number
  readonly maxTextLength: number
  readonly maxCursorLength?: number
  readonly maxRelationDepth: number
  readonly maxCost: number
}

export interface FilterContextDefinition {
  readonly key: string
  readonly version: number
  readonly resource: string
  readonly ownerModule: string
  readonly capabilities: FilterContextCapabilities
  readonly fields: readonly FilterFieldDefinition[]
  readonly sorts: readonly FilterSortDefinition[]
  readonly defaultFilter?: FilterExpression
  readonly defaultSort: readonly { readonly field: string; readonly direction: 'asc' | 'desc' }[]
  readonly executionProfile: string
  readonly degradationPolicy: FilterDegradationPolicy
  readonly limits: FilterContextLimits
  readonly presentationHints?: Readonly<Record<string, string | number | boolean>>
}
