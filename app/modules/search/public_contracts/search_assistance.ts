export type SearchFilterScalar = string | number | boolean

export type SearchFilterValue =
  | { readonly kind: 'scalar'; readonly value: SearchFilterScalar }
  | { readonly kind: 'set'; readonly values: readonly SearchFilterScalar[]; readonly minimumMatch?: number }
  | { readonly kind: 'range'; readonly gte?: SearchFilterScalar; readonly gt?: SearchFilterScalar; readonly lte?: SearchFilterScalar; readonly lt?: SearchFilterScalar }
  | { readonly kind: 'relative_time'; readonly amount: number; readonly unit: 'minute' | 'hour' | 'day' | 'week' | 'month'; readonly anchor: 'now' }
  | { readonly kind: 'hierarchy'; readonly termIds: readonly string[]; readonly expansion: 'exact' | 'descendants' | 'ancestors' }
  | { readonly kind: 'relation'; readonly expression: SearchFilterExpression; readonly count?: { readonly gte?: number; readonly lte?: number } }

export interface SearchFilterCondition {
  readonly kind: 'condition'
  readonly field: string
  readonly operator: string
  readonly effect: 'require' | 'exclude'
  readonly value?: SearchFilterValue
  readonly unknown: 'include' | 'exclude'
}

export type SearchFilterExpression =
  | { readonly kind: 'group'; readonly combinator: 'and' | 'or'; readonly children: readonly SearchFilterExpression[]; readonly negated?: boolean }
  | SearchFilterCondition

export type SearchSuggestionKind = 'recent' | 'saved' | 'entity' | 'facet' | 'qualifier'

export interface SearchSuggestionCandidate {
  readonly id: string
  readonly label: string
  readonly kind: SearchSuggestionKind
  readonly score: number
  readonly authorized: boolean
  readonly sensitive?: boolean
  readonly visibleCount?: number
}

export interface SearchSuggestion {
  readonly id: string
  readonly label: string
  readonly kind: SearchSuggestionKind
}

export interface SearchSuggestionGroup {
  readonly kind: SearchSuggestionKind
  readonly suggestions: readonly SearchSuggestion[]
}

export type SearchRelaxationPatch =
  | { readonly kind: 'remove_condition'; readonly path: readonly number[]; readonly reason: string }
  | { readonly kind: 'broaden_hierarchy'; readonly path: readonly number[]; readonly from: string; readonly to: string; readonly reason: string }
  | { readonly kind: 'all_to_any'; readonly path: readonly number[]; readonly reason: string }
  | { readonly kind: 'lower_minimum_match'; readonly path: readonly number[]; readonly from: number; readonly to: number; readonly reason: string }

export interface SearchRelaxationProposal {
  readonly patch: SearchRelaxationPatch
  readonly beforeCount: number | null
  readonly estimatedCount: number | null
}

export interface SearchExplanation {
  readonly strictMatches: readonly string[]
  readonly boundedPreferences: readonly string[]
  readonly unknownFields: readonly string[]
  readonly taxonomyExpansions: readonly string[]
  readonly rankingVersion: string
  readonly partialSources: readonly string[]
}

export interface SearchAssistanceInput {
  readonly expression: SearchFilterExpression
  readonly beforeCount: number | null
}
