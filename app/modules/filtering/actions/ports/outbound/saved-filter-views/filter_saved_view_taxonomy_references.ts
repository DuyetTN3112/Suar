import type { FilterTransaction } from '#modules/filtering/actions/ports/outbound/filter_transaction_runner'

export interface FilterSavedViewTaxonomyReference {
  readonly savedViewId: string
  readonly fieldKey: string
  readonly namespace: string
  readonly termId: string
  readonly validatedVersion: number
}

export interface FilterSavedViewTaxonomyReferencePage {
  readonly viewIds: readonly string[]
  readonly nextCursor: string | null
}

export interface FilterSavedViewTaxonomyReferenceRepository {
  replaceForSavedView(input: {
    readonly savedViewId: string
    readonly references: readonly Omit<FilterSavedViewTaxonomyReference, 'savedViewId'>[]
  }, transaction: FilterTransaction): Promise<void>
  listByTaxonomyReferences(input: {
    readonly namespace: string
    readonly termIds: readonly string[]
    readonly afterViewId: string | null
    readonly limit: number
  }, transaction?: FilterTransaction): Promise<FilterSavedViewTaxonomyReferencePage>
}
