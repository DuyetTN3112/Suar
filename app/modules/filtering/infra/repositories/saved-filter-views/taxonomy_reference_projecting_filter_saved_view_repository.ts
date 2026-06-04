import type {
  FilterSavedViewRecord,
  FilterSavedViewRepository,
} from '#modules/filtering/actions/ports/outbound/filter_saved_view_repository'
import type { FilterTransaction } from '#modules/filtering/actions/ports/outbound/filter_transaction_runner'
import type { FilterSavedViewTaxonomyReferenceRepository } from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_taxonomy_references'
import { extractTaxonomyFilterReferences } from '#modules/filtering/domain/filtering-core/taxonomy_filter_reference_projection'
import type { TaxonomyVersionReader } from '#modules/taxonomy/actions/ports/outbound/taxonomy-governance/taxonomy_version_reader'

export class TaxonomyReferenceProjectingFilterSavedViewRepository
  implements FilterSavedViewRepository {
  constructor(
    private readonly inner: FilterSavedViewRepository,
    private readonly references: FilterSavedViewTaxonomyReferenceRepository,
    private readonly versions: TaxonomyVersionReader
  ) {}

  async create(
    input: Parameters<FilterSavedViewRepository['create']>[0],
    transaction: FilterTransaction
  ): Promise<FilterSavedViewRecord> {
    const record = await this.inner.create(input, transaction)
    await this.project(record, transaction)
    return record
  }

  findById(...args: Parameters<FilterSavedViewRepository['findById']>) {
    return this.inner.findById(...args)
  }

  listByIds(...args: Parameters<FilterSavedViewRepository['listByIds']>) {
    return this.inner.listByIds(...args)
  }

  async update(
    input: Parameters<FilterSavedViewRepository['update']>[0],
    transaction: FilterTransaction
  ): Promise<FilterSavedViewRecord | null> {
    const record = await this.inner.update(input, transaction)
    if (record) await this.project(record, transaction)
    return record
  }

  softDelete(...args: Parameters<FilterSavedViewRepository['softDelete']>) {
    return this.inner.softDelete(...args)
  }

  replaceGrants(...args: Parameters<FilterSavedViewRepository['replaceGrants']>) {
    return this.inner.replaceGrants(...args)
  }

  listGrants(...args: Parameters<FilterSavedViewRepository['listGrants']>) {
    return this.inner.listGrants(...args)
  }

  private async project(record: FilterSavedViewRecord, transaction: FilterTransaction): Promise<void> {
    const view = record.view as unknown as { readonly id: string; readonly semanticState: unknown }
    const projected = extractTaxonomyFilterReferences(view.semanticState)
    const references = await Promise.all(projected.map(async (reference) => ({
      ...reference,
      validatedVersion: await this.readVersion(reference.namespace),
    })))
    await this.references.replaceForSavedView({ savedViewId: view.id, references }, transaction)
  }

  private async readVersion(namespace: string): Promise<number> {
    try {
      return await this.versions.getVersion(namespace)
    } catch {
      return 0
    }
  }
}

export default TaxonomyReferenceProjectingFilterSavedViewRepository
