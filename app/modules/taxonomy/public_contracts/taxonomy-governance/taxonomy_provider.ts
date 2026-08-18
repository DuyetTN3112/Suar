import type { TaxonomyTerm, TaxonomyTermRef } from './taxonomy_term_contracts.js'

export interface TaxonomyAccessContext {
  readonly authorizationToken?: string
  readonly attributes?: Readonly<Record<string, unknown>>
}

export class TaxonomyProviderUnavailableError extends Error {
  readonly code = 'E_TAXONOMY_PROVIDER_UNAVAILABLE'
  readonly retryable = true

  constructor(readonly namespace: string) {
    super('Taxonomy metadata is temporarily unavailable')
    this.name = 'TaxonomyProviderUnavailableError'
  }
}

export type TaxonomyCursorErrorReason = 'invalid' | 'stale'

export class TaxonomyCursorError extends Error {
  readonly code: 'E_TAXONOMY_CURSOR_INVALID' | 'E_TAXONOMY_CURSOR_STALE'
  readonly retryable = false

  constructor(readonly reason: TaxonomyCursorErrorReason) {
    super(reason === 'stale' ? 'Taxonomy cursor is stale' : 'Taxonomy cursor is invalid')
    this.name = 'TaxonomyCursorError'
    this.code = reason === 'stale' ? 'E_TAXONOMY_CURSOR_STALE' : 'E_TAXONOMY_CURSOR_INVALID'
  }
}

export interface TaxonomyTermSearchInput {
  readonly query: string
  readonly locale: string
  readonly limit: number
  readonly cursor?: string
  readonly includeInactive?: boolean
}

export interface TaxonomyTermSearchResult {
  readonly items: readonly TaxonomyTerm[]
  readonly nextCursor: string | null
}

export type TaxonomyAliasResolution =
  | { readonly input: string; readonly status: 'resolved'; readonly term: TaxonomyTermRef }
  | {
      readonly input: string
      readonly status: 'ambiguous'
      readonly candidates: readonly TaxonomyTermRef[]
    }
  | { readonly input: string; readonly status: 'not_found' }

export interface TaxonomyProvider<TAccessContext = TaxonomyAccessContext> {
  readonly namespace: string
  readonly fallbackLocale: string
  getVersion(): Promise<number>
  resolveTerms(
    refs: readonly TaxonomyTermRef[],
    locale: string,
    accessContext?: TAccessContext
  ): Promise<readonly TaxonomyTerm[]>
  searchTerms(
    input: TaxonomyTermSearchInput,
    accessContext?: TAccessContext
  ): Promise<TaxonomyTermSearchResult>
  getAncestorPaths(
    refs: readonly TaxonomyTermRef[],
    accessContext?: TAccessContext
  ): Promise<readonly (readonly TaxonomyTermRef[])[]>
  resolveAliases(
    values: readonly string[],
    locale?: string,
    accessContext?: TAccessContext
  ): Promise<readonly TaxonomyAliasResolution[]>
}
