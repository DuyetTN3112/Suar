import type { FilterFacetGroup } from '#modules/filtering/public_contracts/filter_facets'
import type {
  QueryCriteriaRequest,
  QueryCriteriaResponse,
} from '#modules/filtering/public_contracts/filter_query'
import type {
  GlobalSearchEntityType,
  GlobalSearchResult,
  GlobalSearchSourceName,
} from '#modules/search/public_contracts/global_search_contract'

export const SEARCH_BLENDED_CONTEXT = 'search.blended.global' as const

export interface SearchBlendedSourceCapability {
  readonly source: GlobalSearchSourceName
  readonly structuredFields: readonly string[]
  readonly authoritativeTotal: boolean
  readonly authoritativeFacetFields: readonly string[]
}

/**
 * Phase-A truth table for the staged blended path. No normalized structured field is advertised
 * until every included source can enforce it over its complete permission-visible population.
 */
export const SEARCH_BLENDED_SOURCE_CAPABILITIES: readonly SearchBlendedSourceCapability[] = [
  'talents',
  'tasks',
  'projects',
  'skills',
  'organizations',
  'comments',
].map((source) => ({
  source: source as GlobalSearchSourceName,
  structuredFields: [],
  authoritativeTotal: false,
  authoritativeFacetFields: [],
}))

export type SearchDiscoveryScope = 'all' | GlobalSearchEntityType
export type SearchRetrievalMode = 'auto' | 'exact' | 'lexical' | 'semantic' | 'hybrid'
export type SearchDiscoveryInputMode = 'query' | 'filter' | 'combined' | 'browse'
export type SearchAuthorityState = 'authoritative' | 'partial' | 'unsupported' | 'unavailable'
export type SearchDiscoverySourceState =
  | 'ok'
  | 'partial'
  | 'failed'
  | 'timed_out'
  | 'disabled'
  | 'stale'
  | 'skipped'

export interface SearchDiscoveryRequest {
  readonly criteria: QueryCriteriaRequest
  readonly search: {
    readonly scope: SearchDiscoveryScope
    readonly retrievalMode?: SearchRetrievalMode
  }
}

export type SearchDiscoverySignalEvidence = 'provider'

export type SearchDiscoveryContributingSignal =
  | {
      readonly kind: 'text_match'
      readonly field: string
      readonly match: 'exact' | 'phrase' | 'term' | 'prefix'
      readonly evidence: SearchDiscoverySignalEvidence
    }
  | {
      readonly kind: 'strict_filter'
      readonly field: string
      readonly operator: string
      readonly evidence: SearchDiscoverySignalEvidence
    }
  | {
      readonly kind: 'preference'
      readonly field: string
      readonly effect: 'boost' | 'penalty'
      readonly weight: number
      readonly scoreContribution: number
      readonly evidence: SearchDiscoverySignalEvidence
    }
  | {
      readonly kind: 'taxonomy_expansion'
      readonly field: string
      readonly termId: string
      readonly expansion: 'exact' | 'descendants' | 'ancestors' | 'alias'
      readonly evidence: SearchDiscoverySignalEvidence
    }

export interface SearchDiscoveryHitExplanation {
  /** The provider-owned ranking/eligibility version that produced these signals. */
  readonly rankingVersion: string
  /** Only signals explicitly observed by the provider may be returned here. */
  readonly contributingSignals: readonly SearchDiscoveryContributingSignal[]
  readonly partialSources?: readonly GlobalSearchSourceName[]
}

export interface SearchDiscoveryHit<TDocument = Readonly<Record<string, unknown>>> {
  readonly id: string
  readonly entityType: GlobalSearchEntityType
  readonly entityId: string
  readonly source: GlobalSearchSourceName
  readonly rank: number
  readonly score?: number | null
  readonly document: TDocument
  /** Optional provider evidence. Search must not infer this from score or document fields. */
  readonly explanation?: SearchDiscoveryHitExplanation
  /** Server-owned display data. Clients must not derive navigation or labels from provider documents. */
  readonly presentation?: {
    readonly title: string
    readonly url: string
    readonly sourceLabel: string
    readonly snippets: readonly string[]
    readonly breadcrumbs: readonly string[]
    readonly primaryActionLabel: string
  }
}

export type SearchDiscoveryDiagnosticCode =
  | 'SEARCH_SCOPE_CONTEXT_MISMATCH'
  | 'SEARCH_SCOPE_UNSUPPORTED'
  | 'SEARCH_RETRIEVAL_UNSUPPORTED'
  | 'SEARCH_BLENDED_CAPABILITY_UNSUPPORTED'
  | 'SEARCH_SOURCE_UNAVAILABLE'
  | 'SEARCH_SOURCE_TIMED_OUT'
  | 'SEARCH_INDEX_DISABLED'
  | 'SEARCH_INDEX_STALE'
  | 'SEARCH_CURSOR_INVALID'
  | 'SEARCH_CURSOR_EXPIRED'
  | 'SEARCH_CURSOR_STALE'
  | 'SEARCH_FALLBACK_UNSAFE'
  | 'SEARCH_PARTIAL_RESULTS'
  | 'SEARCH_REQUEST_ABORTED'

export interface SearchDiscoveryDiagnostic {
  readonly code: SearchDiscoveryDiagnosticCode
  readonly severity: 'info' | 'warning' | 'error'
  readonly source?: GlobalSearchSourceName
  readonly field?: string
}

export interface SearchMetricAuthority {
  readonly state: SearchAuthorityState
  readonly sources: readonly GlobalSearchSourceName[]
  readonly unsupportedSources?: readonly GlobalSearchSourceName[]
}

export interface SearchDiscoverySourceContribution {
  readonly source: GlobalSearchSourceName
  readonly state: SearchDiscoverySourceState
  readonly authority: SearchAuthorityState
  readonly resultCount: number
  readonly total?: QueryCriteriaResponse<unknown>['total']
  readonly facets?: readonly FilterFacetGroup[]
  readonly diagnosticCodes: readonly SearchDiscoveryDiagnosticCode[]
}

export interface SearchDiscoveryResponse<
  TDocument = Readonly<Record<string, unknown>>,
> extends QueryCriteriaResponse<SearchDiscoveryHit<TDocument>> {
  readonly search: {
    readonly scope: SearchDiscoveryScope
    readonly inputMode: SearchDiscoveryInputMode
    readonly submittedQuery: string
    readonly normalizedQuery: string
    readonly correctedQuery?: string
    readonly retrievalMode: SearchRetrievalMode
    readonly rankingVersion: string
    readonly searchSessionId: string
    readonly requestId: string
    readonly diagnostics: readonly SearchDiscoveryDiagnostic[]
    readonly sources: readonly SearchDiscoverySourceContribution[]
  }
  readonly authority: {
    readonly hits: SearchMetricAuthority
    readonly total: SearchMetricAuthority
    readonly facets: readonly ({ readonly field: string } & SearchMetricAuthority)[]
  }
  readonly compatibility?: {
    readonly globalSearch: GlobalSearchResult
  }
}

export class SearchDiscoveryError extends Error {
  override readonly name = 'SearchDiscoveryError'

  constructor(readonly code: SearchDiscoveryDiagnosticCode) {
    super(code)
  }
}
