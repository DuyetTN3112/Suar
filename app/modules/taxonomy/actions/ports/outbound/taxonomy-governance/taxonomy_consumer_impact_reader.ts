import type { TaxonomyChange, TaxonomyConsumerImpact } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_change_criteria_mapping'

/**
 * The taxonomy module may ask consumers for bounded aggregate impact, but must
 * not know their tables, queries, or private records.
 */
export interface TaxonomyConsumerImpactReader {
  estimate(input: {
    readonly namespace: string
    readonly currentVersion: number
    readonly changes: readonly TaxonomyChange[]
  }): Promise<TaxonomyConsumerImpact>
}
