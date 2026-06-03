import type {
  FilterExpression,
  FilterStrictEffect,
  FilterUnknownPolicy,
} from '#modules/filtering/domain/filtering-core/filter_expression'
import type { FilterFieldType } from '#modules/filtering/domain/filtering-core/filter_operators'

export type FilterPaginationMode = 'cursor' | 'offset' | 'bounded' | 'none'
export type FilterFacetCountMode = 'constrained' | 'self_excluding'
export type FilterDegradationPolicy = 'fail_closed' | 'explicit_partial'

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
  /** Opaque provider cursors routinely exceed user-authored text limits. */
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
