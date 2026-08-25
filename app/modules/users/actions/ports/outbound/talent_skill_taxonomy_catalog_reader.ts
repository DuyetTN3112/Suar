import type { TaxonomyProvider } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_provider'

type TalentSkillTaxonomyTerm = Awaited<ReturnType<TaxonomyProvider['resolveTerms']>>[number]

export interface TalentSkillTaxonomyCatalogSnapshot {
  readonly version: number
  readonly organizationVocabulary: 'supported' | 'unsupported'
  readonly terms: readonly {
    readonly term: TalentSkillTaxonomyTerm
    readonly visibility:
      | { readonly kind: 'public' }
      | { readonly kind: 'organization'; readonly organizationId: string }
  }[]
}

/** Consumer-owned taxonomy port for projecting public talent search documents. */
export interface TalentSkillTaxonomyCatalogReader {
  loadSnapshot(): Promise<TalentSkillTaxonomyCatalogSnapshot>
}
