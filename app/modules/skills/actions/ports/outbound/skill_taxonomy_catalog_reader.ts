import type { TaxonomyProvider } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_provider'

type SkillTaxonomyTerm = Awaited<ReturnType<TaxonomyProvider['resolveTerms']>>[number]

export type SkillTaxonomyVisibility =
  | { readonly kind: 'public' }
  | { readonly kind: 'organization'; readonly organizationId: string }

export interface SkillTaxonomySourceTerm {
  readonly term: SkillTaxonomyTerm
  readonly visibility: SkillTaxonomyVisibility
}

export interface SkillTaxonomyCatalogSnapshot {
  readonly version: number
  /**
   * `unsupported` means the source can only prove global/public vocabulary.
   * It must never emit organization-visible terms in that mode.
   */
  readonly organizationVocabulary: 'supported' | 'unsupported'
  readonly terms: readonly SkillTaxonomySourceTerm[]
}

/**
 * Skills-owned source of taxonomy truth. Implementations may project the current
 * skills tables or a fake persistence boundary; the taxonomy provider never owns
 * a second taxonomy table.
 */
export interface SkillTaxonomyCatalogReader {
  loadSnapshot(): Promise<SkillTaxonomyCatalogSnapshot>
}
