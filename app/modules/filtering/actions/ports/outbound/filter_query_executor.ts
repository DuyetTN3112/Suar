import type {
  FilterContextDefinition,
  FilterFacetCountMode,
  FilterPaginationMode,
} from '#modules/filtering/domain/filtering-core/filter_context_definition'
import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'
import type { FilterDiagnostic } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { FilterFacetGroup } from '#modules/filtering/public_contracts/filter_facets'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'

declare const filterAuthorizationBindingBrand: unique symbol

/**
 * Opaque, request-scoped proof minted by the orchestration layer. Executors must
 * return the exact object reference for every data-bearing result section.
 */
export interface FilterAuthorizationBinding {
  readonly [filterAuthorizationBindingBrand]: true
  readonly context: string
  readonly schemaVersion: number
  readonly authorizationVersion: string
  readonly mandatoryFingerprint: string
  readonly eligibilityFingerprint: string
  readonly effectiveContextFingerprint: string
}

export interface FilterAuthorizationEvidence {
  readonly hits: FilterAuthorizationBinding
  readonly total: FilterAuthorizationBinding
  readonly facets: FilterAuthorizationBinding
  readonly suggestions: FilterAuthorizationBinding
  readonly page: FilterAuthorizationBinding
}

export interface FilterExecutorCapabilities {
  readonly text: boolean
  readonly facets: boolean
  readonly nestedGroups: boolean
  readonly preferences: boolean
  readonly relativeTime: boolean
  readonly relations: boolean
  readonly pagination: readonly FilterPaginationMode[]
  readonly facetCountModes: readonly FilterFacetCountMode[]
  readonly totalRelations: readonly ('eq' | 'gte' | 'unknown')[]
  readonly maxDepth: number
  readonly maxConditions: number
  readonly maxPageSize: number
  readonly maxFacetRequests: number
  readonly maxProjectionFields: number
  readonly maxSorts: number
  readonly maxCost: number
  readonly fieldOperators: Readonly<Record<string, readonly string[]>>
}

export interface FilterExecutorInput {
  readonly definition: FilterContextDefinition
  readonly criteria: QueryCriteriaRequest
  readonly mandatoryFilter?: FilterExpression
  readonly eligibilityFilter?: FilterExpression
  readonly authorizationBinding: FilterAuthorizationBinding
  readonly requestId: string
  readonly signal?: AbortSignal
}

export interface FilterExecutorResult<T = unknown> {
  readonly hits: readonly T[]
  readonly total: { readonly value: number; readonly relation: 'eq' | 'gte' | 'unknown' }
  readonly facets: readonly FilterFacetGroup[]
  readonly suggestions: readonly string[]
  readonly diagnostics: readonly FilterDiagnostic[]
  readonly page: { readonly nextCursor?: string; readonly previousCursor?: string }
  readonly provider: string
  readonly degraded: boolean
  readonly partial: boolean
  readonly authorizationEvidence: FilterAuthorizationEvidence
}

export interface FilterQueryExecutor<T = unknown> {
  readonly profile: string
  describeCapabilities(): FilterExecutorCapabilities
  estimateCost(input: FilterExecutorInput): Promise<number>
  execute(input: FilterExecutorInput): Promise<FilterExecutorResult<T>>
}

export interface FilterQueryExecutorResolver {
  getExecutor(profile: string): FilterQueryExecutor | undefined
}
