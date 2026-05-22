import db from '@adonisjs/lucid/services/db'

import type { FilterTransaction } from '#modules/filtering/actions/ports/outbound/filter_transaction_runner'
import type {
  FilterSavedViewTaxonomyReferencePage,
  FilterSavedViewTaxonomyReferenceRepository,
} from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_taxonomy_references'

type DbClient = typeof db

function clientFor(transaction?: FilterTransaction): DbClient {
  return (transaction ?? db) as DbClient
}

export class PostgresFilterSavedViewTaxonomyReferenceRepository
  implements FilterSavedViewTaxonomyReferenceRepository {
  async replaceForSavedView(
    input: Parameters<FilterSavedViewTaxonomyReferenceRepository['replaceForSavedView']>[0],
    transaction: FilterTransaction
  ): Promise<void> {
    const client = clientFor(transaction)
    await client.from('filter_saved_view_taxonomy_refs').where('saved_view_id', input.savedViewId).delete()
    if (input.references.length === 0) return

    await client.table('filter_saved_view_taxonomy_refs').insert(
      input.references.map((reference) => ({
        saved_view_id: input.savedViewId,
        field_key: reference.fieldKey,
        namespace: reference.namespace,
        term_id: reference.termId,
        validated_version: reference.validatedVersion,
      }))
    )
  }

  async listByTaxonomyReferences(
    input: Parameters<FilterSavedViewTaxonomyReferenceRepository['listByTaxonomyReferences']>[0],
    transaction?: FilterTransaction
  ): Promise<FilterSavedViewTaxonomyReferencePage> {
    if (input.termIds.length === 0 || input.limit < 1) return { viewIds: [], nextCursor: null }

    const baseQuery = clientFor(transaction)
      .from('filter_saved_view_taxonomy_refs as refs')
      .join('filter_saved_views as views', 'views.id', 'refs.saved_view_id')
      .where('refs.namespace', input.namespace)
      .whereIn('refs.term_id', [...input.termIds])
      .whereNull('views.deleted_at')
    const query = input.afterViewId === null
      ? baseQuery
      : baseQuery.where('refs.saved_view_id', '>', input.afterViewId)

    const rows = (await query
      .select('refs.saved_view_id')
      .distinct()
      .orderBy('refs.saved_view_id', 'asc')
      .limit(input.limit + 1)) as Array<{ saved_view_id: string }>

    const hasMore = rows.length > input.limit
    const viewIds = rows.slice(0, input.limit).map((row) => row.saved_view_id)
    return {
      viewIds,
      nextCursor: hasMore ? viewIds.at(-1) ?? null : null,
    }
  }
}

export default PostgresFilterSavedViewTaxonomyReferenceRepository
