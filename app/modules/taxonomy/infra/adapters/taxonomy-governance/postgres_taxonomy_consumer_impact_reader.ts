import db from '@adonisjs/lucid/services/db'

import type { TaxonomyConsumerImpactReader } from '#modules/taxonomy/actions/ports/outbound/taxonomy-governance/taxonomy_consumer_impact_reader'
import type { TaxonomyConsumerImpact } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_change_criteria_mapping'

/** Reads only bounded aggregate counts; consumer table semantics stay outside taxonomy. */
export class PostgresTaxonomyConsumerImpactReader implements TaxonomyConsumerImpactReader {
  async estimate(_input: {
    readonly namespace: string
    readonly currentVersion: number
    readonly changes: readonly unknown[]
  }): Promise<TaxonomyConsumerImpact> {
    const count = async (table: string): Promise<number> => {
      try {
        const row = (await db.from(table).count('* as total').first()) as { total?: number | string } | undefined
        return Number(row?.total ?? 0)
      } catch {
        return 0
      }
    }

    const [assignments, savedViews, alerts, projections, indices] = await Promise.all([
      count('task_assignments'),
      count('filter_saved_views'),
      count('filter_alerts'),
      count('search_projection_generations'),
      count('search_projection_generations'),
    ])
    return { assignments, savedViews, alerts, projections, indices }
  }
}

export default PostgresTaxonomyConsumerImpactReader
