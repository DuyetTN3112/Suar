import type { FilterExpression, FilterPreference } from './filter_contracts.js'

import type { FilterDiagnostic } from '#modules/filtering/public_contracts/filter_diagnostics'
import type {
  FilterFacetGroup,
  FilterFacetRequest,
} from '#modules/filtering/public_contracts/filter_facets'

export interface QueryCriteriaRequest {
  readonly context: string
  readonly schemaVersion: number
  readonly text?: { readonly value: string } | undefined
  readonly filter?: FilterExpression | undefined
  readonly preferences?: readonly FilterPreference[] | undefined
  readonly sort: readonly { readonly field: string; readonly direction: 'asc' | 'desc' }[]
  readonly projection?: readonly string[] | undefined
  readonly requestedFacets?: readonly FilterFacetRequest[] | undefined
  readonly page: {
    readonly size: number
    readonly cursor?: string | undefined
    readonly offset?: number | undefined
  }
}

export interface QueryCriteriaResponse<T> {
  readonly context: string
  readonly schemaVersion: number
  readonly canonicalCriteria: QueryCriteriaRequest
  readonly hits: readonly T[]
  readonly total: { readonly value: number; readonly relation: 'eq' | 'gte' | 'unknown' }
  readonly facets: readonly FilterFacetGroup[]
  readonly suggestions: readonly string[]
  readonly diagnostics: readonly FilterDiagnostic[]
  readonly page: { readonly nextCursor?: string; readonly previousCursor?: string }
  readonly execution: {
    readonly provider: string
    readonly degraded: boolean
    readonly partial: boolean
    readonly requestId: string
  }
}
