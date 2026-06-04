import type { FilterFacetCountMode } from './filter_contracts.js'

export interface FilterFacetRequest {
  readonly field: string
  readonly countMode?: FilterFacetCountMode
  readonly valueSearch?: string
  readonly cursor?: string
}

export interface FilterFacetValue {
  readonly value: string
  readonly count: number
  readonly countRelation: 'exact' | 'bounded' | 'approximate'
  readonly selected: boolean
}

export interface FilterFacetTruth {
  readonly missing?: {
    readonly value: number
    readonly countRelation: 'exact' | 'bounded' | 'approximate'
  }
  readonly coverage?: {
    readonly known: number
    readonly total: number
    readonly ratio: number
    readonly countRelation: 'exact' | 'bounded' | 'approximate'
  }
}

export interface FilterFacetGroup {
  readonly field: string
  readonly countMode: FilterFacetCountMode
  readonly values: readonly FilterFacetValue[]
  readonly nextCursor?: string
  readonly truth?: FilterFacetTruth
}
