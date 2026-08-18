import type { TaxonomyTermRef } from './taxonomy_term_contracts.js'

export type TaxonomyChangeKind = 'rename' | 'alias_add' | 'alias_remove' | 'merge' | 'retire' | 'reparent' | 'split'

export type TaxonomyChange =
  | { readonly kind: 'rename'; readonly from: TaxonomyTermRef; readonly to: TaxonomyTermRef }
  | { readonly kind: 'alias_add' | 'alias_remove'; readonly from: TaxonomyTermRef; readonly value: string }
  | { readonly kind: 'merge'; readonly from: TaxonomyTermRef; readonly to: TaxonomyTermRef }
  | { readonly kind: 'retire'; readonly from: TaxonomyTermRef }
  | { readonly kind: 'reparent'; readonly from: TaxonomyTermRef; readonly parents: readonly TaxonomyTermRef[] }
  | { readonly kind: 'split'; readonly from: TaxonomyTermRef; readonly replacements: readonly TaxonomyTermRef[] }

export type TaxonomyCriteriaDisposition = 'compatible' | 'migrated' | 'deterministic' | 'requires_repair' | 'blocked'

export interface TaxonomyCriteriaMapping {
  readonly from: TaxonomyTermRef
  readonly to?: TaxonomyTermRef
  readonly replacements?: readonly TaxonomyTermRef[]
  readonly disposition: TaxonomyCriteriaDisposition
  readonly reason: string
}

export interface TaxonomyConsumerImpact {
  readonly assignments: number
  readonly savedViews: number
  readonly alerts: number
  readonly projections: number
  readonly indices: number
}
